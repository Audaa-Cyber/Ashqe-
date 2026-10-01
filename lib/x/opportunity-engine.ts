import type { XTweet } from "@/lib/x/api"
import type { XSignalCandidate } from "@/lib/x/signal-engine"

export interface XOpportunity {
  key: string
  type: "conversation" | "trend" | "content" | "bd" | "research"
  title: string
  whyNow: string
  action: string
  confidence: number
  urgency: number
  evidence: Array<{
    tweetId: string
    url: string
    text: string
    authorId: string | null
    metrics: XTweet["public_metrics"]
  }>
  metadata: Record<string, unknown>
}

function normalizeKey(value: string) {
  return value.toLowerCase().replace(/https?:\/\/\S+/g, "").replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 10).join(" ")
}

function opportunityType(signal: XSignalCandidate): XOpportunity["type"] {
  if (signal.type === "conversation") return "conversation"
  if (signal.type === "bd") return "bd"
  if (signal.type === "research") return "research"
  if (signal.type === "content") return "content"
  return "trend"
}

/**
 * Converts evidence-backed signals into deduplicated opportunities.
 * No LLM is required for this first pass: every opportunity retains the
 * public tweet evidence that caused it to exist.
 */
export function buildOpportunities(
  signals: XSignalCandidate[],
  tweets: XTweet[],
  max = 25,
): XOpportunity[] {
  const tweetById = new Map(tweets.map((tweet) => [tweet.id, tweet]))
  const grouped = new Map<string, XSignalCandidate[]>()

  for (const signal of signals) {
    const key = `${opportunityType(signal)}:${normalizeKey(signal.title)}`
    const group = grouped.get(key) ?? []
    group.push(signal)
    grouped.set(key, group)
  }

  return [...grouped.entries()]
    .map(([key, group]) => {
      const ordered = [...group].sort((a, b) => (b.confidence + b.urgency * 10) - (a.confidence + a.urgency * 10))
      const primary = ordered[0]
      const evidence = ordered
        .map((signal) => String(signal.metadata.tweet_id ?? ""))
        .map((id) => tweetById.get(id))
        .filter((tweet): tweet is XTweet => Boolean(tweet?.id))
        .slice(0, 5)
        .map((tweet) => ({
          tweetId: tweet.id,
          url: `https://x.com/i/web/status/${tweet.id}`,
          text: tweet.text,
          authorId: tweet.author_id ?? null,
          metrics: tweet.public_metrics,
        }))

      return {
        key,
        type: opportunityType(primary),
        title: primary.title,
        whyNow: primary.summary,
        action: primary.type === "conversation"
          ? "Review the conversation and prepare a relevant reply."
          : "Review the evidence and decide whether to turn this signal into content or research.",
        confidence: Math.round(ordered.reduce((sum, item) => sum + item.confidence, 0) / ordered.length),
        urgency: Math.max(...ordered.map((item) => item.urgency)),
        evidence,
        metadata: {
          signal_count: ordered.length,
          queries: [...new Set(ordered.map((item) => String(item.metadata.query ?? "")))].filter(Boolean),
        },
      }
    })
    .sort((a, b) => (b.confidence + b.urgency * 10) - (a.confidence + a.urgency * 10))
    .slice(0, max)
}
