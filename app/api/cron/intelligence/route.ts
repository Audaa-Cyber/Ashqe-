import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { runIntelligenceCycle } from "@/lib/intelligence/autonomous-loop"
import { executeMissionStep } from "@/lib/intelligence/mission-executor"

export const dynamic="force-dynamic"
export const maxDuration=60

export async function GET(request:Request){
  if(request.headers.get("authorization")!=="Bearer "+process.env.CRON_SECRET||!process.env.CRON_SECRET)
    return NextResponse.json({error:"unauthorized"},{status:401})

  const admin=createAdminClient()
  const recovered=await admin.rpc("ashqe_recover_stale_mission_steps",{p_now:new Date().toISOString(),p_limit:50})
  if(recovered.error)return NextResponse.json({error:"mission_watchdog_recovery_failed"},{status:500})

  const {data:signals,error:signalError}=await admin.from("ashqe_signals").select("user_id")
    .order("created_at",{ascending:false}).limit(1000)
  if(signalError)return NextResponse.json({error:"intelligence_user_scan_failed"},{status:500})

  const users=[...new Set((signals??[]).map(row=>row.user_id).filter((id):id is string=>typeof id==="string"))].slice(0,25)
  const intelligence:Array<Record<string,unknown>>=[]
  for(const userId of users){
    try{intelligence.push({userId,status:"ok",cycle:await runIntelligenceCycle(admin,userId)})}
    catch(error){intelligence.push({userId,status:"failed",reason:error instanceof Error?error.message:"intelligence_cycle_failed"})}
  }

  const {data:missions,error:missionError}=await admin.from("ashqe_missions")
    .select("id,user_id,status,current_step").in("status",["planned","ready"]).order("created_at",{ascending:true}).limit(25)
  if(missionError)return NextResponse.json({error:"mission_queue_read_failed",intelligence},{status:500})

  const execution:Array<Record<string,unknown>>=[]
  for(const mission of missions??[]){
    try{
      if(mission.status==="planned"){
        const {data:started}=await admin.from("ashqe_missions").update({status:"ready"})
          .eq("id",mission.id).eq("user_id",mission.user_id).eq("status","planned").select("id").maybeSingle()
        if(!started)continue
      }
      execution.push({missionId:mission.id,status:"processed",result:await executeMissionStep(admin,{
        userId:mission.user_id,missionId:mission.id,position:Number(mission.current_step??0)
      })})
    }catch(error){execution.push({missionId:mission.id,status:"failed",reason:error instanceof Error?error.message:"mission_execution_failed"})}
  }

  return NextResponse.json({recovered:recovered.data??0,users:users.length,intelligence,processed:execution.length,execution})
}
