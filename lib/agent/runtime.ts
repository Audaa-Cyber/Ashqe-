import type { AgentResult, AgentTask } from "./contracts"
import { authorizeAgentTask, blockedResult, createAgentTask } from "./orchestrator"
import { buildAgentWorkflow, type AgentHandlerMap } from "./graph/workflow"

export type AgentRuntimeEvent = {
  type: "task.authorized" | "task.blocked" | "task.started" | "task.completed" | "task.failed"
  taskId: string
  userId: string
  agent: AgentTask["target"]
  at: number
  reason?: string
}

export type AgentRuntimeOptions = {
  handlers: AgentHandlerMap
  emit?: (event: AgentRuntimeEvent) => void | Promise<void>
  maxSteps?: number
  timeoutMs?: number
}

export class AgentRuntime {
  private readonly graph
  private readonly emit
  private readonly maxSteps
  private readonly timeoutMs

  constructor(options: AgentRuntimeOptions) {
    this.graph = buildAgentWorkflow(options.handlers)
    this.emit = options.emit ?? (() => undefined)
    this.maxSteps = Math.max(1, Math.min(options.maxSteps ?? 12, 50))
    this.timeoutMs = Math.max(1000, Math.min(options.timeoutMs ?? 60_000, 300_000))
  }

  async dispatch(task: AgentTask): Promise<AgentResult> {
    const authorization = authorizeAgentTask(task)
    if (!authorization.allowed) {
      await this.emit({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: authorization.reason })
      return blockedResult(task.id, task.target, task.risk, authorization.reason)
    }

    await this.emit({ type: "task.authorized", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() })
    await this.emit({ type: "task.started", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() })

    try {
      const result = await Promise.race([
        this.graph.invoke({ task, status: "running" }, { recursionLimit: this.maxSteps }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("agent_runtime_timeout")), this.timeoutMs)),
      ])

      if (result.status === "blocked") {
        await this.emit({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: result.blockedReason ?? "agent_blocked" })
        return blockedResult(task.id, task.target, task.risk, result.blockedReason ?? "agent_blocked")
      }
      if (result.status === "failed") {
        await this.emit({ type: "task.failed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: result.blockedReason ?? "agent_failed" })
        return { taskId: task.id, agent: task.target, status: "failed", reason: result.blockedReason ?? "agent_failed", risk: task.risk, createdAt: Date.now() }
      }

      await this.emit({ type: "task.completed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() })
      return { taskId: task.id, agent: task.target, status: "completed", output: result.outputs[task.target], risk: task.risk, createdAt: Date.now() }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "agent_runtime_error"
      await this.emit({ type: "task.failed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason })
      return { taskId: task.id, agent: task.target, status: "failed", reason, risk: task.risk, createdAt: Date.now() }
    }
  }

  createTask = createAgentTask
}
