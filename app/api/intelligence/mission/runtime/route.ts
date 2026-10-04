import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { transitionMission, failMissionWithRecovery, completeMissionStep, waitForMissionApproval } from "@/lib/intelligence/mission-runtime"
import { executeMissionStep } from "@/lib/intelligence/mission-executor"
import { approveDecisionAndCreateMission } from "@/lib/intelligence/decision-mission"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const missionId = typeof body.missionId === "string" ? body.missionId : ""
  const operation = typeof body.operation === "string" ? body.operation : ""
  if (operation === "approve_decision") {
    const decisionId = typeof body.decisionId === "string" ? body.decisionId : ""
    if (!decisionId) return NextResponse.json({ error: "decisionId_required" }, { status: 400 })
    try {
      const result = await approveDecisionAndCreateMission(supabase, { userId: user.id, decisionId, aiReplyApproved: body.aiReplyApproved === true })
      return NextResponse.json(result, { status: result.reused ? 200 : 201 })
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : "decision_approval_failed" }, { status: 409 })
    }
  }
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
      if (mission.status === "ready") return NextResponse.json({ mission, alreadyReady: true })
      if (mission.status !== "planned") return NextResponse.json({ error: "mission_not_startable", status: mission.status }, { status: 409 })
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: "planned", to: "ready", checkpoint: mission.checkpoint ?? {} })
      return NextResponse.json({ mission: next })
    }

    if (operation === "execute_step") {
      const position = Number.isInteger(body.position) ? body.position : Number(mission.current_step ?? 0)
      const result = await executeMissionStep(supabase, { userId: user.id, missionId, position })
      return NextResponse.json(result)
    }

    if (operation === "run_step") {
      const position = Number.isInteger(body.position) ? body.position : Number(mission.current_step ?? 0)
      const result = await executeMissionStep(supabase, { userId: user.id, missionId, position })
      return NextResponse.json(result)
    }

    if (operation === "complete_step") {
      const stepId = typeof body.stepId === "string" ? body.stepId : ""
      if (!stepId) return NextResponse.json({ error: "stepId_required" }, { status: 400 })
      const output = body.output && typeof body.output === "object" ? body.output : {}
      const result = await completeMissionStep(supabase, { userId: user.id, missionId, stepId, output, verificationId: typeof body.verificationId === "string" ? body.verificationId : undefined })
      return NextResponse.json(result)
    }

    if (operation === "request_approval") {
      const stepId = typeof body.stepId === "string" ? body.stepId : ""
      if (!stepId) return NextResponse.json({ error: "stepId_required" }, { status: 400 })
      const result = await waitForMissionApproval(supabase, { userId: user.id, missionId, stepId })
      return NextResponse.json(result)
    }

    if (operation === "pause") {
      if (mission.status === "completed" || mission.status === "cancelled") return NextResponse.json({ error: "mission_terminal" }, { status: 409 })
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: mission.status, to: "paused", checkpoint: { ...(mission.checkpoint ?? {}), pausedAt: new Date().toISOString() } })
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
      if (!["recovering", "ready", "paused"].includes(mission.status)) return NextResponse.json({ error: "mission_not_resumable", status: mission.status }, { status: 409 })
      const next = await transitionMission(supabase, { userId: user.id, missionId, from: mission.status, to: "running", checkpoint: { ...(mission.checkpoint ?? {}), resumedAt: new Date().toISOString() } })
      return NextResponse.json({ mission: next })
    }

    return NextResponse.json({ error: "unknown_operation" }, { status: 400 })
  } catch (error) {
    const reason = error instanceof Error ? error.message : "mission_runtime_error"
    return NextResponse.json({ error: reason }, { status: 409 })
  }
}
