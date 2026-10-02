import { z } from "zod"

export const AGENT_IDS = [
  "orchestrator",
  "research",
  "conversation",
  "voice",
  "content",
  "critic",
  "opportunity",
  "trend",
  "relationship",
  "analytics",
  "operator",
  "memory",
] as const

export type AgentId = (typeof AGENT_IDS)[number]

export const TRUST_LEVELS = ["untrusted", "internal", "privileged", "system"] as const
export type TrustLevel = (typeof TRUST_LEVELS)[number]

export const RISK_LEVELS = ["low", "medium", "high", "critical"] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export const CAPABILITIES = [
  "research.read",
  "memory.read",
  "memory.write",
  "x.read.profile",
  "x.read.timeline",
  "x.read.post",
  "x.write.post",
  "x.write.reply",
  "web.read",
  "style.read",
  "content.generate",
  "content.inspect",
  "analytics.read",
] as const
export type Capability = (typeof CAPABILITIES)[number]

export const AgentResourceScopeSchema = z.object({
  ownerUserId: z.string().min(1),
  targetId: z.string().min(1).max(512).optional(),
}).strict()
export type AgentResourceScope = z.infer<typeof AgentResourceScopeSchema>

export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable(),
  userId: z.string().min(1),
  issuer: z.enum(AGENT_IDS),
  target: z.enum(AGENT_IDS),
  goal: z.string().trim().min(1).max(4000),
  input: z.record(z.string(), z.unknown()).default({}),
  allowedTools: z.array(z.enum(CAPABILITIES)).max(50).default([]),
  resource: AgentResourceScopeSchema.optional(),
  risk: z.enum(RISK_LEVELS),
  expiresAt: z.number().int().positive(),
  nonce: z.string().min(16).max(128),
  signature: z.string().regex(/^[a-f0-9]{64}$/),
  depth: z.number().int().nonnegative().max(32).default(0),
})

export type AgentTask = z.infer<typeof AgentTaskSchema>

export type AgentResult = {
  taskId: string
  agent: AgentId
  status: "completed" | "blocked" | "failed"
  output?: unknown
  reason?: string
  risk: RiskLevel
  createdAt: number
}

export type AgentDefinition = {
  id: AgentId
  trust: TrustLevel
  allowedTools: readonly string[]
  allowedDelegates: readonly AgentId[]
  maxTaskDepth: number
}

export function isExpired(task: AgentTask, now = Date.now()) {
  return task.expiresAt <= now
}

export function isResourceOwnedByTask(task: AgentTask) {
  return !task.resource || task.resource.ownerUserId === task.userId
}

export function isOperatorAction(task: AgentTask) {
  return task.target === "operator"
}

export function requiredOperatorCapability(actionType: unknown): Capability | null {
  if (actionType === "post") return "x.write.post"
  if (actionType === "reply") return "x.write.reply"
  return null
}

export function validateTaskBoundary(task: AgentTask, definition: AgentDefinition, now = Date.now()) {
  if (task.resource && task.resource.ownerUserId !== task.userId) {
    return { allowed: false, reason: "resource_owner_mismatch" as const }
  }
  if (isExpired(task, now)) return { allowed: false, reason: "task_expired" as const }
  if (task.depth > definition.maxTaskDepth) return { allowed: false, reason: "task_depth_exceeded" as const }
  if (!definition.allowedDelegates.includes(task.target)) {
    return { allowed: false, reason: "delegate_not_allowed" as const }
  }
  if (task.allowedTools.some((tool) => !definition.allowedTools.includes(tool))) {
    return { allowed: false, reason: "tool_outside_agent_scope" as const }
  }
  if (task.target === "operator") {
    if (task.risk === "low") {
      return { allowed: false, reason: "operator_write_requires_elevated_risk" as const }
    }
    if (!task.resource || task.resource.ownerUserId !== task.userId) {
      return { allowed: false, reason: "operator_resource_owner_mismatch" as const }
    }
    const writes = task.allowedTools.filter((tool) => tool === "x.write.post" || tool === "x.write.reply")
    if (writes.length !== task.allowedTools.length) {
      return { allowed: false, reason: "operator_capability_scope_invalid" as const }
    }
    if (writes.includes("x.write.reply") && !task.resource.targetId) {
      return { allowed: false, reason: "operator_reply_target_required" as const }
    }
  }
  return { allowed: true as const }
}
