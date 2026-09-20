import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const { error: xError } = await supabase.from("x_connections").delete().eq("user_id", user.id)
  if (xError) return NextResponse.json({ error: xError.message }, { status: 500 })
  const { error: styleError } = await supabase.from("style_profiles").delete().eq("user_id", user.id)
  if (styleError) console.error("[x-disconnect] style profile delete failed", styleError)

  await supabase.auth.signOut()
  return NextResponse.json({ ok: true })
}
