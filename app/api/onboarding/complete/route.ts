import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

const allowedAutonomy = new Set(["observe", "assist", "approval", "autonomous"])

type MemoryInput = {
  title: string
  content: string
  kind: string
  importance: number
  source: string
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const goalValues: unknown[] = Array.isArray(body.goals) ? body.goals : []
  const topicValues: unknown[] = Array.isArray(body.topics) ? body.topics : []
  const goals = goalValues.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 5)
  const topics = topicValues.filter((x): x is string => typeof x === "string" && x.trim().length > 0).slice(0, 20)
  const autonomy =
    typeof body.autonomy === "string" && allowedAutonomy.has(body.autonomy)
      ? body.autonomy
      : "approval"

  // Re-running onboarding should replace its own generated memories rather than
  // stacking duplicates. User-created memories are left untouched.
  const generatedTitles = ["X goal", "Radar topic", "Autonomy preference"]
  const { error: cleanupError } = await supabase
    .from("ashqe_memories")
    .delete()
    .eq("user_id", user.id)
    .eq("source", "onboarding")
    .in("title", generatedTitles)

  if (cleanupError) {
    console.error("[onboarding/complete] onboarding memory cleanup failed", cleanupError)
    return NextResponse.json({ error: "save_failed" }, { status: 500 })
  }

  const memories: MemoryInput[] = [
    ...goals.map((content) => ({ title: "X goal", content: content.trim(), kind: "goal", importance: 4, source: "onboarding" })),
    ...topics.map((content) => ({ title: "Radar topic", content: content.trim(), kind: "interest", importance: 3, source: "onboarding" })),
    { title: "Autonomy preference", content: autonomy, kind: "rule", importance: 4, source: "onboarding" },
  ]

  for (const memory of memories) {
    const { error } = await supabase.from("ashqe_memories").insert({ user_id: user.id, ...memory })
    if (error) {
      console.error("[onboarding/complete] memory save failed", error)
      return NextResponse.json({ error: "save_failed" }, { status: 500 })
    }
  }

  const { data: completed } = await supabase
    .from("ashqe_memories")
    .select("id")
    .eq("user_id", user.id)
    .eq("title", "Onboarding completed")
    .eq("source", "system")
    .limit(1)
    .maybeSingle()

  const completion = {
    content: new Date().toISOString(),
    kind: "fact",
    importance: 5,
    source: "system",
    updated_at: new Date().toISOString(),
  }

  const { error: completionError } = completed?.id
    ? await supabase.from("ashqe_memories").update(completion).eq("id", completed.id)
    : await supabase.from("ashqe_memories").insert({ user_id: user.id, title: "Onboarding completed", ...completion })

  if (completionError) {
    console.error("[onboarding/complete] completion marker save failed", completionError)
    return NextResponse.json({ error: "save_failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
