import { END, START, StateGraph } from "@langchain/langgraph"
import type { AgentResult, AgentTask } from "../contracts"
import { AshqeGraphState, type AshqeGraphStateValue } from "./state"

export type AgentHandler = (task: AgentTask, state: AshqeGraphStateValue) => Promise<AgentResult> | AgentResult
export type AgentHandlerMap = Partial<Record<AgentTask["target"], AgentHandler>>

export function buildAgentWorkflow(handlers: AgentHandlerMap) {
  const workflow = new StateGraph(AshqeGraphState)
    .addNode("dispatch", async (state) => {
      const task = state.task
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
