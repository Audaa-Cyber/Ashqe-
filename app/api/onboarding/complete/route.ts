import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const allowedAutonomy = new Set(["observe", "assist", "approval", "autonomous"])

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const goals = Array.isArray(body.goals) ? body.goals.filter((x: unknown): x is string => typeof x === "string" && x.trim()) : []
  const topics = Array.isArray(body.topics) ? body.topics.filter((x: unknown): x is string => typeof x === "string" && x.trim()) : []
  const autonomy = typeof body.autonomy === "string" && allowedAutonomy.has(body.autonomy) ? body.autonomy : "approval"

  const memories = [
    ...goals.map((content) => ({ title: "X goal", content, kind: "goal", importance: 4, source: "onboarding" })),
    ...topics.map((content) => ({ title: "Radar topic", content, kind: "interest", importance: 3, source: "onboarding" })),
    { title: "Autonomy preference", content: autonomy, kind: "rule", importance: 4, source: "onboarding" },
    { title: "Onboarding completed", content: new Date().toISOString(), kind: "fact", importance: 5, source: "system" },
  ]

  for (const memory of memories) {
    const { error } = await supabase.from("ashqe_memories").insert({ user_id: user.id, ...memory })
    if (error) {
      console.error("[onboarding/complete] memory save failed", error)
      return NextResponse.json({ error: "save_failed" }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
