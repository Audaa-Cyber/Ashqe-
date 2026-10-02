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
}

export function createAgentTask(params: TaskFactoryInput): AgentTask {
  const now = params.now ?? Date.now()
  const issuer = getAgentDefinition(params.issuer)

  if (!issuer.allowedDelegates.includes(params.target)) {
    throw new Error("agent_delegate_not_allowed")
  }

  const task = AgentTaskSchema.parse({
    id: randomUUID(),
    parentTaskId: params.parentTaskId ?? null,
    userId: params.userId,
    issuer: params.issuer,
    target: params.target,
    goal: params.goal,
    input: params.input ?? {},
    allowedTools: params.allowedTools ?? [],
    risk: params.risk,
    expiresAt: now + MAX_TASK_TTL_MS,
    nonce: randomUUID() + randomUUID(),
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
