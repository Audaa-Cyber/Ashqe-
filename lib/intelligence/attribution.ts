import type { SupabaseClient } from "@supabase/supabase-js"
import { learningConfidence } from "./ledger"

function finite(value: number, fallback = 0) {
  return Number.isFinite(value) ? value : fallback
}

export async function attributeOutcome(supabase: SupabaseClient, input: {
  userId: string
  outcomeId: string
  factors: Array<{ factor: string; contribution: number; confidence: number; evidence?: unknown[] }>
  methodology?: string
}) {
  const { data: outcome } = await supabase
    .from("ashqe_outcomes")
    .select("id,user_id,state,verification_id")
    .eq("id",input.outcomeId)
    .eq("user_id",input.userId)
    .maybeSingle()
  if (!outcome) throw new Error("outcome_not_found")
  if (!["verified","observed","contradicted","attributed"].includes(outcome.state)) {
    throw new Error("outcome_not_attributable")
  }

  const normalized = input.factors
    .map(f => ({
      ...f,
      factor: f.factor.trim().slice(0, 200),
      contribution: Math.max(-1, Math.min(1, finite(f.contribution))),
      confidence: Math.max(0, Math.min(1, finite(f.confidence))),
    }))
    .filter(f => f.factor.length > 0 && Math.abs(f.contribution) > 0)

  const magnitude = normalized.reduce((sum, factor) => sum + Math.abs(factor.contribution), 0) || 1
  const rows = normalized.map(f => ({
    outcome_id: input.outcomeId,
    factor: f.factor,
    contribution: f.contribution / magnitude,
    confidence: f.confidence,
    methodology: input.methodology ?? "normalized_factor_attribution_v2",
    evidence: Array.isArray(f.evidence) ? f.evidence.slice(0, 25) : [],
  }))

  if (rows.length) {
    const { error } = await supabase.from("ashqe_attributions").upsert(rows,{onConflict:"outcome_id,factor"})
    if(error) throw new Error("attribution_persist_failed")
  }

  await supabase.from("ashqe_outcomes").update({state:"attributed"}).eq("id",input.outcomeId).eq("user_id",input.userId)
  return {outcomeId:input.outcomeId,factors:rows.length}
}

export async function calibrateLearning(
  supabase: SupabaseClient,
  input: {
    userId:string
    hypothesis:string
    successes:number
    observations:number
    evidenceIds?:string[]
    outcomeIds?:string[]
  },
) {
  let observations=Math.max(0,Math.floor(input.observations))
  let successes=Math.max(0,Math.min(observations,Math.floor(input.successes)))
  let outcomeIds=(input.outcomeIds ?? []).slice(0, 100)

  if (outcomeIds.length) {
    const { data: outcomes, error } = await supabase.from("ashqe_outcomes")
      .select("id,state").eq("user_id",input.userId).in("id",outcomeIds)
    if (error) throw new Error("learning_outcome_read_failed")
    const valid = outcomes ?? []
    if (valid.length !== outcomeIds.length) throw new Error("learning_outcome_ownership_failed")
    observations = valid.length
    successes = valid.filter(o => ["verified","attributed"].includes(o.state)).length
    outcomeIds = valid.map(o => o.id)
  }

  const confidence=learningConfidence(observations,successes)
  const status=observations < 3 ? "candidate" : confidence >= .75 ? "supported" : confidence >= .55 ? "recalibrating" : "contradicted"
  const {data:existing}=await supabase.from("ashqe_learning").select("id").eq("user_id",input.userId).eq("hypothesis",input.hypothesis).order("created_at",{ascending:false}).limit(1).maybeSingle()
  const payload={
    user_id:input.userId,
    hypothesis:input.hypothesis.slice(0,500),
    observation:"successes="+successes+"/"+observations,
    evidence:(input.evidenceIds??[]).slice(0,100).map(id=>({id})),
    supporting_outcomes:outcomeIds.map(id=>({id})),
    confidence,
    sample_size:observations,
    status,
    last_validated_at:new Date().toISOString()
  }
  const query=existing
    ? supabase.from("ashqe_learning").update(payload).eq("id",existing.id).eq("user_id",input.userId)
    : supabase.from("ashqe_learning").insert(payload)
  const {data,error}=await query.select("id,confidence,status,sample_size").single()
  if(error||!data) throw new Error("learning_calibration_failed")
  return data
}
