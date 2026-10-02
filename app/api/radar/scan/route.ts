import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildRadarQueries } from "@/lib/x/radar-planner"
import { searchPublicTweetsAcrossProviders } from "@/lib/x/public-indexers"
import { tweetsToSignals } from "@/lib/x/signal-engine"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: memories, error } = await supabase.from("ashqe_memories").select("title,content,kind,importance")
    .eq("user_id", user.id).in("kind", ["goal","interest","project","person","rule","fact"])
    .order("importance", { ascending: false }).limit(40)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const queries = buildRadarQueries(memories ?? [])
  if (!queries.length) return NextResponse.json({ ok:true, queries:[], signals:[], count:0 })

  const inserted: unknown[] = []; const providers = new Set<string>(); const failures: Record<string,string> = {}
  for (const plan of queries) {
    try {
      const result = await searchPublicTweetsAcrossProviders(plan.query, 20)
      result.providers.forEach((p) => providers.add(p)); Object.assign(failures, result.failures)
      for (const signal of tweetsToSignals(result.tweets, plan.query)) {
        const tweet = result.tweets.find((t) => t.id === String(signal.metadata.tweet_id))
        if (!tweet) continue
        const evidence = {
          tweet_id: tweet.id, source_url: "https://x.com/i/web/status/" + tweet.id,
          text: tweet.text.trim().slice(0,4000), author_id: tweet.author_id ?? null,
          created_at: tweet.created_at ?? null, public_metrics: tweet.public_metrics ?? {},
          providers: result.providers, query: plan.query, query_source: plan.source,
          query_priority: plan.priority, fetched_at: new Date().toISOString(),
        }
        const metadata = { ...signal.metadata, evidence }
        const { data: existing } = await supabase.from("ashqe_signals").select("id").eq("user_id",user.id)
          .contains("metadata",{tweet_id:tweet.id}).limit(1).maybeSingle()
        if (existing) continue
        const { data: row, error: insertError } = await supabase.from("ashqe_signals").insert({
          user_id:user.id,type:signal.type,title:signal.title,summary:signal.summary,
          confidence:signal.confidence,urgency:signal.urgency,source_url:signal.sourceUrl,metadata,status:"new",
        }).select("id,type,title,summary,confidence,urgency,source_url,metadata,status,created_at").single()
        if (!insertError && row) inserted.push(row)
      }
    } catch (scanError) { failures[plan.source] = scanError instanceof Error ? scanError.message : String(scanError) }
  }
  return NextResponse.json({ ok:true, queries, providers:[...providers], failures, signals:inserted, count:inserted.length, generatedAt:new Date().toISOString() })
}
