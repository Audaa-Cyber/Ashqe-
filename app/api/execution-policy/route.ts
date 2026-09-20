import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = await createClient()
  const { data:{user} } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({error:"unauthorized"},{status:401})
  const {data,error}=await supabase.from("ashqe_execution_policy").select("*").eq("user_id",user.id).maybeSingle()
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({policy:data ?? {autonomous_enabled:false,autonomous_posts:false,autonomous_replies:false,max_posts_per_day:3,max_replies_per_day:5,require_reply_opt_in:true,require_ai_reply_approval:true}})
}

export async function PUT(request:Request) {
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:"unauthorized"},{status:401})
  const body=await request.json()
  const autonomous=Boolean(body.autonomous_enabled)
  const posts=autonomous && Boolean(body.autonomous_posts)
  const replies=autonomous && Boolean(body.autonomous_replies)
  const policy={
    user_id:user.id, autonomous_enabled:autonomous, autonomous_posts:posts, autonomous_replies:replies,
    max_posts_per_day:Math.min(10,Math.max(0,Number(body.max_posts_per_day ?? 3))),
    max_replies_per_day:Math.min(20,Math.max(0,Number(body.max_replies_per_day ?? 5))),
    allowed_hours_start:Math.min(23,Math.max(0,Number(body.allowed_hours_start ?? 8))),
    allowed_hours_end:Math.min(23,Math.max(0,Number(body.allowed_hours_end ?? 22))),
    require_reply_opt_in:body.require_reply_opt_in !== false,
    require_ai_reply_approval:body.require_ai_reply_approval !== false,
    updated_at:new Date().toISOString(),
  }
  const {data,error}=await supabase.from("ashqe_execution_policy").upsert(policy).select().single()
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({policy:data})
}
