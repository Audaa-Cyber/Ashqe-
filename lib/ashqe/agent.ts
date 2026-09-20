import { z } from "zod"

const Output = z.object({
  title: z.string(),
  summary: z.string(),
  actions: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(100).default(60),
})

export async function runAshqeAgent(input: {
  instruction: string
  context?: string
}) {
  const apiKey = process.env.AI_API_KEY
  const baseUrl = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "")
  const model = process.env.AI_MODEL || "gpt-4o-mini"

  if (!apiKey) {
    return {
      title: "Ashqe demo mode",
      summary: "Connect an AI provider with AI_API_KEY to enable live agent reasoning.",
      actions: ["Add AI_API_KEY, AI_BASE_URL and AI_MODEL to the deployment environment."],
      confidence: 0,
    }
  }

  const system = [
    "You are Ashqe, a personal X intelligence and execution agent.",
    "Prioritize useful signal over activity. Never invent sources, facts, metrics or relationships.",
    "When asked to write, avoid generic AI phrasing, empty praise, canned hooks and repetitive structure.",
    "Return strict JSON with title, summary, actions and confidence.",
  ].join("\n")

  const res = await fetch(baseUrl + "/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${input.instruction}\n\nContext:\n${input.context || "none"}` },
        ],
      response_format: { type: "json_object" },
    }),
  })
  if (!res.ok) throw new Error(`AI provider failed: ${res.status}`)
  const json = await res.json()
  const content = json.choices?.[0]?.message?.content
  if (!content) throw new Error("AI provider returned no content")
  return Output.parse(JSON.parse(content))
}

export function scoreAiLikeness(text: string) {
  const flags: string[] = []
  const normalized = text.trim()
  if (/^(great|amazing|love this|this is huge|absolutely)/i.test(normalized)) flags.push("generic opener")
  if (/(exciting|game[- ]changer|revolutionary|incredible).*(future|space|world)/i.test(normalized)) flags.push("generic hype")
  if ((normalized.match(/!/g) || []).length >= 3) flags.push("excessive punctuation")
  if ((normalized.match(/\b(very|really|definitely|truly)\b/gi) || []).length >= 3) flags.push("intensifier stacking")
  if (/\b(in conclusion|moreover|furthermore|additionally)\b/i.test(normalized)) flags.push("template transition")
  const sentences = normalized.split(/[.!?]+/).filter(Boolean)
  const avg = sentences.length ? normalized.length / sentences.length : normalized.length
  if (sentences.length >= 3 && avg > 180) flags.push("long uniform sentences")
  const score = Math.min(100, flags.length * 18 + (normalized.length > 900 ? 10 : 0))
  return { score, flags, recommendation: score >= 54 ? "rewrite" : score >= 30 ? "review" : "keep" as const }
}
