import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { searchPublicTweetsAcrossProviders } from "@/lib/x/public-indexers"
import { tweetsToSignals } from "@/lib/x/signal-engine"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const rawQueries: unknown[] = Array.isArray(body.queries) ? body.queries : []
  const queries = rawQueries
    .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
    .map((q) => q.trim().slice(0, 512))
    .slice(0, 10)

  if (!queries.length) {
    return NextResponse.json({ error: "queries_required" }, { status: 400 })
  }

  const inserted: unknown[] = []
  const providers = new Set<string>()

  for (const query of queries) {
    try {
      const result = await searchPublicTweetsAcrossProviders(query, 20)
      result.providers.forEach((provider) => providers.add(provider))
      const candidates = tweetsToSignals(result.tweets, query)

      for (const signal of candidates) {
        const tweetId = String(signal.metadata.tweet_id)
        const tweet = result.tweets.find((item) => item.id === tweetId)
        if (!tweet) continue

        const evidence = {
          tweet_id: tweet.id,
          source_url: "https://x.com/i/web/status/" + tweet.id,
          text: tweet.text.trim().slice(0, 4000),
          author_id: tweet.author_id ?? null,
          created_at: tweet.created_at ?? null,
          public_metrics: tweet.public_metrics ?? {},
          providers: result.providers,
          query,
          fetched_at: new Date().toISOString(),
        }

        const metadata = {
          ...signal.metadata,
          evidence,
        }

        const { data: existing } = await supabase
          .from("ashqe_signals")
          .select("id")
          .eq("user_id", user.id)
          .contains("metadata", { tweet_id: tweetId })
          .limit(1)
          .maybeSingle()

        if (existing) continue

        const { data, error } = await supabase
          .from("ashqe_signals")
          .insert({
            user_id: user.id,
            type: signal.type,
            title: signal.title,
            summary: signal.summary,
            confidence: signal.confidence,
            urgency: signal.urgency,
            source_url: signal.sourceUrl,
            metadata,
            status: "new",
          })
          .select("id,type,title,summary,confidence,urgency,source_url,metadata,status,created_at")
          .single()

        if (!error && data) inserted.push(data)
      }
    } catch (error) {
      console.error("[signals/ingest]", query, error)
    }
  }

  return NextResponse.json({
    ok: true,
    providers: [...providers],
    signals: inserted,
    count: inserted.length,
  })
}
