import { generateText, Output } from "ai"
import { z } from "zod"
import { getChatModel } from "./openrouter"
import type { XTweet } from "./x/api"

const StyleSchema = z.object({
  tone: z.string().describe("One short phrase describing the dominant tone, e.g. 'honest, direct, slightly sardonic'."),
  length_pref: z.string().describe("Typical post length, e.g. 'concise (1-2 sentences)' or 'medium (3-5 sentences)'."),
  rhythm: z.string().describe("How sentences flow, e.g. 'punchy openers, landing line at the end'."),
  topics: z.array(z.string()).describe("Top 3-6 recurring topic areas."),
  signature_phrases: z.array(z.string()).describe("Up to 5 distinctive words, phrasings or punctuation habits."),
  do_list: z.array(z.string()).describe("3-6 concrete dos that capture the user's style."),
  dont_list: z.array(z.string()).describe("3-6 things this writer never does (avoid these)."),
  summary: z.string().describe("2-3 sentence plain-English summary of how this person writes."),
})

export type StyleProfile = z.infer<typeof StyleSchema>

export async function analyzeStyle(tweets: XTweet[]): Promise<StyleProfile | null> {
  const corpus = tweets
    .map((t, i) => `${i + 1}. ${t.text.replace(/\s+/g, " ").trim()}`)
    .filter((line) => line.length > 5)
    .join("\n")

  if (!corpus) return null

  const { experimental_output } = await generateText({
    model: getChatModel(),
    system:
      "You are a writing-style analyst. You read a person's social posts and extract their voice so an AI can write like them. Be precise, concrete, and avoid generic platitudes.",
    prompt: `Analyze these posts and extract the author's writing style. Return strictly the requested JSON shape.\n\nPOSTS:\n${corpus}`,
    experimental_output: Output.object({ schema: StyleSchema }),
  })

  return experimental_output as StyleProfile
}

export function buildStyleSystemPrompt(args: {
  username?: string | null
  profile: Partial<StyleProfile> | null
  samples: XTweet[]
}): string {
  const { username, profile, samples } = args
  const sampleLines = samples
    .slice(0, 12)
    .map((t, i) => `${i + 1}. ${t.text.replace(/\s+/g, " ").trim()}`)
    .join("\n")

  const profileBlock = profile
    ? [
        profile.summary ? `Voice summary: ${profile.summary}` : null,
        profile.tone ? `Tone: ${profile.tone}` : null,
        profile.length_pref ? `Typical length: ${profile.length_pref}` : null,
        profile.rhythm ? `Rhythm: ${profile.rhythm}` : null,
        profile.topics?.length ? `Common topics: ${profile.topics.join(", ")}` : null,
        profile.signature_phrases?.length ? `Signature phrasings: ${profile.signature_phrases.join(" | ")}` : null,
        profile.do_list?.length ? `Always: ${profile.do_list.map((s) => `- ${s}`).join("\n")}` : null,
        profile.dont_list?.length ? `Never: ${profile.dont_list.map((s) => `- ${s}`).join("\n")}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : ""

  return `You are Ashqe, a personal writing agent for ${username ? `@${username}` : "the user"}.
Your job: when the user describes an idea, draft a short post in their voice that is ready to publish on X.

Hard rules:
- Match the user's voice profile below. Do not invent facts about them.
- Default to a single-tweet draft (under 280 characters) unless the user asks for a thread.
- Never use hashtags or emojis unless the user clearly uses them themselves.
- No corporate fluff, no "in conclusion", no AI tells.
- When you produce a draft, output the draft text directly with no preamble like "Here's your post:". Conversational replies (clarifying questions, offering options) are fine when the user is chatting, but when they ask for a post, just write it.

${profileBlock ? `VOICE PROFILE\n${profileBlock}\n` : ""}${
    sampleLines ? `\nRECENT POSTS BY THE USER (style reference, not topics to repeat):\n${sampleLines}\n` : ""
  }`
}
