import { END, START, StateGraph } from "@langchain/langgraph"
import type { AgentTask, AgentResult } from "../contracts"
import { AshqeGraphState, type AshqeGraphStateValue } from "./state"

export type AgentHandler = (task: AgentTask, state: AshqeGraphStateValue) => Promise<AgentResult> | AgentResult
export type AgentHandlerMap = Partial<Record<AgentTask["target"], AgentHandler>>

export function buildAgentWorkflow(handlers: AgentHandlerMap) {
  const workflow = new StateGraph(AshqeGraphState)
    .addNode("dispatch", async (state) => {
      const task = stateToTask(state)
      const handler = handlers[task.target]
      if (!handler) {
        return { status: "blocked" as const, blockedReason: "agent_handler_unregistered" }
      }

      const result = await handler(task, state)
      if (result.status === "blocked") {
        return { status: "blocked" as const, blockedReason: result.reason ?? "agent_blocked" }
      }
      if (result.status === "failed") {
        return { status: "failed" as const, blockedReason: result.reason ?? "agent_failed" }
      }
      return { status: "completed" as const, outputs: { [task.target]: result.output } }
    })
    .addEdge(START, "dispatch")
    .addEdge("dispatch", END)

  return workflow.compile()
}

function stateToTask(state: AshqeGraphStateValue): AgentTask {
  return {
    id: state.taskId,
    parentTaskId: null,
    userId: state.userId,
    issuer: "orchestrator",
    target: inferTarget(state),
    goal: state.goal,
    input: state.input,
    allowedTools: [],
    risk: "low",
    expiresAt: Date.now() + 60_000,
    nonce: state.taskId,
  }
}

function inferTarget(state: AshqeGraphStateValue): AgentTask["target"] {
  const target = Object.keys(state.input).find((key) => key === "agent")
  const value = target ? state.input[target] : undefined
  if (typeof value === "string") {
    const allowed = ["research", "conversation", "voice", "content", "critic", "opportunity", "trend", "relationship", "analytics", "operator", "memory"] as const
    if ((allowed as readonly string[]).includes(value)) return value as AgentTask["target"]
  }
  return "research"
}
