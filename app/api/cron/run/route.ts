import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const auth = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({error:"unauthorized"},{status:401})
  const admin = createAdminClient()
  const { data: jobs, error } = await admin.from("ashqe_jobs").select("*").eq("enabled", true).limit(25)
  if (error) return NextResponse.json({error:error.message},{status:500})
  const results=[]
  for (const job of jobs || []) {
    const {data:run}=await admin.from("ashqe_job_runs").insert({job_id:job.id,user_id:job.user_id,status:"running"}).select().single()
    try {
      await admin.from("ashqe_job_runs").update({status:"succeeded",summary:"Ashqe scheduled job executed",result:{instruction:job.instruction},finished_at:new Date().toISOString()}).eq("id",run?.id)
      await admin.from("ashqe_jobs").update({last_run_at:new Date().toISOString()}).eq("id",job.id)
      results.push({id:job.id,status:"succeeded"})
    } catch(e) {
      const message=e instanceof Error?e.message:"job_failed"
      await admin.from("ashqe_job_runs").update({status:"failed",error:message,finished_at:new Date().toISOString()}).eq("id",run?.id)
      results.push({id:job.id,status:"failed"})
    }
  }
  return NextResponse.json({processed:results.length,results})
}
