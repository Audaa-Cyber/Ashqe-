import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getValidAccessToken, postTweet, postReply } from "@/lib/x/api"
import { authorizeAutonomousAction } from "@/lib/execution-policy"
import { getChatModel } from "@/lib/openrouter"
import { generateText } from "ai"

export const dynamic = "force-dynamic"
export const maxDuration = 60

function cronFieldMatches(field: string, value: number) {
  if (field === "*" || field === "") return true
  return field.split(",").some((part) => {
    if (part.includes("/")) {
      const [base, stepText] = part.split("/")
      const step = Number(stepText)
      if (!step) return false
      const start = base === "*" ? 0 : Number(base)
      return value >= start && (value - start) % step === 0
    }
    if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number)
      return value >= a && value <= b
    }
    return Number(part) === value
  })
}

function due(schedule: string, lastRun: string | null, timezone: string) {
  const parts = schedule.trim().split(/\s+/)
  if (parts.length !== 5) return true
  const now = new Date()
  if (lastRun && Date.now() - new Date(lastRun).getTime() < 10 * 60 * 1000) return false

  const partsLocal = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour12: false,
    minute: "2-digit",
    hour: "2-digit",
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  }).formatToParts(now)

  const value = (type: string) => Number(partsLocal.find((x) => x.type === type)?.value || 0)
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(
    partsLocal.find((x) => x.type === "weekday")?.value || "Sun",
  )

  return (
    cronFieldMatches(parts[0], value("minute")) &&
    cronFieldMatches(parts[1], value("hour") % 24) &&
    cronFieldMatches(parts[2], value("day")) &&
    cronFieldMatches(parts[3], value("month")) &&
    cronFieldMatches(parts[4], weekday)
  )
}

async function searchWeb(query: string) {
  const key = process.env.TAVILY_API_KEY
  if (!key) return []

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: "advanced",
      max_results: 6,
      include_answer: false,
    }),
    cache: "no-store",
  })

  if (!res.ok) throw new Error("research_provider_failed")

  const json = (await res.json()) as {
    results?: Array<{ title?: string; url?: string; content?: string }>
  }

  return (json.results || [])
    .filter((x) => x.url && x.content)
    .map((x) => ({ title: x.title || x.url!, url: x.url!, content: x.content! }))
}

async function sendTelegram(chatId: string, message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return

  await fetch("https://api.telegram.org/bot" + token + "/sendMessage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  })
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization")
  if (!process.env.CRON_SECRET || auth !== "Bearer " + process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: jobs, error } = await admin.from("ashqe_jobs").select("*").eq("enabled", true).limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const results = []

  for (const job of jobs ?? []) {
    if (!due(job.schedule, job.last_run_at, job.timezone || "UTC")) continue

    const { data: run } = await admin
      .from("ashqe_job_runs")
      .insert({ job_id: job.id, user_id: job.user_id, status: "running", attempts: 1 })
      .select()
      .single()

    try {
      if (job.action_type === "research") {
        if (!process.env.OPENROUTER_API_KEY) throw new Error("openrouter_not_configured")

        const sources = await searchWeb(job.instruction)
        const evidence = sources
          .map((source, index) => "[" + String(index + 1) + "] " + source.title + "\n" + source.url + "\n" + source.content)
          .join("\n\n")

        const { text } = await generateText({
          model: getChatModel(),
          prompt:
            "Act as Ashqe research agent. Synthesize only the supplied evidence. Do not invent current facts. Instruction: " +
            job.instruction +
            "\nEvidence:\n" +
            evidence.slice(0, 24000),
          temperature: 0.2,
        })

        await admin.from("ashqe_signals").insert({
          user_id: job.user_id,
          type: "research",
          title: job.name,
          summary: text.slice(0, 2000),
          confidence: 60,
          urgency: 3,
          metadata: { job_id: job.id, instruction: job.instruction },
        })

        if (job.destination === "telegram" || job.destination === "both") {
          const { data: tg } = await admin
            .from("ashqe_telegram_connections")
            .select("chat_id")
            .eq("user_id", job.user_id)
            .maybeSingle()

          if (tg?.chat_id) await sendTelegram(tg.chat_id, "ASHQE / " + job.name + "\n\n" + text.slice(0, 3500))
        }
      } else if (job.action_type === "post" || job.action_type === "reply") {
        const authz = await authorizeAutonomousAction(admin, job.user_id, job.action_type, {
          targetId: job.config?.targetId,
          recipientOptedIn: Boolean(job.config?.recipientOptedIn),
          aiReplyApproved: Boolean(job.config?.aiReplyApproved),
        })
        if (!authz.allowed) throw new Error("blocked:" + authz.reason)

        const conn = await getValidAccessToken(admin, job.user_id)
        if (!conn) throw new Error("x_not_connected")

        const prompt =
          job.action_type === "reply"
            ? "Write one concise, natural X reply to this interaction. No generic AI praise or engagement bait. Instruction: " +
              job.instruction +
              "\nInteraction:\n" +
              String(job.config?.targetText ?? "")
            : "Write one original X post under 280 characters based on this instruction. Make it specific, human and non-templated. Instruction: " +
              job.instruction

        const { text } = await generateText({ model: getChatModel(), prompt, temperature: 0.8 })
        const clean = text.trim().slice(0, 280)

        const posted =
          job.action_type === "reply"
            ? await postReply(conn.access_token, clean, String(job.config?.targetId))
            : await postTweet(conn.access_token, clean)

        await admin.from("ashqe_action_log").insert({
          user_id: job.user_id,
          action_type: job.action_type,
          target_id: job.config?.targetId ?? null,
          content: clean,
          status: "executed",
          reason: "scheduled_job",
          policy_snapshot: authz.policy,
        })

        if (job.destination === "telegram") {
          const { data: tg } = await admin
            .from("ashqe_telegram_connections")
            .select("chat_id")
            .eq("user_id", job.user_id)
            .maybeSingle()

          if (tg?.chat_id) {
            await sendTelegram(
              tg.chat_id,
              "ASHQE executed " +
                job.action_type +
                ":\n" +
                clean +
                "\nhttps://x.com/" +
                conn.x_username +
                "/status/" +
                posted.id,
            )
          }
        }
      }

      await admin
        .from("ashqe_job_runs")
        .update({ status: "succeeded", summary: "Job executed", finished_at: new Date().toISOString() })
        .eq("id", run?.id)

      await admin.from("ashqe_jobs").update({ last_run_at: new Date().toISOString() }).eq("id", job.id)
      results.push({ id: job.id, status: "succeeded" })
    } catch (error) {
      const message = error instanceof Error ? error.message : "job_failed"
      await admin
        .from("ashqe_job_runs")
        .update({ status: "failed", error: message, finished_at: new Date().toISOString() })
        .eq("id", run?.id)

      results.push({ id: job.id, status: "failed", error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
