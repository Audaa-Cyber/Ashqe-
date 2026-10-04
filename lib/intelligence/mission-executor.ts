import type { SupabaseClient } from "@supabase/supabase-js"
import { generateText } from "ai"
import { getChatModel } from "@/lib/openrouter"
import { fetchRecentTweets, getValidAccessToken } from "@/lib/x/api"
import { AgentRuntime, type AgentHandlerMap, type AgentResult } from "@/lib/agent"
import { createAgentTask } from "@/lib/agent/orchestrator"
import { getAgentDefinition } from "@/lib/agent/registry"
import { claimNextMissionStep, completeMissionStep, failMissionWithRecovery, transitionMission, heartbeatMissionStep } from "./mission-runtime"

type MissionRow = {
  id: string
  user_id: string
  objective: string
  status: string
  current_step: number
  attempt: number
  authority_ceiling: unknown
  checkpoint: Record<string, unknown>
  expires_at?: string | null
}

type StepRow = {
  id: string
  mission_id: string
  position: number
  objective: string
  status: string
  required_capabilities: unknown
  attempt: number
  input: Record<string, unknown>
  output?: Record<string, unknown> | null
}

const CAPABILITY_SET = new Set([
  "research.read","memory.read","memory.write","x.read.profile","x.read.timeline",
  "x.read.post","x.write.post","x.write.reply","web.read","style.read",
  "content.generate","content.inspect","analytics.read",
])

function capabilities(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((x): x is string => typeof x === "string" && CAPABILITY_SET.has(x))
}

function risk(value: unknown): "low"|"medium"|"high"|"critical" {
  return value === "medium" || value === "high" || value === "critical" ? value : "low"
}

function actionInput(step: StepRow) {
  const input = step.input ?? {}
  const actionType = input.actionType
  if (actionType === "post" || actionType === "reply") {
    return {
      actionType,
      text: typeof input.text === "string" ? input.text : "",
      recipientOptedIn: input.recipientOptedIn === true,
      aiReplyApproved: input.aiReplyApproved === true,
      timezone: typeof input.timezone === "string" ? input.timezone : undefined,
      targetText: typeof input.targetText === "string" ? input.targetText : undefined,
    }
  }
  return input
}

function buildHandlers(supabase: SupabaseClient): AgentHandlerMap {
  const modelHandler = async (task: Parameters<NonNullable<AgentHandlerMap["content"]>>[0]) => {
    const { text } = await generateText({
      model: getChatModel(),
      system: "You are a bounded Ashqe intelligence worker. Use only supplied task context. Separate facts, inference and unknowns. Never invent evidence, identities, metrics, or completed actions. Return concise JSON.",
      prompt: JSON.stringify({ goal: task.goal, input: task.input }),
      temperature: 0.2,
    })
    let output: unknown = { raw: text }
    try { output = JSON.parse(text) } catch {}
    return { taskId: task.id, agent: task.target, status: "completed" as const, output, risk: task.risk, createdAt: Date.now() }
  }

  const research = async (task: Parameters<NonNullable<AgentHandlerMap["research"]>>[0]) => {
    const connection = await getValidAccessToken(supabase, task.userId)
    if (!connection) throw new Error("x_not_connected")
    const tweets = await fetchRecentTweets(connection.access_token, connection.x_user_id, 50)
    return {
      taskId: task.id, agent: task.target, status: "completed" as const,
      output: { tweets: tweets.slice(0, 50), observedAt: new Date().toISOString() },
      risk: task.risk, createdAt: Date.now(),
    }
  }

  return {
    research,
    orchestrator: modelHandler,
    content: modelHandler,
    analytics: modelHandler,
  }
}

