import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { scoreAiLikeness } from "@/lib/ashqe/agent"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await request.json()
  const text = String(body.text || "").trim()
  const contentType = String(body.contentType || "post")
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 })
  const result = scoreAiLikeness(text)
  await supabase.from("ashqe_content_reviews").insert({
    user_id: user.id,
    content_type: contentType,
    source_text: text,
    ai_likeness: result.score,
    quality_score: Math.max(0, 100 - result.score),
    authenticity_flags: result.flags,
    recommendation: result.recommendation,
  })
  return NextResponse.json(result)
}
