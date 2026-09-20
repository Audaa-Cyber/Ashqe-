import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(request:Request){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:"unauthorized"},{status:401})
  const type=new URL(request.url).searchParams.get("type")
  let q=supabase.from("ashqe_signals").select("id,type,title,summary,confidence,urgency,source_url,metadata,status,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50)
  if(type) q=q.eq("type",type)
  const {data,error}=await q
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({signals:data ?? []})
}
