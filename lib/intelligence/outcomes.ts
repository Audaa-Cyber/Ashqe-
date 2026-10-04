import type { SupabaseClient } from "@supabase/supabase-js"

export type OutcomeState = "unknown" | "observed" | "verified" | "attributed" | "contradicted" | "expired"

export async function recordOutcome(
  supabase: SupabaseClient,
  input: {
    userId: string
    actionId?: string
    verificationId?: string
    state: OutcomeState
    metrics?: Record<string, unknown>
    confidence?: number
    unknownReason?: string
  },
) {
  const { data, error } = await supabase
    .from("ashqe_outcomes")
    .insert({
      user_id: input.userId,
      action_id: input.actionId ?? null,
      verification_id: input.verificationId ?? null,
      state: input.state,
      metrics: input.metrics ?? {},
      observed_at: input.state === "unknown" ? null : new Date().toISOString(),
      confidence: input.confidence ?? 0,
      unknown_reason: input.unknownReason ?? null,
    })
    .select("id")
    .single()

  if (error || !data) throw new Error("outcome_persist_failed")
  return data.id as string
}

export async function recordLearningCandidate(
  supabase: SupabaseClient,
  input: {
    userId: string
    hypothesis: string
    observation: string
    evidenceIds?: string[]
    outcomeIds?: string[]
    confidence: number
    sampleSize: number
  },
) {
  const { data, error } = await supabase
    .from("ashqe_learning")
    .insert({
      user_id: input.userId,
      hypothesis: input.hypothesis,
      observation: input.observation,
      evidence: (input.evidenceIds ?? []).map((id) => ({ id })),
      supporting_outcomes: (input.outcomeIds ?? []).map((id) => ({ id })),
      confidence: input.confidence,
      sample_size: input.sampleSize,
      status: "candidate",
    })
    .select("id")
    .single()

  if (error || !data) throw new Error("learning_candidate_persist_failed")
  return data.id as string
}
