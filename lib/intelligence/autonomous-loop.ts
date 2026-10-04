import type { SupabaseClient } from "@supabase/supabase-js"
import { buildOpportunityFingerprint, rankDecisionCandidates, scoreDecision, freshnessScore, type DecisionAction } from "./ledger"
import { buildOpportunities } from "@/lib/x/opportunity-engine"
import { fetchRecentTweets, getValidAccessToken, type XTweet } from "@/lib/x/api"

const ACTIONS: DecisionAction[] = ["research","reply","post","follow_up","relationship","monitor"]

function finite01(value: unknown, fallback = 0.5) {
  const n = typeof value === "number" ? value : Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : fallback
}

async function persistEvidence(
  supabase: SupabaseClient,
  userId: string,
  item: { tweetId: string; url: string; text: string; authorId: string | null; metrics: XTweet["public_metrics"] },
  confidence: number,
) {
  const sourceType = "x"
  const { data: existingSource } = await supabase
    .from("ashqe_evidence_sources")
    .select("evidence_id")
    .eq("source_type", sourceType)
    .eq("source_id", item.tweetId)
    .maybeSingle()

  if (existingSource?.evidence_id) return String(existingSource.evidence_id)

  const { data: evidence, error } = await supabase
    .from("ashqe_evidence")
    .insert({
      user_id: userId,
      provider: "x",
      source_type: sourceType,
      source_url: item.url,
      claim: item.text,
      classification: "direct",
      observed_at: new Date().toISOString(),
      confidence: finite01(confidence),
      uncertainty: 1 - finite01(confidence),
      metadata: { tweetId: item.tweetId, authorId: item.authorId, metrics: item.metrics },
    })
    .select("id")
    .single()

  if (error || !evidence) throw new Error("evidence_persist_failed")

  const { error: sourceError } = await supabase
    .from("ashqe_evidence_sources")
    .insert({
      evidence_id: evidence.id,
      source_type: sourceType,
      source_id: item.tweetId,
      author_id: item.authorId,
      metadata: { url: item.url },
    })

  if (!sourceError) return String(evidence.id)

  const { data: raced } = await supabase
    .from("ashqe_evidence_sources")
    .select("evidence_id")
    .eq("source_type", sourceType)
    .eq("source_id", item.tweetId)
    .maybeSingle()

  return raced?.evidence_id ? String(raced.evidence_id) : String(evidence.id)
}

async function historicalSuccess(supabase: SupabaseClient, userId: string, action: DecisionAction) {
  const { data } = await supabase
    .from("ashqe_learning")
    .select("hypothesis,observation,confidence,status,sample_size")
    .eq("user_id", userId)
    .in("status", ["supported","repeated","calibrated","recalibrating"])
    .order("last_validated_at", { ascending: false })
    .limit(50)

  const matches = (data ?? []).filter((row) => {
    const haystack = (String(row.hypothesis ?? "") + " " + String(row.observation ?? "")).toLowerCase()
    return haystack.includes(action.toLowerCase())
  })

  if (!matches.length) return 0.5

  const weighted = matches.reduce((sum, row) => {
    const confidence = finite01(row.confidence)
    const sample = Math.max(1, Number(row.sample_size) || 1)
    return sum + confidence * Math.min(sample, 20)
  }, 0)
  const weight = matches.reduce((sum, row) => sum + Math.min(Math.max(1, Number(row.sample_size) || 1), 20), 0)
  return weight > 0 ? finite01(weighted / weight) : 0.5
}

