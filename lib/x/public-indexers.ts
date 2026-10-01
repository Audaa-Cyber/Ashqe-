import type { XTweet } from "./api"

export type PublicIndexer = "socialdata" | "twexapi" | "relayx"

export interface PublicSearchResult {
  tweets: XTweet[]
  provider: PublicIndexer
  nextCursor?: string
}

function normalizeTweet(input: any): XTweet {
  const metrics = input.public_metrics ?? {
    retweet_count: Number(input.retweet_count ?? 0),
    reply_count: Number(input.reply_count ?? 0),
    like_count: Number(input.like_count ?? input.favorite_count ?? 0),
    quote_count: Number(input.quote_count ?? 0),
    impression_count: Number(input.impression_count ?? input.views_count ?? 0),
  }
  return {
    id: String(input.id ?? input.id_str ?? input.tweet_id ?? ""),
    text: String(input.text ?? input.full_text ?? ""),
    created_at: input.created_at ?? input.tweet_created_at ?? input.created_at_datetime,
    author_id: input.author_id ?? input.user?.id_str ?? input.user?.id,
    public_metrics: {
      retweet_count: Number(metrics.retweet_count ?? 0),
      reply_count: Number(metrics.reply_count ?? 0),
      like_count: Number(metrics.like_count ?? 0),
      quote_count: Number(metrics.quote_count ?? 0),
      impression_count: Number(metrics.impression_count ?? 0),
    },
  }
}

async function readJson(res: Response, provider: string) {
  if (!res.ok) throw new Error(`${provider} failed (${res.status}): ${await res.text()}`)
  return res.json()
}

export function availablePublicIndexers(): PublicIndexer[] {
  const providers: PublicIndexer[] = []
  if (process.env.SOCIALDATA_API_KEY) providers.push("socialdata")
  if (process.env.TWEXAPI_API_KEY) providers.push("twexapi")
  if (process.env.RELAYX_API_KEY) providers.push("relayx")
  return providers
}

/**
 * Read-only public X intelligence can use independent indexers while the
 * official X OAuth API remains responsible for owned-account/private actions.
 *
 * Optional provider keys are deliberately not added to .env.example so the
 * existing environment contract is untouched. Configure them only in the
 * runtime secret store when enabling a provider.
 */
export async function searchPublicTweets(
  query: string,
  max = 20,
  options: { cursor?: string; provider?: PublicIndexer } = {},
): Promise<PublicSearchResult> {
  const configured = availablePublicIndexers()
  const preferred = options.provider ?? configured[0]
  if (!preferred) throw new Error("No public X indexer is configured")
  const providers = [preferred, ...configured.filter((p) => p !== preferred)]

  let lastError: unknown
  for (const provider of providers) {
    try {
      if (provider === "socialdata") {
        const url = new URL("https://api.socialdata.tools/twitter/search")
        url.searchParams.set("query", query)
        url.searchParams.set("type", "Latest")
        if (options.cursor) url.searchParams.set("cursor", options.cursor)
        const json = await readJson(await fetch(url, {
          headers: { Authorization: `Bearer ${process.env.SOCIALDATA_API_KEY}`, Accept: "application/json" },
          cache: "no-store",
        }), "SocialData")
        return {
          tweets: (json.tweets ?? []).slice(0, max).map(normalizeTweet),
          provider,
          nextCursor: json.next_cursor,
        }
      }

      if (provider === "twexapi") {
        const json = await readJson(await fetch("https://api.twexapi.io/twitter/advanced_search/page", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.TWEXAPI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            searchTerms: [query],
            sortBy: "Latest",
            next_cursor: options.cursor ?? "",
          }),
          cache: "no-store",
        }), "TwexAPI")
        const data = Array.isArray(json.data) ? json.data : []
        return {
          tweets: data.slice(0, max).map(normalizeTweet),
          provider,
          nextCursor: json.next_cursor,
        }
      }

      if (provider === "relayx") {
        const url = new URL("https://api.relayxapi.com/twitter/tweet/advanced_search")
        url.searchParams.set("query", query)
        url.searchParams.set("sortBy", "Latest")
        if (options.cursor) url.searchParams.set("cursor", options.cursor)
        const json = await readJson(await fetch(url, {
          headers: { "x-api-key": process.env.RELAYX_API_KEY!, Accept: "application/json" },
          cache: "no-store",
        }), "RelayX")
        const data = Array.isArray(json.data) ? json.data : (json.data?.tweets ?? [])
        return {
          tweets: data.slice(0, max).map(normalizeTweet),
          provider,
          nextCursor: json.next_cursor ?? json.data?.next_cursor,
        }
      }
    } catch (error) {
      lastError = error
      console.error(`[x-public-indexer] ${provider} failed`, error)
    }
  }

  throw lastError instanceof Error ? lastError : new Error("All configured public X indexers failed")
}
