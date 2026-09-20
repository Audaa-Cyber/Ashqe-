import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken, postTweet } from "@/lib/x/api"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  let body: { text?: string; draftId?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: "invalid_json" }, { status: 400 }) }

  let text = (body.text ?? "").trim()
  const draftId = body.draftId ?? null
  if (!text && draftId) {
    const { data: draft, error } = await supabase.from("drafts").select("id, content, user_id").eq("id", draftId).eq("user_id", user.id).maybeSingle()
    if (error || !draft) return NextResponse.json({ error: "draft_not_found" }, { status: 404 })
    text = draft.content
  }
  if (!text) return NextResponse.json({ error: "empty_text" }, { status: 400 })
  if (text.length > 280) return NextResponse.json({ error: "too_long" }, { status: 400 })

  const conn = await getValidAccessToken(supabase, user.id)
  if (!conn) return NextResponse.json({ error: "x_not_connected" }, { status: 400 })

  try {
    const posted = await postTweet(conn.access_token, text)
    if (draftId) {
      await supabase.from("drafts").update({ status: "published", x_post_id: posted.id, published_at: new Date().toISOString() }).eq("id", draftId).eq("user_id", user.id)
    } else {
      await supabase.from("drafts").insert({ user_id: user.id, content: text, status: "published", x_post_id: posted.id, published_at: new Date().toISOString() })
    }
    return NextResponse.json({ ok: true, id: posted.id, url: "https://x.com/" + conn.x_username + "/status/" + posted.id })
  } catch (error) {
    console.error("[x-api] post failed", error)
    return NextResponse.json({ error: "x_post_failed" }, { status: 502 })
  }
}
