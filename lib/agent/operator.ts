import type { SupabaseClient } from "@supabase/supabase-js"
import { getValidAccessToken, postReply, postTweet } from "../x/api"
import type { AgentHandler } from "./graph/workflow"
import { isOperatorAction, validateOperatorAction } from "./contracts"
import { assertAgentActionReservation } from "./persistence"

function requiredText(taskInput: Record<string, unknown>) {
  const text = typeof taskInput.text === "string" ? taskInput.text.trim() : ""
  if (!text) throw new Error("operator_text_required")
  if (text.length > 280) throw new Error("operator_text_too_long")
  return text
}

/**
 * The only built-in handler that is allowed to cross from the agent runtime
 * into an X write. The reservation is checked immediately before the network
 * side effect; callers cannot supply an access token or bypass the task policy.
 */
export function createOperatorHandler(supabase: SupabaseClient): AgentHandler {
  return async (task) => {
    if (!isOperatorAction(task)) throw new Error("not_operator_task")

    const contract = validateOperatorAction(task)
    if (!contract.allowed) throw new Error(contract.reason)

    const actionType = task.input.actionType
    if (actionType !== "post" && actionType !== "reply") {
      throw new Error("operator_action_type_required")
    }

    const text = requiredText(task.input)
    const targetId = task.resource?.targetId

    // This is intentionally adjacent to the external X request.
    await assertAgentActionReservation(supabase, task, actionType)

    const connection = await getValidAccessToken(supabase, task.userId)
    if (!connection) throw new Error("x_not_connected")

    if (actionType === "reply") {
      if (!targetId) throw new Error("operator_reply_target_required")
      const posted = await postReply(connection.access_token, text, targetId)
      return {
        taskId: task.id,
        agent: task.target,
        status: "completed",
        output: { actionType, id: posted.id, text: posted.text },
        risk: task.risk,
        createdAt: Date.now(),
      }
    }

    const posted = await postTweet(connection.access_token, text)
    return {
      taskId: task.id,
      agent: task.target,
      status: "completed",
      output: { actionType, id: posted.id, text: posted.text },
      risk: task.risk,
      createdAt: Date.now(),
    }
  }
}
