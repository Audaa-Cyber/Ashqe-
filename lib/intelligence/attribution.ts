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
  const total = input.factors.reduce((s,f)=>s+Math.max(0,f.contribution),0) || 1
  const rows=input.factors.map(f=>({
    outcome_id:input.outcomeId,factor:f.factor,contribution:f.contribution/total,
    confidence:Math.max(0,Math.min(1,f.confidence)),methodology:input.methodology ?? "normalized_factor_attribution",
    evidence:f.evidence ?? []
  }))
  if (rows.length) {
    const {error}=await supabase.from("ashqe_attributions").insert(rows)
    if(error) throw new Error("attribution_persist_failed")
  }
  await supabase.from("ashqe_outcomes").update({state:"attributed"}).eq("id",input.outcomeId).eq("user_id",input.userId)
  return {outcomeId:input.outcomeId,factors:rows.length}
}

export async function calibrateLearning(supabase: SupabaseClient, input: {userId:string; hypothesis:string; successes:number; observations:number; evidenceIds?:string[]; outcomeIds?:string[]}) {
  const confidence=learningConfidence(input.observations,input.successes)
  const status=input.observations < 3 ? "candidate" : confidence >= .75 ? "supported" : confidence >= .55 ? "recalibrating" : "contradicted"
  const {data,error}=await supabase.from("ashqe_learning").insert({
    user_id:input.userId,hypothesis:input.hypothesis,
    observation:`successes=${input.successes}/${input.observations}`,
    evidence:(input.evidenceIds??[]).map(id=>({id})),
    supporting_outcomes:(input.outcomeIds??[]).map(id=>({id})),
    confidence,sample_size:Math.max(0,input.observations),status,last_validated_at:new Date().toISOString()
  }).select("id,confidence,status,sample_size").single()
  if(error||!data) throw new Error("learning_calibration_failed")
  return data
}
