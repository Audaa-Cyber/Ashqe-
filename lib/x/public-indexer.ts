export type PublicXUser = {
  id: string
  username: string
  name: string
  profile_image_url?: string
  description?: string
  followers_count?: number
  following_count?: number
}

export type PublicXTweet = {
  id: string
  text: string
  created_at?: string
  author_id?: string
  username?: string
  name?: string
  public_metrics?: {
    retweet_count?: number
    reply_count?: number
    like_count?: number
    quote_count?: number
    impression_count?: number
    bookmark_count?: number
  }
}

type FetcherEnvelope = {
  status?: number
  message?: string
  data?: unknown
}

const BASE_URL = (process.env.ASHQE_X_PUBLIC_DATA_URL || "https://twitter.fetcher.sh").replace(/\/$/, "")
const API_KEY = process.env.ASHQE_X_PUBLIC_DATA_KEY

function headers(): HeadersInit {
  return API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}
}

async function request(path: string, params?: Record<string, string>) {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(params || {})) url.searchParams.set(key, value)

  const res = await fetch(url, { headers: headers(), cache: "no-store" })
  const body = await res.text()
  let json: FetcherEnvelope | undefined
  try { json = JSON.parse(body) as FetcherEnvelope } catch {}

  if (!res.ok) {
    const detail = json?.message || body.slice(0, 500)
    throw new Error(`public_x_indexer_${res.status}: ${detail}`)
  }
  return json?.data ?? json ?? {}
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {}
}

function findArray(value: unknown, keys: string[]): unknown[] {
  if (Array.isArray(value)) return value
  const record = asRecord(value)
  for (const key of keys) {
    if (Array.isArray(record[key])) return record[key] as unknown[]
  }
  for (const nested of Object.values(record)) {
    if (nested && typeof nested === "object") {
      const found = findArray(nested, keys)
      if (found.length) return found
    }
  }
  return []
}

function mapTweet(value: unknown): PublicXTweet | null {
  const r = asRecord(value)
  const legacy = asRecord(r.legacy)
  const metrics = asRecord(r.public_metrics || legacy.public_metrics)
  const id = String(r.id ?? legacy.id ?? "")
  const text = String(r.text ?? legacy.full_text ?? legacy.text ?? "")
  if (!id || !text) return null
  const user = asRecord(r.author || r.user || r.core?.user_results?.result)
  const username = String(r.username ?? user.username ?? user.screen_name ?? "")
  const name = String(r.name ?? user.name ?? "")
  return {
    id,
    text,
    created_at: String(r.created_at ?? legacy.created_at ?? "") || undefined,
    author_id: String(r.author_id ?? user.id_str ?? user.id ?? "") || undefined,
    username: username || undefined,
    name: name || undefined,
    public_metrics: {
      retweet_count: Number(metrics.retweet_count ?? metrics.retweetCount ?? 0),
      reply_count: Number(metrics.reply_count ?? metrics.replyCount ?? 0),
      like_count: Number(metrics.like_count ?? metrics.likeCount ?? 0),
      quote_count: Number(metrics.quote_count ?? metrics.quoteCount ?? 0),
      impression_count: Number(metrics.impression_count ?? metrics.impressionCount ?? 0),
      bookmark_count: Number(metrics.bookmark_count ?? metrics.bookmarkCount ?? 0),
    },
  }
}

function mapUser(value: unknown): PublicXUser | null {
  const r = asRecord(value)
  const legacy = asRecord(r.legacy)
  const user = asRecord(r.user)
  const source = Object.keys(legacy).length ? { ...r, ...legacy } : { ...user, ...r }
  const id = String(source.id ?? source.rest_id ?? source.id_str ?? "")
  const username = String(source.username ?? source.screen_name ?? "")
  if (!id || !username) return null
  const metrics = asRecord(source.public_metrics)
  return {
    id,
    username,
    name: String(source.name ?? username),
    profile_image_url: String(source.profile_image_url ?? source.profile_image_url_https ?? "") || undefined,
    description: String(source.description ?? "") || undefined,
    followers_count: Number(metrics.followers_count ?? source.followers_count ?? 0),
    following_count: Number(metrics.following_count ?? source.following_count ?? 0),
  }
}

export async function resolvePublicXHandle(handle: string): Promise<PublicXUser> {
  const clean = handle.replace(/^@/, "").trim()
  if (!clean) throw new Error("public_x_handle_required")
  const data = await request(`/api/handle/${encodeURIComponent(clean)}`)
  const user = mapUser(data)
  if (!user) throw new Error("public_x_user_not_found")
  return user
}

export async function fetchPublicXUserTweets(userId: string, max = 100): Promise<PublicXTweet[]> {
  const data = await request(`/api/user/${encodeURIComponent(userId)}/tweets`)
  return findArray(data, ["tweets", "posts", "data", "items"])
    .map(mapTweet)
    .filter((tweet): tweet is PublicXTweet => Boolean(tweet))
    .slice(0, Math.min(Math.max(max, 1), 100))
}

export async function searchPublicXTweets(query: string, max = 30): Promise<PublicXTweet[]> {
  const data = await request("/api/search", { query, sort: "Latest" })
  return findArray(data, ["tweets", "posts", "data", "items"])
    .map(mapTweet)
    .filter((tweet): tweet is PublicXTweet => Boolean(tweet))
    .slice(0, Math.min(Math.max(max, 1), 100))
}

/**
 * Public-read boundary for Ashqe.
 *
 * OAuth remains intentionally isolated to account actions such as posting.
 * Public timelines/searches are fetched through a public-data indexer instead
 * of the official X API, so a broken X developer read tier cannot break clone,
 * radar, research, or performance ingestion.
 */
export async function fetchPublicXProfileAndTweets(handle: string, max = 100) {
  const user = await resolvePublicXHandle(handle)
  const tweets = await fetchPublicXUserTweets(user.id, max)
  return { user, tweets }
}
