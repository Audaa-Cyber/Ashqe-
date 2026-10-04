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
  input: { userId: string; decisionId: string; aiReplyApproved?: boolean },
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

  const authorityCeiling = [...required]
  const metadata = opportunity.metadata && typeof opportunity.metadata === "object"
    ? opportunity.metadata as Record<string, unknown>
    : {}
  const draftText = typeof metadata.draftText === "string" ? metadata.draftText.trim() : ""

  if (WRITE_ACTIONS.has(action) && !draftText) {
    throw new Error("write_mission_requires_explicit_draft_text")
  }

  // Decision approval and AI-reply approval are intentionally separate controls.
  // This prevents approving a strategic decision from silently granting permission
  // to generate/send an external reply.
  const aiReplyApproved = input.aiReplyApproved === true

  const stepInput: Record<string, unknown> = {
    agent: WRITE_ACTIONS.has(action)
      ? "operator"
      : action === "research"
        ? "research"
        : action === "relationship"
          ? "analytics"
          : "analytics",
    actionType: action === "post" ? "post" : action === "reply" || action === "follow_up" ? "reply" : undefined,
    text: draftText || undefined,
    targetId: typeof metadata.targetId === "string" ? metadata.targetId : undefined,
    targetText: typeof metadata.targetText === "string" ? metadata.targetText : undefined,
    recipientOptedIn: metadata.recipientOptedIn === true,
    aiReplyApproved,
    risk: WRITE_ACTIONS.has(action) ? "high" : "low",
    opportunityId: opportunity.id,
  }

  const { data: converted, error: conversionError } = await supabase.rpc("ashqe_approve_decision_create_mission", {
    p_user_id: input.userId,
    p_decision_id: decision.id,
    p_authority_ceiling: authorityCeiling,
    p_step_input: stepInput,
    p_expires_at: opportunity.expires_at ?? null,
  })

  if (conversionError) {
    const message = conversionError.message ?? ""
    if (message.includes("decision_not_found")) throw new Error("decision_not_found")
    if (message.includes("decision_not_approvable")) throw new Error("decision_not_approvable")
    if (message.includes("decision_opportunity_not_found")) throw new Error("decision_opportunity_not_found")
    throw new Error("decision_mission_conversion_failed")
  }

  const row = Array.isArray(converted) ? converted[0] : converted
  if (!row?.mission_id) throw new Error("decision_mission_conversion_failed")

  return {
    missionId: String(row.mission_id),
    decisionId: decision.id,
    action,
    authorityCeiling,
    reused: Boolean(row.reused),
    aiReplyApproved,
  }
}
