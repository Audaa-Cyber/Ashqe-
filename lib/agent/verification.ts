import type { SupabaseClient } from "@supabase/supabase-js"
import { verifyXWrite, persistVerification } from "@/lib/intelligence/verification"
import { recordOutcome } from "@/lib/intelligence/outcomes"
import { settleAgentReservation } from "./persistence"
import type { AgentTask, AgentResult } from "./contracts"

export async function finalizeVerifiedXAction(
  supabase: SupabaseClient,
  task: AgentTask,
  result: AgentResult,
  actionId?: string,
) {
  if (result.status !== "completed") return { verified: false, outcomeId: null }

  const output = result.output && typeof result.output === "object" ? result.output as Record<string, unknown> : {}
  const tweetId = typeof output.id === "string" ? output.id : ""
  const text = typeof output.text === "string" ? output.text : ""
  const actionType = task.input.actionType

  if ((actionType !== "post" && actionType !== "reply") || !tweetId || !text) {
    return { verified: false, outcomeId: null }
  }

  const connection = await supabase.from("x_connections").select("x_user_id").eq("user_id", task.userId).maybeSingle()
  if (!connection.data?.x_user_id) {
    const outcomeId = await recordOutcome(supabase, {
      userId: task.userId,
      actionId,
      state: "unknown",
      confidence: 0,
      unknownReason: "x_connection_missing_during_verification",
    })
    return { verified: false, outcomeId }
  }

  const verification = await verifyXWrite(supabase, {
    userId: task.userId,
    actionId,
    expected: {
      authorId: connection.data.x_user_id,
      text,
      tweetId,
      replyToId: actionType === "reply" ? String(task.resource?.targetId ?? "") : undefined,
    },
  })

  const verificationId = await persistVerification(supabase, {
    userId: task.userId,
    actionId,
    verificationType: actionType === "reply" ? "x_reply_readback" : "x_post_readback",
    result: verification,
  })

  const outcomeId = await recordOutcome(supabase, {
    userId: task.userId,
    actionId,
    verificationId,
    state: verification.status,
    confidence: verification.confidence,
    metrics: { tweetId, actionType },
    unknownReason: verification.reason,
  })

  if (verification.status === "verified") {
    const settled = await settleAgentReservation(supabase, task, "executed")
    if (!settled) throw new Error("agent_reservation_settlement_failed")
  }

  return { verified: verification.status === "verified", outcomeId, verificationId }
}
