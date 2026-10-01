import { createClient } from "@/lib/supabase/server"
import { analyzeStyle } from "@/lib/style-analyzer"
import type { XTweet } from "@/lib/x/api"
import { NextResponse } from "next/server"

export const maxDuration = 60
export const dynamic = "force-dynamic"

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { data: connection, error: connectionError } = await supabase
    .from("x_connections")
    .select("x_username, x_name, recent_posts")
    .eq("user_id", user.id)
    .maybeSingle()

  if (connectionError || !connection) {
    return NextResponse.json({ error: "x_not_connected" }, { status: 400 })
  }

  const tweets = (Array.isArray(connection.recent_posts) ? connection.recent_posts : []) as XTweet[]
  if (!tweets.length) {
    return NextResponse.json({
      ok: true,
      cloned: false,
      posts_analyzed: 0,
      message: "No recent posts were available to analyze yet.",
    })
  }

  try {
    const profile = await analyzeStyle(tweets)
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
