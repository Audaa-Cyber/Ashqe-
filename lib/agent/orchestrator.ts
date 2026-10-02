import { createHmac, randomUUID, timingSafeEqual } from "crypto"
import { AgentTaskSchema, type AgentId, type AgentResult, type AgentTask, validateTaskBoundary } from "./contracts"
import { getAgentDefinition } from "./registry"

const MAX_TASK_TTL_MS = 5 * 60 * 1000
const SIGNING_SECRET_ENV = "ASHQE_AGENT_TASK_SIGNING_SECRET"

function getSigningSecret() {
  const secret = process.env[SIGNING_SECRET_ENV]
  if (!secret || secret.length < 32) throw new Error("agent_task_signing_secret_missing")
  return secret
}

function signingPayload(task: Omit<AgentTask, "signature">) {
  return JSON.stringify([
    task.id, task.parentTaskId, task.userId, task.issuer, task.target, task.goal,
    task.input, task.allowedTools, task.risk, task.expiresAt, task.nonce, task.depth,
  ])
}

function signTask(task: Omit<AgentTask, "signature">) {
  return createHmac("sha256", getSigningSecret()).update(signingPayload(task)).digest("hex")
}

function verifyTaskSignature(task: AgentTask) {
  try {
    const expected = signTask(task)
    const actual = Buffer.from(task.signature, "hex")
    const expectedBuffer = Buffer.from(expected, "hex")
    return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer)
  } catch {
    return false
  }
}

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

  if (!issuer.allowedDelegates.includes(params.target)) throw new Error("agent_delegate_not_allowed")

  if (params.parentTask) {
    if (params.parentTaskId !== params.parentTask.id) throw new Error("parent_task_id_mismatch")
    if (params.parentTask.userId !== params.userId) throw new Error("cross_user_delegation")
    if (params.parentTask.target !== params.issuer) throw new Error("parent_issuer_mismatch")
    if (params.parentTask.expiresAt <= now) throw new Error("parent_task_expired")
    if (!verifyTaskSignature(params.parentTask)) throw new Error("parent_task_signature_invalid")
  }

  const requestedTools = params.allowedTools ?? []
  if (params.parentTask && requestedTools.some((tool) => !params.parentTask!.allowedTools.includes(tool))) {
    throw new Error("child_tool_scope_escalation")
  }

  const depth = (params.parentTask?.depth ?? -1) + 1
  if (depth > issuer.maxTaskDepth) throw new Error("agent_task_depth_exceeded")

  const riskRank = { low: 0, medium: 1, high: 2, critical: 3 } as const
  if (params.parentTask && riskRank[params.risk] > riskRank[params.parentTask.risk]) throw new Error("child_risk_escalation")

  const unsigned = {
    id: randomUUID(),
    parentTaskId: params.parentTaskId ?? null,
    userId: params.userId,
    issuer: params.issuer,
    target: params.target,
    goal: params.goal,
    input: params.input ?? {},
    allowedTools: requestedTools,
    resource: params.resource,
    risk: params.risk,
    expiresAt: params.parentTask ? Math.min(now + MAX_TASK_TTL_MS, params.parentTask.expiresAt) : now + MAX_TASK_TTL_MS,
    nonce: randomUUID() + randomUUID(),
    depth,
  }
  const task = AgentTaskSchema.parse({ ...unsigned, signature: signTask(unsigned) })
  const boundary = validateTaskBoundary(task, issuer, now)
  if (!boundary.allowed) throw new Error(boundary.reason)
  return task
}

export function authorizeAgentTask(task: AgentTask, now = Date.now()) {
  const parsed = AgentTaskSchema.safeParse(task)
  if (!parsed.success) return { allowed: false as const, reason: "invalid_task_contract" }
  if (!verifyTaskSignature(parsed.data)) return { allowed: false as const, reason: "invalid_task_signature" }
  const issuer = getAgentDefinition(parsed.data.issuer)
  return validateTaskBoundary(parsed.data, issuer, now)
}

export function blockedResult(taskId: string, agent: AgentId, risk: AgentTask["risk"], reason: string): AgentResult {
  return { taskId, agent, status: "blocked", reason, risk, createdAt: Date.now() }
}
