import type { SupabaseClient } from "@supabase/supabase-js"
import type { AgentRuntimeEvent } from "./runtime"
import type { AgentTask, AgentResult } from "./contracts"

export async function createAgentRun(supabase: SupabaseClient, task: AgentTask) {
  const { error } = await supabase.from("ashqe_agent_runs").insert({
    id: task.id,
    task_id: task.id,
    parent_task_id: task.parentTaskId,
    user_id: task.userId,
    issuer: task.issuer,
    target: task.target,
    status: "queued",
    risk: task.risk,
    goal: task.goal,
    input: task.input,
    depth: task.depth,
    expires_at: new Date(task.expiresAt).toISOString(),
  })
  if (error) throw new Error("agent_run_create_failed")
}

export async function updateAgentRun(supabase: SupabaseClient, task: AgentTask, result: AgentResult) {
  const { error } = await supabase.from("ashqe_agent_runs").update({
    status: result.status,
    output: result.output ?? null,
    reason: result.reason ?? null,
    finished_at: new Date().toISOString(),
  }).eq("task_id", task.id).eq("user_id", task.userId)
  if (error) throw new Error("agent_run_update_failed")
}

export async function recordAgentEvent(supabase: SupabaseClient, task: AgentTask, event: AgentRuntimeEvent) {
  const { error } = await supabase.from("ashqe_agent_events").insert({
    run_id: task.id,
    user_id: task.userId,
    task_id: task.id,
    agent: event.agent,
    event_type: event.type,
    decision: event.type === "task.blocked" ? "blocked" : event.type === "task.authorized" ? "allowed" : null,
    metadata: event.reason ? { reason: event.reason } : {},
  })
  if (error) throw new Error("agent_event_write_failed")
}
