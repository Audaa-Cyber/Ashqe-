import type { SupabaseClient } from "@supabase/supabase-js"

const ACTION_CAPABILITIES: Record<string, string[]> = {
  research: ["research.read"],
  reply: ["x.read.post", "x.write.reply"],
  post: ["content.generate", "x.write.post"],
  follow_up: ["x.read.post", "x.write.reply"],
  relationship: ["x.read.profile", "x.read.post", "memory.read"],
  monitor: ["x.read.timeline", "analytics.read"],
}

const WRITE_ACTIONS = new Set(["post", "reply", "follow_up"])

export async function approveDecisionAndCreateMission(
  supabase: SupabaseClient,
  input: { userId: string; decisionId: string },
) {
  const { data: decision, error: decisionError } = await supabase
    .from("ashqe_decisions")
    .select("*")
    .eq("id", input.decisionId)
    .eq("user_id", input.userId)
    .maybeSingle()
  if (decisionError) throw new Error("decision_read_failed")
  if (!decision) throw new Error("decision_not_found")
  if (decision.status !== "candidate") throw new Error("decision_not_approvable")

  const action = String(decision.selected_action)
  const required = ACTION_CAPABILITIES[action]
  if (!required) throw new Error("unsupported_decision_action")

  const { data: existing } = await supabase
    .from("ashqe_missions")
    .select("id,status")
    .eq("decision_id", decision.id)
    .not("status", "in", "(completed,cancelled,escalated,failed)")
    .maybeSingle()
  if (existing) return { missionId: existing.id, status: existing.status, reused: true }

  const { data: opportunity } = decision.opportunity_id
    ? await supabase.from("ashqe_opportunities").select("*").eq("id", decision.opportunity_id).eq("user_id", input.userId).maybeSingle()
    : { data: null }

  if (!opportunity) throw new Error("decision_opportunity_not_found")

  // Approval is explicit and does not widen the action scope. Writes still pass
  // the independent execution policy + reservation gate at runtime.
  const authorityCeiling = [...required]
  const stepInput: Record<string, unknown> = {
    agent: WRITE_ACTIONS.has(action) ? "operator" : action === "research" ? "research" : action === "relationship" ? "analytics" : "analytics",
    actionType: action === "post" ? "post" : action === "reply" || action === "follow_up" ? "reply" : undefined,
    targetId: typeof opportunity.metadata?.targetId === "string" ? opportunity.metadata.targetId : undefined,
    recipientOptedIn: opportunity.metadata?.recipientOptedIn === true,
    aiReplyApproved: action === "reply" || action === "follow_up",
    risk: WRITE_ACTIONS.has(action) ? "high" : "low",
    opportunityId: opportunity.id,
  }

  const { data: mission, error: missionError } = await supabase
    .from("ashqe_missions")
    .insert({
      user_id: input.userId,
      objective: opportunity.title,
      status: "planned",
      authority_ceiling: authorityCeiling,
      current_step: 0,
      decision_id: decision.id,
      checkpoint: { approvedAt: new Date().toISOString(), decisionId: decision.id },
      expires_at: opportunity.expires_at ?? null,
    })
    .select("id,status,current_step,authority_ceiling,decision_id,checkpoint")
    .single()
  if (missionError || !mission) throw new Error("mission_create_failed")

  const { error: stepError } = await supabase.from("ashqe_mission_steps").insert({
    mission_id: mission.id,
    position: 0,
    objective: opportunity.title,
    status: "ready",
    required_capabilities: required,
    input: stepInput,
  })
  if (stepError) {
    await supabase.from("ashqe_missions").delete().eq("id", mission.id).eq("user_id", input.userId)
    throw new Error("mission_step_create_failed")
  }

  const { error: decisionUpdateError } = await supabase.from("ashqe_decisions")
    .update({ status: "approved", mission_id: mission.id })
    .eq("id", decision.id).eq("user_id", input.userId).eq("status", "candidate")
  if (decisionUpdateError) throw new Error("decision_approval_failed")

  await supabase.from("ashqe_opportunities").update({ status: "acted" }).eq("id", opportunity.id).eq("user_id", input.userId)
  await supabase.from("ashqe_opportunity_state").update({ state: "converted" }).eq("user_id", input.userId).eq("fingerprint", opportunity.fingerprint)

  return { missionId: mission.id, decisionId: decision.id, action, authorityCeiling }
}
