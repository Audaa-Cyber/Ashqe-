import type { SupabaseClient } from "@supabase/supabase-js"

export type RelationshipSignal = {
  subjectId: string
  subjectHandle?: string
  interactionType: "conversation" | "bd" | "mention" | "reply" | "content"
  observedAt?: string
  reach?: number
  relevance?: number
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0))
}

export async function updateRelationship(
  supabase: SupabaseClient,
  userId: string,
  signal: RelationshipSignal,
) {
  if (!signal.subjectId) throw new Error("relationship_subject_required")

  const { data: existing } = await supabase.from("ashqe_relationships")
    .select("*").eq("user_id", userId).eq("subject_id", signal.subjectId).maybeSingle()

  const prior = existing ?? {
    reach_score: 0,
    relationship_score: 0,
    relevance_score: 0,
    reciprocity_score: 0,
    trajectory: 0,
    unresolved_loops: 0,
    confidence: 0,
    metadata: {},
  }

  const interactionWeight = signal.interactionType === "conversation" || signal.interactionType === "reply" ? 1 : .65
  const relevance = clamp01(signal.relevance ?? prior.relevance_score)
  const reach = clamp01(signal.reach ?? prior.reach_score)
  const reciprocal = signal.interactionType === "conversation" || signal.interactionType === "reply" ? 1 : .35
  const relationship = clamp01(
    Number(prior.relationship_score) * .72 +
    (.45 * relevance + .25 * reciprocal + .20 * reach + .10 * interactionWeight) * .28,
  )
  const trajectory = Math.max(-1, Math.min(1, relationship - Number(prior.relationship_score)))
  const confidence = clamp01(Number(prior.confidence) * .75 + .25)
  const unresolvedLoops = signal.interactionType === "conversation" || signal.interactionType === "reply"
    ? Math.max(0, Number(prior.unresolved_loops) || 0)
    : Math.max(0, Number(prior.unresolved_loops) || 0)

  const { data, error } = await supabase.from("ashqe_relationships").upsert({
    user_id: userId,
    subject_id: signal.subjectId,
    subject_handle: signal.subjectHandle ?? existing?.subject_handle ?? null,
    reach_score: reach,
    relationship_score: relationship,
    relevance_score: relevance,
    reciprocity_score: reciprocal,
    trajectory,
    unresolved_loops: unresolvedLoops,
    confidence,
    last_interaction_at: signal.observedAt ?? new Date().toISOString(),
    evidence: [{
      type: signal.interactionType,
      observedAt: signal.observedAt ?? new Date().toISOString(),
      reach,
      relevance,
    }],
    metadata: {
      ...(existing?.metadata ?? {}),
      lastSignal: signal.interactionType,
    },
  }, { onConflict: "user_id,subject_id" }).select("*").single()

  if (error || !data) throw new Error("relationship_update_failed")
  return data
}

export async function decayRelationships(
  supabase: SupabaseClient,
  userId: string,
  maxAgeDays = 30,
) {
  const cutoff = new Date(Date.now() - Math.max(1, maxAgeDays) * 86400000).toISOString()
  const { data: stale } = await supabase.from("ashqe_relationships")
    .select("id,relationship_score,trajectory")
    .eq("user_id", userId)
    .lt("last_interaction_at", cutoff)
    .limit(500)

  for (const row of stale ?? []) {
    await supabase.from("ashqe_relationships").update({
      relationship_score: clamp01(Number(row.relationship_score) * .97),
      trajectory: Math.max(-1, Number(row.trajectory) * .9),
      confidence: clamp01(Number(row.confidence ?? .5) * .98),
    }).eq("id", row.id).eq("user_id", userId)
  }

  return { decayed: stale?.length ?? 0 }
}
