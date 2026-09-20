import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const { data, error } = await supabase.from("ashqe_jobs").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ jobs: data })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await request.json()
  const name = String(body.name || "").trim()
  const instruction = String(body.instruction || "").trim()
  const schedule = String(body.schedule || "0 8 * * *").trim()
  if (!name || !instruction) return NextResponse.json({ error: "name_and_instruction_required" }, { status: 400 })
  const { data, error } = await supabase.from("ashqe_jobs").insert({
    user_id: user.id, name, instruction, schedule,
    timezone: String(body.timezone || "UTC"),
    destination: String(body.destination || "app"),
    permission: String(body.permission || "suggest"),
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ job: data })
}
