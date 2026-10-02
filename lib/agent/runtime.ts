import type { SupabaseClient } from "@supabase/supabase-js"
import { authorizeAutonomousAction } from "../execution-policy"
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint"
import type { AgentResult, AgentTask } from "./contracts"
import { authorizeAgentTask, blockedResult, createAgentTask } from "./orchestrator"
import { buildAgentWorkflow, type AgentHandlerMap } from "./graph/workflow"
import { claimAgentTask } from "./idempotency"

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
  supabase?: SupabaseClient
  checkpointer?: BaseCheckpointSaver
  approve?: (task: AgentTask) => Promise<{ approved: boolean; reason?: string }> | { approved: boolean; reason?: string }
}

export class AgentRuntime {
  private readonly graph
  private readonly emit
  private readonly maxSteps
  private readonly timeoutMs
  private readonly supabase
  private readonly checkpointer
  private readonly approve

  constructor(options: AgentRuntimeOptions) {
    this.emit = options.emit ?? (() => undefined)
    this.maxSteps = Math.max(1, Math.min(options.maxSteps ?? 12, 50))
    this.timeoutMs = Math.max(1000, Math.min(options.timeoutMs ?? 60_000, 300_000))
    this.supabase = options.supabase
    this.checkpointer = options.checkpointer
    this.approve = options.approve ?? (this.supabase ? createExecutionPolicyApprovalGate(this.supabase) : undefined)
    this.graph = buildAgentWorkflow(options.handlers, this.checkpointer)
  }

  private async persist(event: AgentRuntimeEvent, task: AgentTask, result?: AgentResult) {
    if (!this.supabase) return
    const { recordAgentEvent, startAgentRun, updateAgentRun } = await import("./persistence")
    await recordAgentEvent(this.supabase, task, event)
    if (event.type === "task.started") await startAgentRun(this.supabase, task)
    if (result) await updateAgentRun(this.supabase, task, result)
  }

  private async publish(event: AgentRuntimeEvent, task: AgentTask, result?: AgentResult) {
    await this.emit(event)
    await this.persist(event, task, result)
  }

  async dispatch(task: AgentTask): Promise<AgentResult> {
    const authorization = authorizeAgentTask(task)
    if (!authorization.allowed) {
      const result = blockedResult(task.id, task.target, task.risk, authorization.reason)
      await this.emit({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: authorization.reason })
      return result
    }

    if (task.risk !== "low") {
      if (!this.approve) {
        const reason = "approval_required"
        await this.emit({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason })
        return blockedResult(task.id, task.target, task.risk, reason)
      }
      const approval = await this.approve(task)
      if (!approval.approved) {
        const reason = approval.reason ?? "approval_denied"
        await this.emit({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason })
        return blockedResult(task.id, task.target, task.risk, reason)
      }
    }

    if (this.supabase) {
      const claim = await claimAgentTask(this.supabase, task)
      if (!claim.claimed) {
        const result = blockedResult(task.id, task.target, task.risk, claim.reason)
        await this.emit({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: claim.reason })
        return result
      }
    }

    await this.publish({ type: "task.authorized", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() }, task)
    await this.publish({ type: "task.started", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() }, task)

    try {
      const result = await Promise.race([
        this.graph.invoke({ task, status: "running" }, { recursionLimit: this.maxSteps, configurable: { thread_id: task.id, checkpoint_ns: task.target } }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("agent_runtime_timeout")), this.timeoutMs)),
      ])

      if (result.status === "blocked") {
        const finalResult = blockedResult(task.id, task.target, task.risk, result.blockedReason ?? "agent_blocked")
        await this.publish({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: finalResult.reason }, task, finalResult)
        return finalResult
      }
      if (result.status === "failed") {
        const finalResult: AgentResult = { taskId: task.id, agent: task.target, status: "failed", reason: result.blockedReason ?? "agent_failed", risk: task.risk, createdAt: Date.now() }
        await this.publish({ type: "task.failed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: finalResult.reason }, task, finalResult)
        return finalResult
      }

      const finalResult: AgentResult = { taskId: task.id, agent: task.target, status: "completed", output: result.outputs[task.target], risk: task.risk, createdAt: Date.now() }
      await this.publish({ type: "task.completed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() }, task, finalResult)
      return finalResult
    } catch (error) {
      const reason = error instanceof Error ? error.message : "agent_runtime_error"
      const finalResult: AgentResult = { taskId: task.id, agent: task.target, status: "failed", reason, risk: task.risk, createdAt: Date.now() }
      await this.publish({ type: "task.failed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason }, task, finalResult)
      return finalResult
    }
  }

  createTask = createAgentTask
}

export function createExecutionPolicyApprovalGate(supabase: SupabaseClient) {
  return async (task: AgentTask) => {
    if (task.target !== "operator") return { approved: true }
    const actionType = task.input.actionType
    if (actionType !== "post" && actionType !== "reply") {
      return { approved: false, reason: "operator_action_type_required" }
    }

    const result = await authorizeAutonomousAction(supabase, task.userId, actionType, {
      targetId: typeof task.input.targetId === "string" ? task.input.targetId : undefined,
      recipientOptedIn: task.input.recipientOptedIn === true,
      aiReplyApproved: task.input.aiReplyApproved === true,
      timezone: typeof task.input.timezone === "string" ? task.input.timezone : undefined,
    })

    return { approved: result.allowed, reason: result.reason }
  }
}
