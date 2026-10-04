import type { SupabaseClient } from "@supabase/supabase-js"
import { learningConfidence } from "./ledger"

export async function attributeOutcome(supabase: SupabaseClient, input: {
  userId: string
  outcomeId: string
  factors: Array<{ factor: string; contribution: number; confidence: number; evidence?: unknown[] }>
  methodology?: string
}) {
  const { data: outcome } = await supabase.from("ashqe_outcomes").select("id,user_id,state").eq("id",input.outcomeId).eq("user_id",input.userId).maybeSingle()
  if (!outcome) throw new Error("outcome_not_found")
  const normalized = input.factors.map(f => ({ ...f, factor: f.factor.trim() })).filter(f => f.factor.length > 0)
  const total = normalized.reduce((s,f)=>s+Math.max(0,f.contribution),0) || 1
  const rows=normalized.map(f=>({
    outcome_id:input.outcomeId,factor:f.factor,contribution:f.contribution/total,
    confidence:Math.max(0,Math.min(1,f.confidence)),methodology:input.methodology ?? "normalized_factor_attribution",
    evidence:f.evidence ?? []
  }))
  if (rows.length) {
    const {error}=await supabase.from("ashqe_attributions").upsert(rows,{onConflict:"outcome_id,factor"})
    if(error) throw new Error("attribution_persist_failed")
  }
  await supabase.from("ashqe_outcomes").update({state:"attributed"}).eq("id",input.outcomeId).eq("user_id",input.userId)
  return {outcomeId:input.outcomeId,factors:rows.length}
}

export async function calibrateLearning(supabase: SupabaseClient, input: {userId:string; hypothesis:string; successes:number; observations:number; evidenceIds?:string[]; outcomeIds?:string[]}) {
  const observations=Math.max(0,Math.floor(input.observations))
  const successes=Math.max(0,Math.min(observations,Math.floor(input.successes)))
  const confidence=learningConfidence(observations,successes)
  const status=observations < 3 ? "candidate" : confidence >= .75 ? "supported" : confidence >= .55 ? "recalibrating" : "contradicted"
  const {data:existing}=await supabase.from("ashqe_learning").select("id").eq("user_id",input.userId).eq("hypothesis",input.hypothesis).order("created_at",{ascending:false}).limit(1).maybeSingle()
  const payload={
    user_id:input.userId,hypothesis:input.hypothesis,
    observation:"successes="+successes+"/"+observations,
    evidence:(input.evidenceIds??[]).map(id=>({id})),
    supporting_outcomes:(input.outcomeIds??[]).map(id=>({id})),
    confidence,sample_size:observations,status,last_validated_at:new Date().toISOString()
  }
  const query=existing
    ? supabase.from("ashqe_learning").update(payload).eq("id",existing.id).eq("user_id",input.userId)
    : supabase.from("ashqe_learning").insert(payload)
  const {data,error}=await query.select("id,confidence,status,sample_size").single()
  if(error||!data) throw new Error("learning_calibration_failed")
  return data
}
