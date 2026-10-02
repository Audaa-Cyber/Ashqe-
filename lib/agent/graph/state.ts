import { Annotation } from "@langchain/langgraph"

export const AshqeGraphState = Annotation.Root({
  taskId: Annotation<string>(),
  userId: Annotation<string>(),
  goal: Annotation<string>(),
  input: Annotation<Record<string, unknown>>({ reducer: (_, next) => next, default: () => ({}) }),
  outputs: Annotation<Record<string, unknown>>({ reducer: (current, next) => ({ ...current, ...next }), default: () => ({}) }),
  blockedReason: Annotation<string | null>({ reducer: (_, next) => next, default: () => null }),
  status: Annotation<"queued" | "running" | "completed" | "blocked" | "failed">({ reducer: (_, next) => next, default: () => "queued" }),
})

export type AshqeGraphStateValue = typeof AshqeGraphState.State
