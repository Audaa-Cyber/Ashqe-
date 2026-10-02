import { randomUUID } from "crypto"
import { AgentTaskSchema, type AgentId, type AgentResult, type AgentTask, validateTaskBoundary } from "./contracts"
import { getAgentDefinition } from "./registry"

const MAX_TASK_TTL_MS = 5 * 60 * 1000

export type TaskFactoryInput = {
  userId: string
  issuer: AgentId
  target: AgentId
  goal: string
  input?: Record<string, unknown>
  allowedTools?: string[]
  risk: AgentTask["risk"]
  parentTaskId?: string | null
  now?: number
  parentTask?: AgentTask
}

export function createAgentTask(params: TaskFactoryInput): AgentTask {
  const now = params.now ?? Date.now()
  const issuer = getAgentDefinition(params.issuer)

  if (!issuer.allowedDelegates.includes(params.target)) {
    throw new Error("agent_delegate_not_allowed")
  }

  if (params.parentTask) {
    if (params.parentTaskId !== params.parentTask.id) throw new Error("parent_task_id_mismatch")
    if (params.parentTask.userId !== params.userId) throw new Error("cross_user_delegation")
    if (params.parentTask.target !== params.issuer) throw new Error("parent_issuer_mismatch")
    if (params.parentTask.expiresAt <= now) throw new Error("parent_task_expired")
  }

  const requestedTools = params.allowedTools ?? []
  if (params.parentTask && requestedTools.some((tool) => !params.parentTask!.allowedTools.includes(tool))) {
    throw new Error("child_tool_scope_escalation")
  }

  const depth = (params.parentTask?.depth ?? -1) + 1
  if (depth > issuer.maxTaskDepth) throw new Error("agent_task_depth_exceeded")

  const riskRank = { low: 0, medium: 1, high: 2, critical: 3 } as const
  if (params.parentTask && riskRank[params.risk] > riskRank[params.parentTask.risk]) {
    throw new Error("child_risk_escalation")
  }

  const task = AgentTaskSchema.parse({
    id: randomUUID(),
    parentTaskId: params.parentTaskId ?? null,
    userId: params.userId,
    issuer: params.issuer,
    target: params.target,
    goal: params.goal,
    input: params.input ?? {},
    allowedTools: requestedTools,
    risk: params.risk,
    expiresAt: params.parentTask ? Math.min(now + MAX_TASK_TTL_MS, params.parentTask.expiresAt) : now + MAX_TASK_TTL_MS,
    nonce: randomUUID() + randomUUID(),
    depth,
  })

  const boundary = validateTaskBoundary(task, issuer, now)
  if (!boundary.allowed) throw new Error(boundary.reason)
  return task
}

export function authorizeAgentTask(task: AgentTask, now = Date.now()) {
  const parsed = AgentTaskSchema.safeParse(task)
  if (!parsed.success) return { allowed: false as const, reason: "invalid_task_contract" }
  const issuer = getAgentDefinition(parsed.data.issuer)
  return validateTaskBoundary(parsed.data, issuer, now)
}

export function blockedResult(taskId: string, agent: AgentId, risk: AgentTask["risk"], reason: string): AgentResult {
  return { taskId, agent, status: "blocked", reason, risk, createdAt: Date.now() }
}
