import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runAshqeAgent } from "@/lib/ashqe/agent"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  const body = await request.json()
  const instruction = String(body.instruction || "").trim()
  if (!instruction) return NextResponse.json({ error: "instruction_required" }, { status: 400 })
  const result = await runAshqeAgent({ instruction, context: String(body.context || "") })
  return NextResponse.json(result)
}
