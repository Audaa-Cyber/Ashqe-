import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { executeMissionStep } from "@/lib/intelligence/mission-executor"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()
  const { data: recovered, error: recoveryError } = await admin.rpc("ashqe_recover_stale_mission_steps", { p_now: now, p_limit: 25 })
  if (recoveryError) return NextResponse.json({ error: "mission_watchdog_recovery_failed" }, { status: 500 })

  const { data: missions, error } = await admin
    .from("ashqe_missions")
    .select("id,user_id,status,current_step")
    .in("status", ["planned", "ready"])
    .order("created_at", { ascending: true })
    .limit(10)

  if (error) return NextResponse.json({ error: "mission_queue_read_failed" }, { status: 500 })

  const results: Array<Record<string, unknown>> = []
  for (const mission of missions ?? []) {
    try {
      if (mission.status === "planned") {
        const { data: started } = await admin
          .from("ashqe_missions")
          .update({ status: "ready" })
          .eq("id", mission.id).eq("user_id", mission.user_id).eq("status", "planned")
          .select("id")
          .maybeSingle()
        if (!started) continue
      }
      const result = await executeMissionStep(admin, {
        userId: mission.user_id,
        missionId: mission.id,
        position: Number(mission.current_step ?? 0),
      })
      results.push({ missionId: mission.id, status: "processed", result })
    } catch (err) {
      results.push({
        missionId: mission.id,
        status: "failed",
        reason: err instanceof Error ? err.message : "mission_execution_failed",
      })
    }
  }

  return NextResponse.json({ recovered: recovered ?? 0, processed: results.length, results })
}