export async function executeMissionStep(supabase: SupabaseClient, input: {
  userId: string
  missionId: string
  position?: number
}) {
  const { data: mission, error: missionError } = await supabase
    .from("ashqe_missions")
    .select("id,user_id,objective,status,current_step,attempt,authority_ceiling,checkpoint,expires_at")
    .eq("id", input.missionId).eq("user_id", input.userId).maybeSingle()
  if (missionError || !mission) throw new Error("mission_not_found")

  if (mission.expires_at && Date.parse(mission.expires_at) <= Date.now()) {
    await failMissionWithRecovery(supabase, { userId: input.userId, missionId: input.missionId, reason: "mission_expired" })
    throw new Error("mission_expired")
  }
  if (!["ready","running"].includes(mission.status)) throw new Error("mission_not_executable")

  const position = input.position ?? mission.current_step ?? 0
  const { data: rawStep } = await supabase
    .from("ashqe_mission_steps")
    .select("id,mission_id,position,objective,status,required_capabilities,attempt,input,output")
    .eq("mission_id", mission.id).eq("position", position).maybeSingle()
  if (!rawStep) throw new Error("mission_step_not_found")
  const step = rawStep as StepRow
  if (step.status !== "ready") throw new Error("mission_step_not_ready")

  const target = typeof step.input?.agent === "string" ? step.input.agent : ""
  const executableAgents = ["orchestrator","research","content","analytics","operator"] as const
  const definition = executableAgents.includes(target as (typeof executableAgents)[number]) ? getAgentDefinition(target as never) : null
  if (!definition) throw new Error("mission_agent_not_executable")

  const ceiling = capabilities(mission.authority_ceiling)
  const requested = capabilities(step.required_capabilities)
  if (!requested.length || requested.some(cap => !ceiling.includes(cap))) {
    await failMissionWithRecovery(supabase, { userId: input.userId, missionId: mission.id, reason: "capability outside mission authority ceiling" })
    throw new Error("mission_authority_escalation")
  }

  if (mission.status === "ready") {
    await transitionMission(supabase, { userId: input.userId, missionId: mission.id, from: "ready", to: "running", checkpoint: mission.checkpoint ?? {} })
  }
  const claimed = await claimNextMissionStep(supabase, { userId: input.userId, missionId: mission.id, position })
  const task = createAgentTask({
    userId: input.userId,
    issuer: "orchestrator",
    target: target as never,
    goal: step.objective,
    input: { ...actionInput(step), missionId: mission.id, stepId: step.id, position, missionObjective: mission.objective },
    allowedTools: requested as never[],
    resource: target === "operator" && typeof step.input?.targetId === "string"
      ? { ownerUserId: input.userId, targetId: step.input.targetId }
      : { ownerUserId: input.userId },
    risk: risk(step.input?.risk),
  })

  const checkpoint = { ...(mission.checkpoint ?? {}), taskId: task.id, claimedStepId: claimed.id, taskCreatedAt: new Date().toISOString() }
  await supabase.from("ashqe_missions").update({ checkpoint }).eq("id", mission.id).eq("user_id", input.userId)

  const runtime = new AgentRuntime({
    supabase,
    handlers: buildHandlers(supabase),
    timeoutMs: 120_000,
    maxSteps: 12,
    approve: async () => ({ approved: true }),
  })

  const heartbeat = setInterval(() => { void heartbeatMissionStep(supabase, { userId: input.userId, missionId: mission.id, stepId: claimed.id, leaseSeconds: 120 }).catch(() => undefined) }, 45_000)
  let result: AgentResult
  try {
    result = await runtime.dispatch(task)
  } finally {
    clearInterval(heartbeat)
  }
  if (result.status !== "completed") {
    await supabase.from("ashqe_mission_steps").update({ status: "failed", output: { reason: result.reason ?? "agent_failed", taskId: task.id } })
      .eq("id", claimed.id).eq("status", "running")
    await failMissionWithRecovery(supabase, { userId: input.userId, missionId: mission.id, reason: result.reason ?? "agent_failed" })
    return { missionId: mission.id, stepId: claimed.id, taskId: task.id, result }
  }

  await transitionMission(supabase, { userId: input.userId, missionId: mission.id, from: "running", to: "executing", checkpoint })
  await transitionMission(supabase, { userId: input.userId, missionId: mission.id, from: "executing", to: "verifying", checkpoint })
  const completed = await completeMissionStep(supabase, {
    userId: input.userId,
    missionId: mission.id,
    stepId: claimed.id,
    output: { taskId: task.id, result: result.output ?? null },
  })
  return { ...completed, taskId: task.id, result }
}
