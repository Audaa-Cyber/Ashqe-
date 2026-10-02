import type { XTweet } from "./api"

export type PublicIndexer = "fetcher" | "fxtwitter" | "socialdata" | "twexapi" | "relayx"

export interface PublicSearchResult { tweets: XTweet[]; provider: PublicIndexer; nextCursor?: string }

const FETCH_TIMEOUT_MS = 12_000

function normalizeTweet(input: any): XTweet {
  const metrics = input.public_metrics ?? {
    retweet_count: Number(input.retweet_count ?? input.reposts ?? 0),
    reply_count: Number(input.reply_count ?? input.replies ?? 0),
    like_count: Number(input.like_count ?? input.likes ?? input.favorite_count ?? 0),
    quote_count: Number(input.quote_count ?? input.quotes ?? 0),
    impression_count: Number(input.impression_count ?? input.views ?? input.views_count ?? 0),
  }
  return {
    id: String(input.id ?? input.id_str ?? input.tweet_id ?? ""),
    text: String(input.text ?? input.full_text ?? ""),
    created_at: input.created_at ?? input.tweet_created_at ?? input.created_at_datetime,
    author_id: input.author_id ?? input.author?.id ?? input.user?.id_str ?? input.user?.id,
    public_metrics: {
      retweet_count: Number(metrics.retweet_count ?? 0),
      reply_count: Number(metrics.reply_count ?? 0),
      like_count: Number(metrics.like_count ?? 0),
      quote_count: Number(metrics.quote_count ?? 0),
      impression_count: Number(metrics.impression_count ?? 0),
    },
  }
}

export function availablePublicIndexers(): PublicIndexer[] {
  const providers: PublicIndexer[] = process.env.ASHQE_X_PUBLIC_DATA_KEY ? ["fetcher", "fxtwitter"] : ["fxtwitter"]
  if (process.env.SOCIALDATA_API_KEY) providers.push("socialdata")
  if (process.env.TWEXAPI_API_KEY) providers.push("twexapi")
  if (process.env.RELAYX_API_KEY) providers.push("relayx")
  return providers
}

async function readJson(res: Response, provider: string) {
  if (!res.ok) throw new Error(`${provider} failed (${res.status}): ${await res.text()}`)
  const json = await res.json()
  if (typeof json?.code === "number" && json.code >= 400) throw new Error(`${provider} failed (${json.code}): ${json.message ?? "upstream error"}`)
  return json
}

async function request(url: URL | string, init: RequestInit = {}) {
  return fetch(url, { ...init, signal: init.signal ?? AbortSignal.timeout(FETCH_TIMEOUT_MS), cache: "no-store" })
}

async function fetcherRequest(path: string, params: Record<string, string> = {}) {
  const url = new URL("https://twitter.fetcher.sh" + path)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  const headers: HeadersInit = { Accept: "application/json" }
  if (process.env.ASHQE_X_PUBLIC_DATA_KEY) headers.Authorization = `Bearer ${process.env.ASHQE_X_PUBLIC_DATA_KEY}`
  const envelope = await readJson(await request(url, { headers }), "Fetcher")
  return envelope?.data ?? envelope
}

async function fetcherSearch(query: string, max: number, cursor?: string): Promise<PublicSearchResult> {
  const json = await fetcherRequest("/api/search", { query, sort: "Latest", ...(cursor ? { cursor } : {}) })
  const raw = Array.isArray(json?.tweets) ? json.tweets : Array.isArray(json?.posts) ? json.posts : Array.isArray(json?.data) ? json.data : []
  return { tweets: raw.slice(0, max).map(normalizeTweet).filter((tweet) => tweet.id && tweet.text), provider: "fetcher", nextCursor: json?.cursor ?? json?.meta?.next_token }
}

async function searchFromProvider(provider: PublicIndexer, query: string, max: number, cursor?: string): Promise<PublicSearchResult> {
  if (provider === "fxtwitter") {
    const url = new URL("https://api.fxtwitter.com/2/search")
    url.searchParams.set("q", query); url.searchParams.set("feed", "latest")
    url.searchParams.set("count", String(Math.min(Math.max(max, 1), 100)))
    if (cursor) url.searchParams.set("cursor", cursor)
    const json = await readJson(await request(url, { headers: { Accept: "application/json" } }), "FxTwitter")
    const results = Array.isArray(json.results) ? json.results : []
    return { tweets: results.filter((tweet: unknown) => {
      const item = tweet as Record<string, unknown>
      return item?.type === "status" && item?.id && typeof item?.text === "string"
    }).slice(0, max).map(normalizeTweet), provider, nextCursor: json.cursor?.bottom ?? undefined }
  }

  if (provider === "socialdata") {
    const url = new URL("https://api.socialdata.tools/twitter/search")
    url.searchParams.set("query", query); url.searchParams.set("type", "Latest")
    if (cursor) url.searchParams.set("cursor", cursor)
    const json = await readJson(await request(url, { headers: { Authorization: `Bearer ${process.env.SOCIALDATA_API_KEY}`, Accept: "application/json" } }), "SocialData")
    return { tweets: (json.tweets ?? []).slice(0, max).map((tweet: unknown) => normalizeTweet(tweet)), provider, nextCursor: json.next_cursor }
  }

  if (provider === "twexapi") {
    const json = await readJson(await request("https://api.twexapi.io/twitter/advanced_search/page", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.TWEXAPI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ searchTerms: [query], sortBy: "Latest", next_cursor: cursor ?? "" }),
    }), "TwexAPI")
    const data = Array.isArray(json.data) ? json.data : []
    return { tweets: data.slice(0, max).map((tweet: unknown) => normalizeTweet(tweet)), provider, nextCursor: json.next_cursor }
  }

  const url = new URL("https://api.relayxapi.com/twitter/tweet/advanced_search")
  url.searchParams.set("query", query); url.searchParams.set("sortBy", "Latest")
  if (cursor) url.searchParams.set("cursor", cursor)
  const json = await readJson(await request(url, { headers: { "x-api-key": process.env.RELAYX_API_KEY!, Accept: "application/json" } }), "RelayX")
  const data = Array.isArray(json.data) ? json.data : (json.data?.tweets ?? [])
  return { tweets: data.slice(0, max).map((tweet: unknown) => normalizeTweet(tweet)), provider, nextCursor: json.next_cursor ?? json.data?.next_cursor }
}

