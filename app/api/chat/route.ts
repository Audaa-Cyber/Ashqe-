import { createClient } from "@/lib/supabase/server"
import { getChatModel } from "@/lib/openrouter"
import { buildStyleSystemPrompt } from "@/lib/style-analyzer"
import { type UIMessage, convertToModelMessages, streamText } from "ai"
import { buildAgentContext } from "@/lib/agent/context"
import type { NextRequest } from "next/server"

export const maxDuration = 60

interface ChatRequestBody {
  messages: UIMessage[]
  sessionId?: string
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response("unauthorized", { status: 401 })

  let body: ChatRequestBody
  try {
    body = (await req.json()) as ChatRequestBody
  } catch {
    return new Response("invalid_json", { status: 400 })
  }

  const messages = body.messages ?? []
  let sessionId = body.sessionId

  // Ensure session exists and belongs to this user
  if (sessionId) {
    const { data: existing } = await supabase
      .from("chat_sessions")
      .select("id, user_id")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .maybeSingle()
    if (!existing) sessionId = undefined
  }

  if (!sessionId) {
    const firstUser = messages.find((m) => m.role === "user")
    const firstUserText = extractText(firstUser)
    const title = firstUserText ? firstUserText.slice(0, 60) : "New chat"
    const { data: created, error } = await supabase
      .from("chat_sessions")
      .insert({ user_id: user.id, title })
      .select("id")
      .single()
    if (error || !created) {
      console.error("[v0] failed to create chat session", error)
      return new Response("session_create_failed", { status: 500 })
    }
    sessionId = created.id
  }

  // Load X profile + style for system prompt
  const [{ data: conn }, { data: style }] = await Promise.all([
    supabase
      .from("x_connections")
      .select("x_username, recent_posts")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("style_profiles")
      .select("tone, length_pref, rhythm, topics, signature_phrases, do_list, dont_list, summary, sample_posts")
      .eq("user_id", user.id)
      .maybeSingle(),
  ])

  const samples = (conn?.recent_posts as { id: string; text: string }[] | null) ?? []

  const agentContext = await buildAgentContext(supabase, user.id, extractText(messages[messages.length - 1]))

  const system = buildStyleSystemPrompt({
    username: conn?.x_username ?? null,
    profile: style ?? null,
    samples,
  })

  const intelligenceSystem = system + "\n\nASHQE OPERATING CONTEXT\nUse this context as working memory, not as unquestioned truth. Distinguish evidence from inference. Prefer a concrete next move over generic advice.\n\nDURABLE MEMORY:\n" + agentContext.memory + "\n\nRECENT SIGNALS:\n" + agentContext.signals + "\n\nOPERATING LOOP: Observe → Understand → Suggest → Execute → Learn. Never claim an action was executed unless a tool/API response confirms it.\n"

  const result = streamText({
    model: getChatModel(),
    system: intelligenceSystem,
    messages: await convertToModelMessages(messages),
    abortSignal: req.signal,
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    onFinish: async ({ messages: allMessages, isAborted }) => {
      if (isAborted) return
      try {
        await persistMessages(allMessages, sessionId!, user.id)
      } catch (e) {
        console.error("[v0] failed to persist chat messages", e)
      }
    },
  })
}

function extractText(msg: UIMessage | undefined): string {
  if (!msg?.parts) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim()
}

async function persistMessages(allMessages: UIMessage[], sessionId: string, userId: string) {
  const supabase = await createClient()

  // Get existing message ids to avoid duplicates
  const { data: existing } = await supabase
    .from("chat_messages")
    .select("id")
    .eq("session_id", sessionId)
    .eq("user_id", userId)

  const existingIds = new Set((existing ?? []).map((m) => m.id))

  const toInsert = allMessages
    .filter((m) => m.id && !existingIds.has(m.id))
    .map((m) => ({
      id: m.id,
      session_id: sessionId,
      user_id: userId,
      role: m.role,
      parts: m.parts ?? [],
    }))

  if (toInsert.length > 0) {
    await supabase.from("chat_messages").insert(toInsert)
  }

  await supabase.from("chat_sessions").update({ updated_at: new Date().toISOString() }).eq("id", sessionId)
}
