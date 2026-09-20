import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user) return NextResponse.json({error:"unauthorized"},{status:401})
  const {data,error}=await supabase.from("ashqe_action_log").select("id,action_type,target_id,content,status,reason,created_at").eq("user_id",user.id).order("created_at",{ascending:false}).limit(50)
  if(error) return NextResponse.json({error:error.message},{status:500})
  return NextResponse.json({actions:data ?? []})
}