/** Execute exactly one configured provider. Fanout uses this to avoid nested fallbacks. */
export async function searchPublicTweetsFromProvider(provider: PublicIndexer, query: string, max = 20, cursor?: string): Promise<PublicSearchResult> {
  if (!availablePublicIndexers().includes(provider)) throw new Error(`Public X provider is not configured: ${provider}`)
  return searchFromProvider(provider, query.trim().slice(0, 512), Math.min(Math.max(max, 1), 100), cursor)
}

/** Read with ordered fallback. Passing provider explicitly means only that provider is attempted. */
export async function searchPublicTweets(query: string, max = 20, options: { cursor?: string; provider?: PublicIndexer } = {}): Promise<PublicSearchResult> {
  const configured = availablePublicIndexers()
  const preferred = options.provider ?? configured[0]
  if (!preferred) throw new Error("No public X indexer is configured")
  const providers = options.provider ? [preferred] : [preferred, ...configured.filter((p) => p !== preferred)]
  let lastError: unknown
  for (const provider of providers) {
    try { return await searchPublicTweetsFromProvider(provider, query, max, options.cursor) }
    catch (error) { lastError = error; console.error(`[x-public-indexer] ${provider} failed`, error) }
  }
  throw lastError instanceof Error ? lastError : new Error("All configured public X indexers failed")
}

export async function searchPublicTweetsAcrossProviders(query: string, maxPerProvider = 20): Promise<{
  tweets: XTweet[]; providers: PublicIndexer[]; cursors: Record<string, string | undefined>; failures: Record<string, string>
}> {
  const providers = availablePublicIndexers()
  if (!providers.length) throw new Error("No public X indexer is configured")
  const settled = await Promise.allSettled(providers.map((provider) => searchPublicTweetsFromProvider(provider, query, maxPerProvider)))
  const tweetsById = new Map<string, XTweet>()
  const successfulProviders: PublicIndexer[] = []
  const cursors: Record<string, string | undefined> = {}
  const failures: Record<string, string> = {}
  for (let i = 0; i < settled.length; i += 1) {
    const result = settled[i]; const provider = providers[i]
    if (result.status === "rejected") {
      failures[provider] = result.reason instanceof Error ? result.reason.message : String(result.reason)
      console.error(`[x-public-indexer] fanout provider failed: ${provider}`, result.reason); continue
    }
    successfulProviders.push(provider); cursors[provider] = result.value.nextCursor
    for (const tweet of result.value.tweets) if (tweet.id) tweetsById.set(tweet.id, tweet)
  }
  if (!successfulProviders.length) throw new Error("All configured public X indexers failed")
  return { tweets: [...tweetsById.values()], providers: [...new Set(successfulProviders)], cursors, failures }
}


export async function fetchPublicTweetsFromIndexer(userId: string, max = 100): Promise<XTweet[]> {
  const count = Math.min(Math.max(max, 1), 100)
  let lastError: unknown

  try {
    const url = new URL("https://api.fxtwitter.com/2/profile/id:" + encodeURIComponent(userId) + "/statuses")
    url.searchParams.set("count", String(count))
    const json = await readJson(await request(url, { headers: { Accept: "application/json" } }), "FxTwitter")
    const raw = Array.isArray(json.results) ? json.results : []
    const tweets = raw.map((tweet: unknown) => normalizeTweet(tweet)).filter((tweet) => tweet.id && tweet.text).slice(0, count)
    if (tweets.length) return tweets
  } catch (error) {
    lastError = error
    console.error("[x-public-indexer] fxtwitter timeline failed", error)
  }

  try {
    const json = await fetcherRequest("/api/user/" + encodeURIComponent(userId) + "/tweets")
    const raw = Array.isArray(json?.tweets) ? json.tweets : Array.isArray(json?.posts) ? json.posts : Array.isArray(json?.data) ? json.data : []
    const tweets = raw.slice(0, count).map((tweet: unknown) => normalizeTweet(tweet)).filter((tweet) => tweet.id && tweet.text)
    if (tweets.length) return tweets
  } catch (error) {
    lastError = error
    console.error("[x-public-indexer] fetcher timeline failed", error)
  }

  throw lastError instanceof Error ? lastError : new Error("No public X timeline indexer returned data")
}
