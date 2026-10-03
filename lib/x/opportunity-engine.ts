import type { XTweet } from "./api"
import type { XSignalCandidate } from "./signal-engine"

type EvidenceSnapshot = {
  tweet_id: string
  source_url: string
  text: string
  author_id: string | null
  created_at: string | undefined
  public_metrics: XTweet["public_metrics"]
  providers?: string[]
  query?: string
  fetched_at?: string
}

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

function snapshotFromSignal(signal: XSignalCandidate): EvidenceSnapshot | null {
  const value = signal.metadata.evidence
  if (!value || typeof value !== "object") return null
  const evidence = value as Partial<EvidenceSnapshot>
  if (!evidence.tweet_id || !evidence.text || !evidence.source_url) return null

  return {
    tweet_id: String(evidence.tweet_id),
    source_url: String(evidence.source_url),
    text: String(evidence.text),
    author_id: evidence.author_id ? String(evidence.author_id) : null,
    created_at: typeof evidence.created_at === "string" ? evidence.created_at : undefined,
    public_metrics: evidence.public_metrics ?? {
      retweet_count: 0, reply_count: 0, like_count: 0, quote_count: 0, impression_count: 0,
    },
    providers: Array.isArray(evidence.providers) ? evidence.providers.map(String) : undefined,
    query: typeof evidence.query === "string" ? evidence.query : undefined,
    fetched_at: typeof evidence.fetched_at === "string" ? evidence.fetched_at : undefined,
  }
}

/**
 * Converts evidence-backed signals into deduplicated opportunities.
 * Evidence is read from the live tweet set when available, with the
 * persisted signal snapshot as the durable fallback.
 */
export function buildOpportunities(
  signals: XSignalCandidate[],
  tweets: XTweet[] = [],
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
        .map((signal) => {
          const id = String(signal.metadata.tweet_id ?? "")
          const live = tweetById.get(id)
          if (live) {
            return {
              tweetId: live.id,
              url: "https://x.com/i/web/status/" + live.id,
              text: live.text,
              authorId: live.author_id ?? null,
              metrics: live.public_metrics,
            }
          }

          const snapshot = snapshotFromSignal(signal)
          if (!snapshot) return null
          return {
            tweetId: snapshot.tweet_id,
            url: snapshot.source_url,
            text: snapshot.text,
            authorId: snapshot.author_id,
            metrics: snapshot.public_metrics,
          }
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .slice(0, 5)

      const uniqueAuthors = new Set(evidence.map((item) => item.authorId).filter(Boolean)).size
      const latestEvidence = ordered
        .map(snapshotFromSignal)
        .filter((item): item is EvidenceSnapshot => Boolean(item))
        .map((item) => item.created_at)
        .filter((value): value is string => Boolean(value))
        .sort()
        .at(-1)

      return {
        key,
        type: opportunityType(primary),
        title: primary.title,
        whyNow: `${ordered.length} signal${ordered.length === 1 ? "" : "s"} across ${uniqueAuthors || 1} source author${uniqueAuthors === 1 ? "" : "s"}; latest evidence ${latestEvidence ? new Date(latestEvidence).toISOString() : "recently observed"}.`,
        action: primary.type === "conversation"
          ? "Review the conversation and prepare a relevant reply."
          : "Review the evidence and decide whether to turn this signal into content or research.",
        confidence: Math.round(ordered.reduce((sum, item) => sum + item.confidence, 0) / ordered.length),
        urgency: Math.max(...ordered.map((item) => item.urgency)),
        evidence,
        metadata: {
          signal_count: ordered.length,
          evidence_count: evidence.length,
          unique_authors: uniqueAuthors,
          last_seen_at: latestEvidence ?? null,
          queries: [...new Set(ordered.map((item) => String(item.metadata.query ?? "")))].filter(Boolean),
        },
      }
    })
    .sort((a, b) => (b.confidence + b.urgency * 10) - (a.confidence + a.urgency * 10))
    .slice(0, max)
}
