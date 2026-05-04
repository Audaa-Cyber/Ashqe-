import { createOpenAICompatible } from "@ai-sdk/openai-compatible"

/**
 * OpenRouter is OpenAI-compatible, so we use the AI SDK's openai-compatible
 * provider with OpenRouter's base URL and API key.
 *
 * Set OPENROUTER_API_KEY in the project environment. Optionally set
 * OPENROUTER_MODEL (defaults to openai/gpt-4o-mini) and OPENROUTER_SITE_URL
 * / OPENROUTER_APP_NAME for OpenRouter's optional ranking headers.
 */
export const openrouter = createOpenAICompatible({
  name: "openrouter",
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  baseURL: "https://openrouter.ai/api/v1",
  headers: {
    ...(process.env.OPENROUTER_SITE_URL ? { "HTTP-Referer": process.env.OPENROUTER_SITE_URL } : {}),
    ...(process.env.OPENROUTER_APP_NAME ? { "X-Title": process.env.OPENROUTER_APP_NAME } : { "X-Title": "Ashqe" }),
  },
})

export const DEFAULT_OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini"

export function getChatModel(model: string = DEFAULT_OPENROUTER_MODEL) {
  return openrouter(model)
}
