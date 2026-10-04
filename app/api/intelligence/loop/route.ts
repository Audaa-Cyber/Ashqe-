import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runIntelligenceCycle } from "@/lib/intelligence/autonomous-loop"

export const dynamic="force-dynamic"

export async function POST(){
  const supabase=await createClient()
  const {data:{user}}=await supabase.auth.getUser()
  if(!user)return NextResponse.json({error:"unauthorized"},{status:401})
  try{return NextResponse.json(await runIntelligenceCycle(supabase,user.id))}
  catch(error){return NextResponse.json({error:error instanceof Error?error.message:"intelligence_cycle_failed"},{status:500})}
}
