import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { planMission } from "@/lib/intelligence/core"

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const goal = typeof body.goal === "string" ? body.goal.trim() : ""
  if (!goal || goal.length > 4000) {
    return NextResponse.json({ error: "goal_required" }, { status: 400 })
  }

  const write = Boolean(body.write)
  const plan = planMission(goal, { write })

  const { data: mission, error: missionError } = await supabase
    .from("ashqe_missions")
    .insert({
      user_id: user.id,
      objective: plan.goal,
      status: "planned",
      authority_ceiling: write ? ["x.write.post", "x.write.reply"] : [],
      checkpoint: { approvalBoundary: plan.approvalBoundary },
    })
    .select("id,objective,status,current_step,authority_ceiling,created_at")
    .single()

  if (missionError || !mission) {
    return NextResponse.json({ error: missionError?.message ?? "mission_create_failed" }, { status: 500 })
  }

  const steps = plan.steps.map((step, position) => ({
    mission_id: mission.id,
    position,
    objective: step.goal,
    status: position === 0 ? "ready" : "pending",
    required_capabilities: step.agent === "operator"
      ? (step.id === "execute" ? ["x.write.post", "x.write.reply"] : [])
      : [],
    input: {
      planStepId: step.id,
      agent: step.agent,
      dependsOn: step.dependsOn,
      risk: step.risk,
      requiresApproval: step.requiresApproval,
    },
  }))

  const { error: stepsError } = await supabase.from("ashqe_mission_steps").insert(steps)
  if (stepsError) {
    await supabase.from("ashqe_missions").update({
      status: "failed",
      failure_class: "invalid_plan",
      recovery_strategy: "mission_step_persistence_failed",
      checkpoint: { approvalBoundary: plan.approvalBoundary, error: stepsError.message },
    }).eq("id", mission.id).eq("user_id", user.id)

    return NextResponse.json({ error: "mission_steps_create_failed", missionId: mission.id }, { status: 500 })
  }

  return NextResponse.json({
    mission: {
      ...plan,
      id: mission.id,
      status: mission.status,
      persisted: true,
    },
  })
}
