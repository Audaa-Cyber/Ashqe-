import type { SupabaseClient } from "@supabase/supabase-js"
import { fetchRecentTweets, type XTweet } from "@/lib/x/api"

export type VerificationResult = {
  status: "verified" | "contradicted" | "unknown"
  confidence: number
  expected: Record<string, unknown>
  observed: Record<string, unknown>
  reason?: string
}

function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ")
}

export async function verifyXWrite(
  supabase: SupabaseClient,
  input: {
    userId: string
    actionId?: string
    expected: { authorId: string; text: string; tweetId: string; replyToId?: string }
  },
): Promise<VerificationResult> {
  const { data: connection } = await supabase
    .from("x_connections")
    .select("access_token,x_user_id")
    .eq("user_id", input.userId)
    .maybeSingle()

  if (!connection) {
    return { status: "unknown", confidence: 0, expected: input.expected, observed: {}, reason: "x_not_connected" }
  }

  const { decryptToken } = await import("@/lib/security/tokens")
  let token: string
  try { token = decryptToken(connection.access_token) } catch {
    return { status: "unknown", confidence: 0, expected: input.expected, observed: {}, reason: "x_token_unavailable" }
  }

  const url = new URL(`https://api.x.com/2/tweets/${encodeURIComponent(input.expected.tweetId)}`)
  url.searchParams.set("tweet.fields", "author_id,conversation_id,created_at,public_metrics")
  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  })

  if (response.status === 404) {
    return { status: "contradicted", confidence: 0.95, expected: input.expected, observed: {}, reason: "tweet_not_found" }
  }
  if (!response.ok) {
    return { status: "unknown", confidence: 0, expected: input.expected, observed: {}, reason: `x_readback_failed_${response.status}` }
  }

  const json = await response.json() as { data?: XTweet & { conversation_id?: string } }
  const observed = json.data
  if (!observed) {
    return { status: "unknown", confidence: 0, expected: input.expected, observed: {}, reason: "tweet_missing_from_response" }
  }

  const authorMatches = observed.author_id === input.expected.authorId
  const textMatches = normalizeText(observed.text) === normalizeText(input.expected.text)
  const idMatches = observed.id === input.expected.tweetId
  const replyMatches = !input.expected.replyToId || observed.conversation_id === input.expected.replyToId || observed.id === input.expected.replyToId

  const matched = [authorMatches, textMatches, idMatches, replyMatches].filter(Boolean).length
  const confidence = matched / 4
  const status = matched === 4 ? "verified" : matched >= 2 ? "contradicted" : "unknown"

  return {
    status,
    confidence,
    expected: input.expected,
    observed: { id: observed.id, authorId: observed.author_id, text: observed.text, conversationId: observed.conversation_id },
    reason: status === "verified" ? undefined : "x_readback_mismatch",
  }
}

export async function persistVerification(
  supabase: SupabaseClient,
  input: {
    userId: string
    actionId?: string
    verificationType: string
    result: VerificationResult
  },
) {
  const { data, error } = await supabase
    .from("ashqe_verifications")
    .insert({
      user_id: input.userId,
      action_id: input.actionId ?? null,
      verification_type: input.verificationType,
      status: input.result.status,
      expected_state: input.result.expected,
      observed_state: input.result.observed,
      confidence: input.result.confidence,
      failure_reason: input.result.reason ?? null,
      verified_at: input.result.status === "unknown" ? null : new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error || !data) throw new Error("verification_persist_failed")
  return data.id as string
}
