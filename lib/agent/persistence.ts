import type { SupabaseClient } from "@supabase/supabase-js"
import type { AgentRuntimeEvent } from "./runtime"
import type { AgentTask, AgentResult } from "./contracts"

export async function startAgentRun(supabase: SupabaseClient, task: AgentTask) {
  const { error } = await supabase.rpc("ashqe_transition_agent_run", {
    p_task_id: task.id,
    p_user_id: task.userId,
    p_status: "running",
  })
  if (error) throw new Error("agent_run_start_failed")
}

export async function updateAgentRun(supabase: SupabaseClient, task: AgentTask, result: AgentResult) {
  const { error } = await supabase.rpc("ashqe_transition_agent_run", {
    p_task_id: task.id,
    p_user_id: task.userId,
    p_status: result.status,
    p_output: result.output ?? null,
    p_reason: result.reason ?? null,
  })
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


export async function attachAgentReservation(
  supabase: SupabaseClient,
  task: AgentTask,
  reservationId: string,
) {
  const { data, error } = await supabase.rpc("ashqe_attach_agent_reservation", {
    p_task_id: task.id,
    p_user_id: task.userId,
    p_reservation_id: reservationId,
  })
  if (error || data !== true) throw new Error("agent_reservation_attach_failed")
}

export async function settleAgentReservation(
  supabase: SupabaseClient,
  task: AgentTask,
  status: "executed" | "released",
) {
  const { data, error } = await supabase.rpc("ashqe_settle_agent_reservation", {
    p_task_id: task.id,
    p_user_id: task.userId,
    p_status: status,
  })
  if (error || data !== true) throw new Error("agent_reservation_settle_failed")
}
