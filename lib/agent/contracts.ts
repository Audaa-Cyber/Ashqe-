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

export const AgentTaskSchema = z.object({
  id: z.string().uuid(),
  parentTaskId: z.string().uuid().nullable(),
  userId: z.string().min(1),
  issuer: z.enum(AGENT_IDS),
  target: z.enum(AGENT_IDS),
  goal: z.string().trim().min(1).max(4000),
  input: z.record(z.string(), z.unknown()).default({}),
  allowedTools: z.array(z.string()).max(50).default([]),
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

export function validateTaskBoundary(task: AgentTask, definition: AgentDefinition, now = Date.now()) {
  if (isExpired(task, now)) return { allowed: false, reason: "task_expired" as const }
  if (task.depth > definition.maxTaskDepth) return { allowed: false, reason: "task_depth_exceeded" as const }
  if (!definition.allowedDelegates.includes(task.target)) {
    return { allowed: false, reason: "delegate_not_allowed" as const }
  }
  if (task.allowedTools.some((tool) => !definition.allowedTools.includes(tool))) {
    return { allowed: false, reason: "tool_outside_agent_scope" as const }
  }
  return { allowed: true as const }
}
