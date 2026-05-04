import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json({
    env: process.env.NODE_ENV,
    x_client_id_set: !!process.env.X_CLIENT_ID,
    x_client_id_preview: process.env.X_CLIENT_ID?.substring(0, 10) ?? null,
    x_client_secret_set: !!process.env.X_CLIENT_SECRET,
    supabase_url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabase_url_preview: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) ?? null,
    supabase_anon_key_set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    openrouter_set: !!process.env.OPENROUTER_API_KEY,
  })
}
