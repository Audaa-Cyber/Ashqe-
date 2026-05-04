import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(_request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  // Delete X connection and style profile
  const { error: xErr } = await supabase.from("x_connections").delete().eq("user_id", user.id)
  if (xErr) return NextResponse.json({ error: xErr.message }, { status: 500 })

  await supabase.from("style_profiles").delete().eq("user_id", user.id)

  // Sign out the user
  await supabase.auth.signOut()

  return NextResponse.json({ ok: true })
}
