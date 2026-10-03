import { createClient } from "@/lib/supabase/server"
import { analyzeStyle } from "@/lib/style-analyzer"
import { fetchRecentTweets } from "@/lib/x/api"
import { NextResponse } from "next/server"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: connection, error: connectionError } = await supabase
    .from("x_connections")
    .select("x_user_id, x_username, x_name, recent_posts")
    .eq("user_id", user.id)
    .maybeSingle()

  if (connectionError || !connection) {
    return NextResponse.json({ error: "x_not_connected" }, { status: 400 })
  }

  let tweets
  try {
    tweets = await fetchRecentTweets("", connection.x_user_id, 100)
  } catch (error) {
    console.error("[onboarding/clone] X history fetch failed", error)
    return NextResponse.json({ error: "x_history_failed" }, { status: 502 })
  }

  const { error: historyWriteError } = await supabase
    .from("x_connections")
    .update({
      recent_posts: tweets.map((tweet) => ({
        id: tweet.id,
        text: tweet.text,
        created_at: tweet.created_at ?? null,
        public_metrics: tweet.public_metrics ?? null,
      })),
    })
    .eq("user_id", user.id)

  if (historyWriteError) {
    console.error("[onboarding/clone] X history persistence failed", historyWriteError)
    return NextResponse.json({ error: "history_save_failed" }, { status: 500 })
  }

  if (!tweets.length) {
    return NextResponse.json({
      ok: true,
      cloned: false,
      posts_analyzed: 0,
      message: "No recent posts were available to analyze yet.",
    })
  }

  try {
    const profile = await analyzeStyle(tweets as Parameters<typeof analyzeStyle>[0])
    if (!profile) {
      return NextResponse.json({ ok: true, cloned: false, posts_analyzed: tweets.length })
    }

    const { error } = await supabase.from("style_profiles").upsert({
      user_id: user.id,
      tone: profile.tone,
      length_pref: profile.length_pref,
      rhythm: profile.rhythm,
      topics: profile.topics,
      signature_phrases: profile.signature_phrases,
      do_list: profile.do_list,
      dont_list: profile.dont_list,
      summary: profile.summary,
      sample_posts: tweets.slice(0, 12),
      posts_analyzed: tweets.length,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" })

    if (error) throw error

    return NextResponse.json({
      ok: true,
      cloned: true,
      posts_analyzed: tweets.length,
      profile,
      username: connection.x_username,
      name: connection.x_name,
    })
  } catch (error) {
    console.error("[onboarding/clone] failed", error)
    return NextResponse.json({ error: "clone_failed" }, { status: 500 })
  }
}
