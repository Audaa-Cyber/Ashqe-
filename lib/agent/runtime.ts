import type { SupabaseClient } from "@supabase/supabase-js"
import { authorizeAutonomousAction } from "../execution-policy"
import type { BaseCheckpointSaver } from "@langchain/langgraph-checkpoint"
import { isOperatorAction, validateOperatorAction, type AgentResult, type AgentTask } from "./contracts"
import { authorizeAgentTask, blockedResult, createAgentTask } from "./orchestrator"
import { buildAgentWorkflow, type AgentHandlerMap } from "./graph/workflow"
import { claimAgentTask } from "./idempotency"
import { assertAgentActionReservation } from "./persistence"

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
  private readonly policyApprove

  constructor(options: AgentRuntimeOptions) {
    this.emit = options.emit ?? (() => undefined)
    this.maxSteps = Math.max(1, Math.min(options.maxSteps ?? 12, 50))
    this.timeoutMs = Math.max(1000, Math.min(options.timeoutMs ?? 60_000, 300_000))
    this.supabase = options.supabase
    this.checkpointer = options.checkpointer
    this.approve = options.approve
    this.policyApprove = this.supabase ? createExecutionPolicyApprovalGate(this.supabase) : undefined
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

    if (this.supabase) {
      const claim = await claimAgentTask(this.supabase, task)
      if (!claim.claimed) {
        const result = blockedResult(task.id, task.target, task.risk, claim.reason)
        await this.emit({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: claim.reason })
        return result
      }
    }

    if (task.risk !== "low") {
      if (!this.approve) {
        const reason = "approval_required"
        const result = blockedResult(task.id, task.target, task.risk, reason)
        await this.publish({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason }, task, result)
        return result
      }
      const approval = await this.approve(task)
      if (!approval.approved) {
        const reason = approval.reason ?? "approval_denied"
        const result = blockedResult(task.id, task.target, task.risk, reason)
        await this.publish({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason }, task, result)
        return result
      }
    }

    const postApprovalAuthorization = authorizeAgentTask(task)
    if (!postApprovalAuthorization.allowed) {
      const reason = postApprovalAuthorization.reason
      const result = blockedResult(task.id, task.target, task.risk, reason)
      await this.publish({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason }, task, result)
      return result
    }

    let actionReservationId: string | null = null

    if (isOperatorAction(task) && this.policyApprove) {
      const policyApproval = await this.policyApprove(task)
      if (!policyApproval.approved) {
        const reason = policyApproval.reason ?? "execution_policy_denied"
        const result = blockedResult(task.id, task.target, task.risk, reason)
        await this.publish({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason }, task, result)
        return result
      }
      actionReservationId = policyApproval.reservationId ?? null
      if (actionReservationId && this.supabase) {
        try {
          const { attachAgentReservation } = await import("./persistence")
          await attachAgentReservation(this.supabase, task, actionReservationId)
        } catch {
          const reason = "agent_reservation_attach_failed"
          const { settleAgentReservation } = await import("./persistence")
          await settleAgentReservation(this.supabase, task, "released")
          const result = blockedResult(task.id, task.target, task.risk, reason)
          await this.publish({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason }, task, result)
          return result
        }
      }
    }

    await this.publish({ type: "task.authorized", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() }, task)
    await this.publish({ type: "task.started", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() }, task)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(new Error("agent_runtime_timeout")), this.timeoutMs)

    try {
      if (actionReservationId && this.supabase && isOperatorAction(task)) {
        const actionType = task.input.actionType
        if (actionType !== "post" && actionType !== "reply") {
          throw new Error("operator_action_type_required")
        }
        await assertAgentActionReservation(this.supabase, task, actionType)
      }

      const graphRun = this.graph.invoke(
        { task, status: "running" },
        {
          recursionLimit: this.maxSteps,
          signal: controller.signal,
          configurable: { thread_id: task.id, checkpoint_ns: task.target },
        },
      )
      const result = await Promise.race([
        graphRun,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener(
            "abort",
            () => reject(controller.signal.reason ?? new Error("agent_runtime_timeout")),
            { once: true },
          )
        }),
      ])

      if (result.status === "blocked") {
        const finalResult = blockedResult(task.id, task.target, task.risk, result.blockedReason ?? "agent_blocked")
        await this.publish({ type: "task.blocked", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: finalResult.reason }, task, finalResult)
        if (actionReservationId && this.supabase) {
          const { settleAgentReservation } = await import("./persistence")
          await settleAgentReservation(this.supabase, task, "released")
        }
        return finalResult
      }
      if (result.status === "failed") {
        const finalResult: AgentResult = { taskId: task.id, agent: task.target, status: "failed", reason: result.blockedReason ?? "agent_failed", risk: task.risk, createdAt: Date.now() }
        await this.publish({ type: "task.failed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason: finalResult.reason }, task, finalResult)
        if (actionReservationId && this.supabase) {
          const { settleAgentReservation } = await import("./persistence")
          await settleAgentReservation(this.supabase, task, "released")
        }
        return finalResult
      }

      const finalResult: AgentResult = { taskId: task.id, agent: task.target, status: "completed", output: result.outputs[task.target], risk: task.risk, createdAt: Date.now() }
      await this.publish({ type: "task.completed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now() }, task, finalResult)
      if (actionReservationId && this.supabase) {
        const { settleAgentReservation } = await import("./persistence")
        await settleAgentReservation(this.supabase, task, "executed")
      }
      return finalResult
    } catch (error) {
      const reason = controller.signal.aborted ? "agent_runtime_timeout" : error instanceof Error ? error.message : "agent_runtime_error"
      const finalResult: AgentResult = { taskId: task.id, agent: task.target, status: "failed", reason, risk: task.risk, createdAt: Date.now() }
      await this.publish({ type: "task.failed", taskId: task.id, userId: task.userId, agent: task.target, at: Date.now(), reason }, task, finalResult)
      if (actionReservationId && this.supabase) {
        const { settleAgentReservation } = await import("./persistence")
        await settleAgentReservation(this.supabase, task, "released")
      }
      return finalResult
    } finally {
      clearTimeout(timeout)
      if (!controller.signal.aborted) controller.abort()
    }
  }

  createTask = createAgentTask
}

export function createExecutionPolicyApprovalGate(supabase: SupabaseClient) {
  return async (task: AgentTask) => {
    if (task.target !== "operator") return { approved: true }
    const actionContract = validateOperatorAction(task)
    if (!actionContract.allowed) {
      return { approved: false, reason: actionContract.reason }
    }
    const actionType = task.input.actionType as "post" | "reply"

    const result = await authorizeAutonomousAction(supabase, task.userId, actionType, {
      taskId: task.id,
      targetId: task.resource?.targetId,
      recipientOptedIn: task.input.recipientOptedIn === true,
      aiReplyApproved: task.input.aiReplyApproved === true,
      timezone: typeof task.input.timezone === "string" ? task.input.timezone : undefined,
    })

    return { approved: result.allowed, reason: result.reason, reservationId: result.reservationId }
  }
}
