import { randomBytes, createHash } from "node:crypto"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
  const token=randomBytes(24).toString("base64url")
  const hash=createHash("sha256").update(token).digest("hex")
  const {error}=await supabase.from("ashqe_telegram_connections").upsert({user_id:user.id,link_token_hash:hash,chat_id:null,updated_at:new Date().toISOString()},{onConflict:"user_id"})
  if(error)return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({token,command:"/connect "+token})
}
