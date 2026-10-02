import type { SupabaseClient } from "@supabase/supabase-js"
import type { AgentTask } from "./contracts"

export async function claimAgentTask(supabase: SupabaseClient, task: AgentTask) {
  const { data, error } = await supabase.from("ashqe_agent_runs").insert({
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
  }).select("id").maybeSingle()
  if (error) return { claimed: false, reason: "task_already_claimed_or_persistence_failed" as const }
  return { claimed: Boolean(data), reason: "claimed" as const }
}
