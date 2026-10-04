import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { claimNextMissionStep, transitionMission, failMissionWithRecovery } from "@/lib/intelligence/mission-runtime"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const missionId = typeof body.missionId === "string" ? body.missionId : ""
  const operation = typeof body.operation === "string" ? body.operation : ""
  if (!missionId || !operation) return NextResponse.json({ error: "missionId_and_operation_required" }, { status: 400 })

  const { data: mission } = await supabase
    .from("ashqe_missions")
    .select("id,status,current_step,attempt,checkpoint")
    .eq("id", missionId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!mission) return NextResponse.json({ error: "mission_not_found" }, { status: 404 })

  try {
    if (operation === "start") {
      if (mission.status !== "planned" && mission.status !== "ready") return NextResponse.json({ error: "mission_not_startable", status: mission.status }, { status: 409 })
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: mission.status, to: "ready", checkpoint: mission.checkpoint ?? {} })
      return NextResponse.json({ mission: next })
    }

    if (operation === "run_step") {
      const position = Number.isInteger(body.position) ? body.position : Number(mission.current_step ?? 0)
      const step = await claimNextMissionStep(supabase, { userId: user.id, missionId, position })
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: mission.status, to: "running", checkpoint: { ...(mission.checkpoint ?? {}), claimedStepId: step.id } })
      return NextResponse.json({ mission: next, step })
    }

    if (operation === "pause") {
      if (mission.status === "completed" || mission.status === "cancelled") return NextResponse.json({ error: "mission_terminal" }, { status: 409 })
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: mission.status, to: "diagnosing", checkpoint: { ...(mission.checkpoint ?? {}), pausedAt: new Date().toISOString() } })
      return NextResponse.json({ mission: next })
    }

    if (operation === "fail") {
      const reason = typeof body.reason === "string" ? body.reason.slice(0, 1000) : "mission_failed"
      const next = await failMissionWithRecovery(supabase, { userId: user.id, missionId, reason })
      return NextResponse.json({ mission: next })
    }

    if (operation === "recover") {
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: "diagnosing", to: "recovering", checkpoint: { ...(mission.checkpoint ?? {}), recoveryAt: new Date().toISOString() } })
      return NextResponse.json({ mission: next })
    }

    if (operation === "resume") {
      if (!["recovering", "waiting_approval", "ready"].includes(mission.status)) return NextResponse.json({ error: "mission_not_resumable", status: mission.status }, { status: 409 })
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: mission.status, to: "running", checkpoint: { ...(mission.checkpoint ?? {}), resumedAt: new Date().toISOString() } })
      return NextResponse.json({ mission: next })
    }

    return NextResponse.json({ error: "unknown_operation" }, { status: 400 })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "mission_runtime_error"
    return NextResponse.json({ error: reason }, { status: 409 })
  }
}
