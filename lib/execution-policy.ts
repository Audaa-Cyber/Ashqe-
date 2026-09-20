import type { SupabaseClient } from "@supabase/supabase-js"

export type ExecutionPolicy = {
  autonomous_enabled: boolean
  autonomous_posts: boolean
  autonomous_replies: boolean
  max_posts_per_day: number
  max_replies_per_day: number
  allowed_hours_start: number
  allowed_hours_end: number
  require_reply_opt_in: boolean
  require_ai_reply_approval: boolean
}

export const DEFAULT_EXECUTION_POLICY: ExecutionPolicy = {
  autonomous_enabled: false,
  autonomous_posts: false,
  autonomous_replies: false,
  max_posts_per_day: 3,
  max_replies_per_day: 5,
  allowed_hours_start: 8,
  allowed_hours_end: 22,
  require_reply_opt_in: true,
  require_ai_reply_approval: true,
}

export async function getExecutionPolicy(supabase: SupabaseClient, userId: string): Promise<ExecutionPolicy> {
  const { data } = await supabase.from("ashqe_execution_policy").select("*").eq("user_id", userId).maybeSingle()
  return data ? { ...DEFAULT_EXECUTION_POLICY, ...data } : DEFAULT_EXECUTION_POLICY
}

function withinHours(policy: ExecutionPolicy, timezone = "UTC") {
  const hour = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "2-digit", hour12: false }).format(new Date())) % 24
  const start = policy.allowed_hours_start
  const end = policy.allowed_hours_end
  if (start === end) return true
  return start < end ? hour >= start && hour < end : hour >= start || hour < end
}

export async function authorizeAutonomousAction(
  supabase: SupabaseClient,
  userId: string,
  actionType: "post" | "reply",
  opts: { targetId?: string; recipientOptedIn?: boolean; aiReplyApproved?: boolean; timezone?: string } = {},
) {
  const policy = await getExecutionPolicy(supabase, userId)
  let reason = "policy_passed"

  if (!policy.autonomous_enabled) reason = "autonomous_mode_off"
  else if (actionType === "post" && !policy.autonomous_posts) reason = "autonomous_posts_off"
  else if (actionType === "reply" && !policy.autonomous_replies) reason = "autonomous_replies_off"
  else if (!withinHours(policy, opts.timezone)) reason = "outside_allowed_hours"
  else if (actionType === "reply" && policy.require_reply_opt_in && !opts.recipientOptedIn) reason = "recipient_opt_in_required"
  else if (actionType === "reply" && policy.require_ai_reply_approval && !opts.aiReplyApproved) reason = "x_ai_reply_approval_required"
  else {
    const { data: reservationId, error } = await supabase.rpc("ashqe_claim_autonomous_action", {
      p_user_id: userId,
      p_action_type: actionType,
      p_target_id: opts.targetId ?? null,
      p_policy: policy,
    })
    if (!error && reservationId) return { allowed: true, reason, policy, reservationId: String(reservationId) }
    reason = error ? "action_claim_failed" : "daily_limit_reached"
  }

  await supabase.from("ashqe_action_log").insert({
    user_id: userId,
    action_type: actionType,
    target_id: opts.targetId ?? null,
    status: "blocked",
    reason,
    policy_snapshot: policy,
  })
  return { allowed: false, reason, policy, reservationId: null }
}
