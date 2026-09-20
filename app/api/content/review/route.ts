import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { scoreAiLikeness } from "@/lib/ashqe-agent"
import { getChatModel } from "@/lib/openrouter"
import { generateText } from "ai"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await request.json()
  const text = String(body.text || "").trim()
  if (!text) return NextResponse.json({ error: "text_required" }, { status: 400 })

  const heuristic = scoreAiLikeness(text)
  let result = heuristic
  if (process.env.OPENROUTER_API_KEY) {
    try {
      const { text: modelText } = await generateText({
        model: getChatModel(),
        prompt: "Evaluate this X post as an authenticity editor. This is not a detector and must not claim certainty. Return JSON with score (0-100 likelihood of sounding generic/AI-like), flags (short strings), recommendation (keep/review/rewrite), and rewrite (a more natural version under 280 chars). Avoid penalizing concise writing merely for being concise. POST:\n" + text,
        temperature: 0.1,
      })
      const parsed = JSON.parse(modelText) as {score:number;flags:string[];recommendation:"keep"|"review"|"rewrite";rewrite?:string}
      if (typeof parsed.score==="number" && Array.isArray(parsed.flags)) result = {score:Math.round(Math.max(0,Math.min(100,parsed.score))),flags:parsed.flags.slice(0,8),recommendation:parsed.recommendation, rewrite:parsed.rewrite}
    } catch {}
  }

  const { error } = await supabase.from("ashqe_content_reviews").insert({
    user_id: user.id, content_type: String(body.contentType || "post"), source_text: text,
    ai_likeness: result.score, quality_score: Math.max(0, 100 - result.score),
    authenticity_flags: result.flags, recommendation: result.recommendation,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(result)
}
