import { Annotation } from "@langchain/langgraph"
import type { AgentTask } from "../contracts"

export const AshqeGraphState = Annotation.Root({
  task: Annotation<AgentTask>(),
  outputs: Annotation<Record<string, unknown>>({ reducer: (current, next) => ({ ...current, ...next }), default: () => ({}) }),
  blockedReason: Annotation<string | null>({ reducer: (_, next) => next, default: () => null }),
  status: Annotation<"queued" | "running" | "completed" | "blocked" | "failed">({ reducer: (_, next) => next, default: () => "queued" }),
})

export type AshqeGraphStateValue = typeof AshqeGraphState.State
