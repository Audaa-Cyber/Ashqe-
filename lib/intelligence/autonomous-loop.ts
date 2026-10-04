import type { SupabaseClient } from "@supabase/supabase-js"
import { buildOpportunityFingerprint, rankDecisionCandidates, scoreDecision, freshnessScore, type DecisionAction } from "./ledger"
import { buildOpportunities } from "@/lib/x/opportunity-engine"
import { fetchRecentTweets, getValidAccessToken, type XTweet } from "@/lib/x/api"

const ACTIONS: DecisionAction[] = ["research","reply","post","follow_up","relationship","monitor"]

function finite01(value: unknown, fallback = 0.5) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback
}

export async function runIntelligenceCycle(supabase: SupabaseClient, userId: string) {
  const { data: signals, error: signalError } = await supabase.from("ashqe_signals").select("*")
    .eq("user_id",userId).order("created_at",{ascending:false}).limit(100)
  if (signalError) throw new Error("intelligence_signal_read_failed")

  const connection = await supabase.from("x_connections").select("x_user_id").eq("user_id",userId).maybeSingle()
  let tweets: XTweet[] = []
  if (connection.data?.x_user_id) {
    const token = await getValidAccessToken(supabase,userId)
    if (token) tweets=await fetchRecentTweets(token.access_token,token.x_user_id,50)
  }

  const opportunities=buildOpportunities((signals??[]) as never[],tweets,25)
  const persisted:Array<Record<string,unknown>>=[]

  for (const opportunity of opportunities) {
    const now=new Date().toISOString()
    const fingerprint=buildOpportunityFingerprint({
      type:opportunity.type,topic:opportunity.title,
      entities:opportunity.evidence.map(e=>e.authorId??"").filter(Boolean),
      authors:opportunity.evidence.map(e=>e.authorId??"").filter(Boolean),
      intent:opportunity.action,
      window:opportunity.metadata.last_seen_at?String(opportunity.metadata.last_seen_at).slice(0,13):now.slice(0,13),
    })
    const freshness=freshnessScore(opportunity.metadata.last_seen_at?String(opportunity.metadata.last_seen_at):undefined)
    const candidates=ACTIONS.map(action=>({
      id:crypto.randomUUID(),opportunityId:fingerprint,action,
      expectedValue:finite01(opportunity.confidence),
      evidenceStrength:finite01(opportunity.evidence.length/5),
      confidence:finite01(opportunity.confidence),freshness,
      strategicAlignment:action==="relationship"&&opportunity.type==="bd"?1:.5,
      relationshipValue:opportunity.type==="conversation"||opportunity.type==="bd"?.8:.3,
      historicalSuccess:.5,
      executionCost:action==="post"||action==="reply"?.4:.1,
      risk:action==="post"||action==="reply"?.6:.2,
      uncertainty:1-finite01(opportunity.confidence),duplicatePenalty:0,score:0,
    })).map(c=>({...c,score:scoreDecision(c)}))
    const ranked=rankDecisionCandidates(candidates)
    const top=ranked[0]
    if(!top) continue

    const {data:opp,error:oppError}=await supabase.from("ashqe_opportunities").upsert({
      user_id:userId,fingerprint,type:opportunity.type,topic:opportunity.title,intent:opportunity.action,
      title:opportunity.title,why_now:opportunity.whyNow,confidence:finite01(opportunity.confidence),
      urgency:Math.max(0,Math.min(10,opportunity.urgency)),freshness,last_seen_at:now,
      expires_at:opportunity.metadata.expires_at?String(opportunity.metadata.expires_at):null,status:"open",metadata:opportunity.metadata,
    },{onConflict:"user_id,fingerprint"}).select("id").single()
    if(oppError||!opp) continue

    const evidenceIds=opportunity.evidence.map(e=>e.tweetId).filter(Boolean)
    await supabase.from("ashqe_opportunity_state").upsert({
      user_id:userId,fingerprint,opportunity_key:opportunity.key,type:opportunity.type,title:opportunity.title,
      score:top.score,confidence:finite01(opportunity.confidence),urgency:opportunity.urgency,evidence_ids:evidenceIds,
      metadata:{...opportunity.metadata,canonicalOpportunityId:opp.id},last_seen_at:now,
      expires_at:opportunity.metadata.expires_at?String(opportunity.metadata.expires_at):null,
    },{onConflict:"user_id,fingerprint"})

    const {data:existing}=await supabase.from("ashqe_decisions").select("id,status")
      .eq("user_id",userId).eq("opportunity_id",opp.id).eq("selected_action",top.action)
      .in("status",["candidate","approved","executing"]).maybeSingle()

    let decisionId=existing?.id??null
    if(!existing){
      const {data:decision,error}=await supabase.from("ashqe_decisions").insert({
        user_id:userId,opportunity_id:opp.id,selected_action:top.action,score:top.score,
        expected_value:top.expectedValue,evidence_strength:top.evidenceStrength,confidence:top.confidence,
        freshness:top.freshness,strategic_alignment:top.strategicAlignment,relationship_value:top.relationshipValue,
        historical_success:top.historicalSuccess,execution_cost:top.executionCost,risk:top.risk,uncertainty:top.uncertainty,
        alternatives:ranked.slice(1,4).map(c=>({action:c.action,score:c.score})),
        rationale:"Ranked from fresh evidence, confidence, expected value, freshness, risk, cost and relationship value.",
        status:"candidate",
      }).select("id").single()
      if(error||!decision) continue
      decisionId=decision.id
    }
    persisted.push({opportunityId:opp.id,decisionId,action:top.action,score:top.score})
  }
  return {opportunities:opportunities.length,persisted}
}