export async function runIntelligenceCycle(supabase: SupabaseClient, userId: string) {
  const { data: leaseToken, error: leaseError } = await supabase.rpc("ashqe_claim_intelligence_cycle", {
    p_user_id: userId,
    p_lease_seconds: 240,
  })
  if (leaseError) throw new Error("intelligence_cycle_lock_failed")
  if (!leaseToken) return { skipped: true, reason: "cycle_already_running", opportunities: 0, persisted: [] }

  let cycleError: string | null = null
  try {
    const { data: signals, error: signalError } = await supabase.from("ashqe_signals").select("*")
      .eq("user_id", userId).order("created_at",{ascending:false}).limit(100)
    if (signalError) throw new Error("intelligence_signal_read_failed")

    const connection = await supabase.from("x_connections").select("x_user_id").eq("user_id",userId).maybeSingle()
    let tweets: XTweet[] = []
    if (connection.data?.x_user_id) {
      const token = await getValidAccessToken(supabase,userId)
      if (token) tweets = await fetchRecentTweets(token.access_token,token.x_user_id,50)
    }

    const opportunities = buildOpportunities((signals??[]) as never[],tweets,25)
    const persisted: Array<Record<string,unknown>> = []
    const learning = new Map<DecisionAction, number>()

    for (const action of ACTIONS) learning.set(action, await historicalSuccess(supabase, userId, action))

    for (const opportunity of opportunities) {
      const now = new Date().toISOString()
      const fingerprint = buildOpportunityFingerprint({
        type: opportunity.type,
        topic: opportunity.title,
        entities: opportunity.evidence.map(e=>e.authorId??"").filter(Boolean),
        authors: opportunity.evidence.map(e=>e.authorId??"").filter(Boolean),
        intent: opportunity.action,
        window: opportunity.metadata.last_seen_at ? String(opportunity.metadata.last_seen_at).slice(0,13) : now.slice(0,13),
      })
      const freshness = freshnessScore(opportunity.metadata.last_seen_at ? String(opportunity.metadata.last_seen_at) : undefined)

      const candidates = ACTIONS.map(action => ({
        id: `${fingerprint}:${action}`,
        opportunityId: fingerprint,
        action,
        expectedValue: finite01(opportunity.confidence),
        evidenceStrength: finite01(opportunity.evidence.length / 5),
        confidence: finite01(opportunity.confidence),
        freshness,
        strategicAlignment: action === "relationship" && opportunity.type === "bd" ? 1 : .5,
        relationshipValue: opportunity.type === "conversation" || opportunity.type === "bd" ? .8 : .3,
        historicalSuccess: learning.get(action) ?? .5,
        executionCost: action === "post" || action === "reply" ? .4 : .1,
        risk: action === "post" || action === "reply" ? .6 : .2,
        uncertainty: 1 - finite01(opportunity.confidence),
        duplicatePenalty: 0,
        score: 0,
      })).map(c => ({...c,score:scoreDecision(c)}))

      const ranked = rankDecisionCandidates(candidates)
      const top = ranked[0]
      if (!top) continue

      const { data: opp, error: oppError } = await supabase.from("ashqe_opportunities").upsert({
        user_id:userId,fingerprint,type:opportunity.type,topic:opportunity.title,intent:opportunity.action,
        title:opportunity.title,why_now:opportunity.whyNow,confidence:finite01(opportunity.confidence),
        urgency:Math.max(0,Math.min(10,opportunity.urgency)),freshness,last_seen_at:now,
        expires_at:opportunity.metadata.expires_at?String(opportunity.metadata.expires_at):null,status:"open",metadata:opportunity.metadata,
      },{onConflict:"user_id,fingerprint"}).select("id").single()
      if(oppError||!opp) continue

      const evidenceIds: string[] = []
      for (const item of opportunity.evidence) {
        try {
          evidenceIds.push(await persistEvidence(supabase, userId, item, opportunity.confidence))
        } catch {
          // The opportunity remains usable, but the missing durable evidence is visible
          // through its reduced evidence strength on the next cycle.
        }
      }

      if (evidenceIds.length) {
        await supabase.from("ashqe_opportunity_evidence").upsert(
          evidenceIds.map(evidence_id => ({ opportunity_id: opp.id, evidence_id })),
          { onConflict: "opportunity_id,evidence_id" },
        )
      }

      await supabase.from("ashqe_opportunity_state").upsert({
        user_id:userId,fingerprint,opportunity_key:opportunity.key,type:opportunity.type,title:opportunity.title,
        score:top.score,confidence:finite01(opportunity.confidence),urgency:opportunity.urgency,
        evidence_ids:evidenceIds.length ? evidenceIds : opportunity.evidence.map(e=>e.tweetId).filter(Boolean),
        metadata:{...opportunity.metadata,canonicalOpportunityId:opp.id},
        last_seen_at:now,state:"active",
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
          rationale:"Ranked from fresh evidence, calibrated historical outcomes, expected value, freshness, risk, cost and relationship value.",
          status:"candidate",
        }).select("id").single()
        if(error||!decision) continue
        decisionId=decision.id
      }
      persisted.push({opportunityId:opp.id,decisionId,action:top.action,score:top.score,historicalSuccess:top.historicalSuccess})
    }

    const { error: expiryError } = await supabase
      .from("ashqe_opportunity_state")
      .update({ state: "expired" })
      .eq("user_id", userId)
      .eq("state", "active")
      .not("expires_at", "is", null)
      .lt("expires_at", new Date().toISOString())
    if (expiryError) throw new Error("opportunity_expiry_update_failed")

    return { skipped: false, opportunities: opportunities.length, persisted }
  } catch (error) {
    cycleError = error instanceof Error ? error.message : "intelligence_cycle_failed"
    throw error
  } finally {
    const { error } = await supabase.rpc("ashqe_release_intelligence_cycle", {
      p_user_id: userId,
      p_lease_token: String(leaseToken),
      p_error: cycleError,
    })
    if (error) {
      // Preserve the primary cycle result; the next invocation will fail closed
      // until the lease naturally expires.
    }
  }
}
