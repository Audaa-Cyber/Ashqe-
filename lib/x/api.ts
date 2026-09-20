import type { SupabaseClient } from "@supabase/supabase-js"
import { refreshAccessToken } from "./oauth"

export interface XUser {
  id: string
  username: string
  name: string
  profile_image_url?: string
}

export interface XTweet {
  id: string
  text: string
  created_at?: string
  public_metrics?: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
    impression_count?: number
  }
}

export interface XConnection {
  user_id: string
  x_user_id: string
  x_username: string
  x_name: string | null
  x_avatar_url: string | null
  access_token: string
  refresh_token: string | null
  expires_at: string | null
  scope: string | null
}

/**
 * Returns a valid access token for the given user, refreshing it
 * automatically (and persisting the new tokens) when expired.
 */
export async function getValidAccessToken(supabase: SupabaseClient, userId: string): Promise<XConnection | null> {
  const { data, error } = await supabase.from("x_connections").select("*").eq("user_id", userId).maybeSingle()

  if (error || !data) return null
  const conn = data as XConnection

  const expiresAt = conn.expires_at ? new Date(conn.expires_at).getTime() : 0
  const now = Date.now()
  const skew = 60 * 1000 // 1 minute

  if (expiresAt - skew > now || !conn.refresh_token) {
    return conn
  }

  const clientId = process.env.X_CLIENT_ID!
  const clientSecret = process.env.X_CLIENT_SECRET

  try {
    const refreshed = await refreshAccessToken({
      clientId,
      clientSecret,
      refreshToken: conn.refresh_token,
    })

    const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

    const { error: updateError } = await supabase
      .from("x_connections")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token ?? conn.refresh_token,
        expires_at: newExpires,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)

    if (updateError) console.error("[v0] failed to persist refreshed X token", updateError)

    return {
      ...conn,
      access_token: refreshed.access_token,
      refresh_token: refreshed.refresh_token ?? conn.refresh_token,
      expires_at: newExpires,
    }
  } catch (err) {
    console.error("[v0] X token refresh failed", err)
    return conn
  }
}

export async function fetchXMe(accessToken: string): Promise<XUser> {
  const url = new URL("https://api.twitter.com/2/users/me")
  url.searchParams.set("user.fields", "profile_image_url,username,name")
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`X /users/me failed (${res.status}): ${text}`)
  }
  const json = (await res.json()) as { data: XUser }
  return json.data
}

export async function fetchRecentTweets(accessToken: string, xUserId: string, max = 50): Promise<XTweet[]> {
  const url = new URL(`https://api.twitter.com/2/users/${xUserId}/tweets`)
  url.searchParams.set("max_results", String(Math.min(Math.max(max, 5), 100)))
  url.searchParams.set("exclude", "retweets,replies")
  url.searchParams.set("tweet.fields", "text,created_at,public_metrics")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`X tweets fetch failed (${res.status}): ${text}`)
  }
  const json = (await res.json()) as { data?: XTweet[] }
  return json.data ?? []
}

export async function postTweet(accessToken: string, text: string): Promise<{ id: string; text: string }> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`X post failed (${res.status}): ${text}`)
  }
  const json = (await res.json()) as { data: { id: string; text: string } }
  return json.data
}


export async function postReply(accessToken: string, text: string, inReplyToId: string): Promise<{ id: string; text: string }> {
  const res = await fetch("https://api.twitter.com/2/tweets", {
    method: "POST",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ text, reply: { in_reply_to_tweet_id: inReplyToId } }),
  })
  if (!res.ok) throw new Error("X reply failed (" + res.status + "): " + await res.text())
  const json = await res.json() as { data: { id: string; text: string } }
  return json.data
}
