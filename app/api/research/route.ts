import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getValidAccessToken, fetchRecentTweets } from "@/lib/x/api"
import { getChatModel } from "@/lib/openrouter"
import { generateText } from "ai"

export const maxDuration = 60

type SearchResult = { title: string; url: string; content: string }

async function searchWeb(query: string): Promise<SearchResult[]> {
  const key = process.env.TAVILY_API_KEY
  if (!key) return []
  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: key, query, search_depth: "advanced", max_results: 8, include_answer: false }),
    cache: "no-store",
  })
  if (!res.ok) throw new Error("research_provider_failed")
  const json = await res.json() as { results?: Array<{ title?: string; url?: string; content?: string }> }
  return (json.results ?? []).filter(x => x.url && x.content).map(x => ({ title: x.title ?? x.url!, url: x.url!, content: x.content! }))
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 })

  const body = await request.json() as { query?: string; niche?: string; depth?: "quick"|"deep" }
  const query = String(body.query ?? "").trim()
  if (!query) return NextResponse.json({ error: "query_required" }, { status: 400 })

  const [web, connection] = await Promise.all([searchWeb(query), getValidAccessToken(supabase, user.id)])
  let xContext: string[] = []
  if (connection) {
    try {
      const tweets = await fetchRecentTweets(connection.access_token, connection.x_user_id, 50)
      xContext = tweets.slice(0, 20).map(t => "@" + connection.x_username + ": " + t.text)
    } catch {}
  }

  const sources = web.map((s, i) => "[" + (i + 1) + "] " + s.title + "\n" + s.url + "\n" + s.content).join("\n\n")
  const context = [sources, xContext.length ? "User context from X:\n" + xContext.join("\n") : ""].filter(Boolean).join("\n\n")
  if (!context || !process.env.OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "research_provider_not_configured", message: "Configure TAVILY_API_KEY and OPENROUTER_API_KEY for live research." }, { status: 503 })
  }

  const prompt = "You are Ashqe, a personal X intelligence system. Research the user's query using only the supplied evidence. Do not invent facts or sources. Return JSON with keys: thesis, findings (array of {title,summary,importance}), opportunities, next_moves, sources (array of {title,url}). Distinguish evidence from inference. Query: " + query + "\nNiche: " + (body.niche ?? "general") + "\nEvidence:\n" + context.slice(0, 30000)
  const { text } = await generateText({ model: getChatModel(), prompt, temperature: 0.2 })
  let result: unknown = { thesis: text, findings: [], opportunities: [], next_moves: [], sources: web.map(x => ({ title: x.title, url: x.url })) }
  try { result = JSON.parse(text) } catch {}

  await supabase.from("ashqe_signals").insert({
    user_id: user.id,
    type: "research",
    title: query,
    summary: typeof result === "object" && result && "thesis" in result ? String((result as {thesis:string}).thesis) : text.slice(0, 1000),
    confidence: web.length ? 85 : 55,
    urgency: body.depth === "deep" ? 4 : 3,
    metadata: result,
    source_url: web[0]?.url ?? null,
  })
  return NextResponse.json({ result, provider: "tavily+openrouter" })
}
