import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildOpportunityFingerprint, rankDecisionCandidates, scoreDecision, freshnessScore, type DecisionAction } from "@/lib/intelligence/ledger"
import { buildOpportunities } from "@/lib/x/opportunity-engine"
import { executeMissionStep } from "@/lib/intelligence/mission-executor"
import { fetchRecentTweets } from "@/lib/x/api"

export const dynamic = "force-dynamic"

const ACTIONS: DecisionAction[] = ["research","reply","post","follow_up","relationship","monitor"]

function finite01(value: unknown, fallback = 0.5) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback
}

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: signals } = await supabase.from("ashqe_signals").select("*").eq("user_id", user.id).order("created_at",{ascending:false}).limit(100)
  const connection = await supabase.from("x_connections").select("x_user_id").eq("user_id",user.id).maybeSingle()
  let tweets = []
  if (connection.data?.x_user_id) {
    const token = await (await import("@/lib/x/api")).getValidAccessToken(supabase,user.id)
    if (token) tweets = await fetchRecentTweets(token.access_token, token.x_user_id, 50)
  }
  const opportunities = buildOpportunities((signals ?? []) as never[], tweets, 25)
  const persisted: Array<Record<string, unknown>> = []

  for (const opportunity of opportunities) {
    const fingerprint = buildOpportunityFingerprint({
      type: opportunity.type,
      topic: opportunity.title,
      entities: opportunity.evidence.map(e => e.authorId ?? ""),
      authors: opportunity.evidence.map(e => e.authorId ?? ""),
      intent: opportunity.action,
      window: opportunity.metadata.last_seen_at ? String(opportunity.metadata.last_seen_at).slice(0,13) : new Date().toISOString().slice(0,13),
    })
    const freshness = freshnessScore(opportunity.metadata.last_seen_at ? String(opportunity.metadata.last_seen_at) : undefined)
    const candidateInputs = ACTIONS.map(action => ({
      id: crypto.randomUUID(),
      opportunityId: fingerprint,
      action,
      expectedValue: finite01(opportunity.confidence),
      evidenceStrength: finite01(opportunity.evidence.length / 5),
      confidence: finite01(opportunity.confidence),
      freshness,
      strategicAlignment: action === "relationship" && opportunity.type === "bd" ? 1 : 0.5,
      relationshipValue: opportunity.type === "conversation" || opportunity.type === "bd" ? 0.8 : 0.3,
      historicalSuccess: 0.5,
      executionCost: action === "post" || action === "reply" ? 0.4 : 0.1,
      risk: action === "post" || action === "reply" ? 0.6 : 0.2,
      uncertainty: 1 - finite01(opportunity.confidence),
      duplicatePenalty: 0,
      score: 0,
    })).map(c => ({...c, score: scoreDecision(c)}))
    const top = rankDecisionCandidates(candidateInputs)[0]
    if (!top) continue

    const { data: opportunityRow, error: opportunityError } = await supabase.from("ashqe_opportunity_state").upsert({
      user_id:user.id,fingerprint,opportunity_key:opportunity.key,type:opportunity.type,title:opportunity.title,
      score:top.score,confidence:finite01(opportunity.confidence),urgency:opportunity.urgency,
      evidence_ids:opportunity.evidence.map(e=>e.tweetId),metadata:opportunity.metadata,last_seen_at:new Date().toISOString()
    },{onConflict:"user_id,fingerprint"}).select("id").single()
    if (opportunityError || !opportunityRow) continue

    const { data: decision, error: decisionError } = await supabase.from("ashqe_decisions").upsert({
      user_id:user.id,opportunity_id:opportunityRow.id,action:top.action,score:top.score,
      rationale:"Ranked from fresh evidence, confidence, expected value, freshness, risk, cost and relationship value.",
      inputs:{...top,opportunityFingerprint:fingerprint},status:"candidate"
    },{onConflict:"user_id,opportunity_id,action"}).select("id").maybeSingle()
    if (decisionError) continue
    persisted.push({opportunityId:opportunityRow.id,decisionId:decision?.id,action:top.action,score:top.score})
  }

  return NextResponse.json({opportunities:opportunities.length,persisted})
}
