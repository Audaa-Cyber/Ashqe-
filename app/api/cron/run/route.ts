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
  if (parts.length !== 5) return false
  // Vercel Hobby invokes this endpoint at most once per day. We therefore
  // preserve calendar constraints and enforce a once-per-day execution gate,
  // rather than pretending we can provide minute-level scheduling.
  if (lastRun && Date.now() - new Date(lastRun).getTime() < 20 * 60 * 60 * 1000) return false

  const local = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone || "UTC",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    weekday: "short",
  }).formatToParts(new Date())
  const value = (type: string) => Number(local.find((x) => x.type === type)?.value || 0)
  const weekday = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(local.find((x) => x.type === "weekday")?.value || "Sun")

  return (
    cronFieldMatches(parts[2], value("day")) &&
    cronFieldMatches(parts[3], value("month")) &&
    cronFieldMatches(parts[4], weekday)
  )
}
