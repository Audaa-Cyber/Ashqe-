import type { SupabaseClient } from "@supabase/supabase-js"
import { buildRecoveryPlan } from "./ledger"

const TRANSITIONS: Record<string, string[]> = {
  planned: ["ready", "cancelled", "failed"],
  ready: ["running", "waiting_approval", "cancelled", "failed"],
  running: ["executing", "waiting_approval", "failed", "diagnosing", "paused"],
  waiting_approval: ["ready", "cancelled", "failed"],
  executing: ["verifying", "failed", "diagnosing"],
  verifying: ["completed", "failed", "diagnosing"],
  diagnosing: ["recovering", "escalated", "failed"],
  recovering: ["ready", "running", "escalated", "failed"],
  paused: ["ready", "running", "cancelled", "failed"],
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
  if (["ready","running","completed"].includes(input.to)) {
    update.failure_class = null
    update.recovery_strategy = null
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
      checkpoint: {
        ...(await supabase.from("ashqe_missions").select("checkpoint").eq("id", input.missionId).eq("user_id", input.userId).maybeSingle()).data?.checkpoint,
        failureReason: input.reason,
        diagnosedAt: new Date().toISOString(),
      },
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
  const { data, error } = await supabase.rpc("ashqe_claim_mission_step", {
    p_user_id: input.userId,
    p_mission_id: input.missionId,
    p_position: input.position,
    p_lease_seconds: 120,
  })
  if (error || !data) throw new Error(error?.message ?? "mission_step_claim_failed")
  return data
}

export async function heartbeatMissionStep(
  supabase: SupabaseClient,
  input: { userId: string; missionId: string; stepId: string; leaseSeconds?: number },
) {
  const { data, error } = await supabase.rpc("ashqe_heartbeat_mission_step", {
    p_user_id: input.userId,
    p_mission_id: input.missionId,
    p_step_id: input.stepId,
    p_lease_seconds: input.leaseSeconds ?? 120,
  })
  if (error) throw new Error("mission_step_heartbeat_failed")
  if (!data) throw new Error("mission_step_lease_expired")
  return true
}

export async function completeMissionStep(
  supabase: SupabaseClient,
  input: { userId: string; missionId: string; stepId: string; output?: Record<string, unknown>; verificationId?: string },
) {
  const { data, error } = await supabase.rpc("ashqe_complete_mission_step", {
    p_user_id: input.userId,
    p_mission_id: input.missionId,
    p_step_id: input.stepId,
    p_output: input.output ?? {},
    p_verification_id: input.verificationId ?? null,
  })
  if (error) throw new Error("mission_step_complete_failed")

  const { data: mission, error: missionError } = await supabase
    .from("ashqe_missions")
    .select("id,status,current_step,checkpoint,completed_at")
    .eq("id", input.missionId).eq("user_id", input.userId).maybeSingle()
  if (missionError || !mission) throw new Error("mission_checkpoint_read_failed")
  return { result: data, mission, completed: Boolean(data?.completed) }
}



export async function waitForMissionApproval(
  supabase: SupabaseClient,
  input: { userId: string; missionId: string; stepId: string },
) {
  const { data: step, error } = await supabase
    .from("ashqe_mission_steps")
    .select("id,status")
    .eq("id", input.stepId)
    .eq("mission_id", input.missionId)
    .maybeSingle()
  if (error || !step) throw new Error("mission_step_not_found")
  if (!["ready","running","waiting_approval"].includes(step.status)) throw new Error("mission_step_not_approvable")
  const { data, error: updateError } = await supabase
    .from("ashqe_mission_steps")
    .update({ status: "waiting_approval" })
    .eq("id", input.stepId)
    .eq("mission_id", input.missionId)
    .in("status", ["ready","running"])
    .select("id,status")
    .maybeSingle()
  if (updateError) throw new Error("mission_approval_request_failed")
  if (!data) throw new Error("mission_approval_request_conflict")
  const mission = await transitionMission(supabase, {
    userId: input.userId, missionId: input.missionId,
    from: "running", to: "waiting_approval",
  }).catch(async () => {
    const { data: current } = await supabase.from("ashqe_missions").select("id,status").eq("id",input.missionId).eq("user_id",input.userId).maybeSingle()
    if (!current) throw new Error("mission_not_found")
    if (current.status === "waiting_approval") return current
    throw new Error("mission_approval_transition_conflict")
  })
  return { mission, step: data }
}
