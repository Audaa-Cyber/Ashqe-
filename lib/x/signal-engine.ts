import type { XTweet } from "@/lib/x/api"

export interface XSignalCandidate {
  type: "trend" | "conversation" | "content" | "bd" | "research" | "insight"
  title: string
  summary: string
  confidence: number
  urgency: number
  sourceUrl: string
  metadata: Record<string, unknown>
}

export function scoreTweet(tweet: XTweet): { confidence: number; urgency: number } {
  const m = tweet.public_metrics ?? { retweet_count: 0, reply_count: 0, like_count: 0, quote_count: 0, impression_count: 0 }
  const engagement = m.like_count + m.reply_count * 2 + m.retweet_count * 3 + m.quote_count * 4
  const velocity = Math.log10(engagement + 1)
  return {
    confidence: Math.min(99, Math.round(55 + velocity * 12)),
    urgency: Math.max(1, Math.min(5, Math.round(1 + velocity))),
  }
}

export function tweetsToSignals(tweets: XTweet[], query: string): XSignalCandidate[] {
  return tweets
    .filter((tweet) => tweet.id && tweet.text.trim())
    .map((tweet) => {
      const score = scoreTweet(tweet)
      const title = tweet.text.replace(/\s+/g, " ").trim().slice(0, 96)
      return {
        type: tweet.public_metrics?.reply_count && tweet.public_metrics.reply_count > tweet.public_metrics.like_count
          ? "conversation"
          : "trend",
        title,
        summary: `Public X signal matching “${query}”: ${tweet.text.trim().slice(0, 280)}`,
        confidence: score.confidence,
        urgency: score.urgency,
        sourceUrl: `https://x.com/i/web/status/${tweet.id}`,
        metadata: {
          tweet_id: tweet.id,
          query,
          author_id: tweet.author_id ?? null,
          created_at: tweet.created_at ?? null,
          public_metrics: tweet.public_metrics ?? {},
        },
      }
    })
}
