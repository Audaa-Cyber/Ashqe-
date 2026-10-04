import type { SupabaseClient } from "@supabase/supabase-js"
import { buildRecoveryPlan } from "./ledger"

const TRANSITIONS: Record<string, string[]> = {
  planned: ["ready", "cancelled", "failed"],
  ready: ["running", "waiting_approval", "cancelled", "failed"],
  running: ["executing", "waiting_approval", "failed", "diagnosing"],
  waiting_approval: ["ready", "cancelled", "failed"],
  executing: ["verifying", "failed", "diagnosing"],
  verifying: ["completed", "failed", "diagnosing"],
  diagnosing: ["recovering", "escalated", "failed"],
  recovering: ["ready", "running", "escalated", "failed"],
  completed: [],
  escalated: [],
  cancelled: [],
  failed: ["diagnosing"],
  created: ["planned", "cancelled"],
}

export function canTransitionMission(from: string, to: string) {
  return TRANSITIONS[from]?.includes(to) ?? false
}

export async function transitionMission(
  supabase: SupabaseClient,
  input: { userId: string; missionId: string; from: string; to: string; checkpoint?: Record<string, unknown>; failureReason?: string },
) {
  if (!canTransitionMission(input.from, input.to)) throw new Error("invalid_mission_transition")
  const failure = input.failureReason ? buildRecoveryPlan(input.failureReason) : null
  const update: Record<string, unknown> = {
    status: input.to,
    checkpoint: input.checkpoint ?? {},
  }
  if (failure) {
    update.failure_class = failure.classification.type
    update.recovery_strategy = failure.next
  }
  if (input.to === "running" && !input.checkpoint?.startedAt) update.started_at = new Date().toISOString()
  if (input.to === "completed") update.completed_at = new Date().toISOString()
  const { data, error } = await supabase
    .from("ashqe_missions")
    .update(update)
    .eq("id", input.missionId)
    .eq("user_id", input.userId)
    .eq("status", input.from)
    .select("id,status,current_step,attempt,checkpoint,failure_class,recovery_strategy")
    .maybeSingle()
  if (error) throw new Error("mission_transition_failed")
  if (!data) throw new Error("mission_transition_conflict")
  return data
}

export async function failMissionWithRecovery(
  supabase: SupabaseClient,
  input: { userId: string; missionId: string; reason: string },
) {
  const plan = buildRecoveryPlan(input.reason)
  const { data, error } = await supabase
    .from("ashqe_missions")
    .update({
      status: "diagnosing",
      failure_class: plan.classification.type,
      recovery_strategy: plan.next,
      checkpoint: { failureReason: input.reason, diagnosedAt: new Date().toISOString() },
    })
    .eq("id", input.missionId)
    .eq("user_id", input.userId)
    .in("status", ["running", "executing", "verifying", "failed"])
    .select("id,status,failure_class,recovery_strategy,checkpoint")
    .maybeSingle()
  if (error) throw new Error("mission_failure_record_failed")
  if (!data) throw new Error("mission_failure_transition_conflict")
  return data
}

export async function claimNextMissionStep(
  supabase: SupabaseClient,
  input: { userId: string; missionId: string; position: number },
) {
  const { data: mission } = await supabase.from("ashqe_missions").select("id,status,current_step,attempt").eq("id", input.missionId).eq("user_id", input.userId).maybeSingle()
  if (!mission) throw new Error("mission_not_found")
  const { data, error } = await supabase
    .from("ashqe_mission_steps")
    .update({ status: "running", attempt: (mission.attempt ?? 0) + 1, started_at: new Date().toISOString() })
    .eq("mission_id", input.missionId)
    .eq("position", input.position)
    .eq("status", "ready")
    .select("id,position,objective,status,attempt,input,output,verification_id")
    .maybeSingle()
  if (error) throw new Error("mission_step_claim_failed")
  if (!data) throw new Error("mission_step_already_claimed")
  return data
}
