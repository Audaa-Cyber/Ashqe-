import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildOpportunities } from "@/lib/x/opportunity-engine"
import type { XTweet } from "@/lib/x/api"

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data, error } = await supabase
    .from("ashqe_signals")
    .select("type,title,summary,confidence,urgency,source_url,metadata,status,created_at")
    .eq("user_id", user.id)
    .neq("status", "dismissed")
    .order("created_at", { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const signals = rows.map((row) => ({
    type: row.type,
    title: row.title,
    summary: row.summary,
    confidence: Number(row.confidence ?? 0),
    urgency: Number(row.urgency ?? 1),
    sourceUrl: row.source_url ?? "",
    metadata: row.metadata ?? {},
  }))

  const tweets: XTweet[] = rows
    .map((row) => {
      const metadata = row.metadata as Record<string, unknown>
      return {
        id: String(metadata.tweet_id ?? ""),
        text: String(row.summary ?? ""),
        created_at: typeof metadata.created_at === "string" ? metadata.created_at : undefined,
        author_id: typeof metadata.author_id === "string" ? metadata.author_id : undefined,
        public_metrics: (metadata.public_metrics as XTweet["public_metrics"]) ?? {
          retweet_count: 0, reply_count: 0, like_count: 0, quote_count: 0, impression_count: 0,
        },
      }
    })
    .filter((tweet) => tweet.id)

  return NextResponse.json({
    opportunities: buildOpportunities(signals, tweets),
    generatedAt: new Date().toISOString(),
  })
}
