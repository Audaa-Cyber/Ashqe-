import { createClient } from "@/lib/supabase/server"
import { fetchRecentTweets, fetchXMe } from "@/lib/x/api"
import { exchangeCodeForToken } from "@/lib/x/oauth"
import { analyzeStyle } from "@/lib/style-analyzer"
import { type NextRequest, NextResponse } from "next/server"

export const maxDuration = 60

function errRedirect(request: NextRequest, msg: string) {
  const url = new URL("/", request.url)
  url.searchParams.set("error", msg)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()

  const code = request.nextUrl.searchParams.get("code")
  const stateParam = request.nextUrl.searchParams.get("state")
  const errorParam = request.nextUrl.searchParams.get("error")
  if (errorParam) return errRedirect(request, errorParam)
  if (!code || !stateParam) return errRedirect(request, "missing_code_or_state")

  const stateCookie = request.cookies.get("x_oauth_state")?.value
  const verifier = request.cookies.get("x_oauth_verifier")?.value
  const redirectUri = request.cookies.get("x_oauth_redirect_uri")?.value
  if (!stateCookie || !verifier || !redirectUri) return errRedirect(request, "missing_oauth_cookies")
  if (stateCookie !== stateParam) return errRedirect(request, "state_mismatch")

  const clientId = process.env.X_CLIENT_ID
  const clientSecret = process.env.X_CLIENT_SECRET
  if (!clientId) return errRedirect(request, "missing_x_client_id")

  let tokens
  try {
    tokens = await exchangeCodeForToken({
      clientId,
      clientSecret,
      code,
      redirectUri,
      codeVerifier: verifier,
    })
  } catch (e) {
    console.error("[v0] X token exchange failed", e)
    return errRedirect(request, "token_exchange_failed")
  }

  let me
  try {
    me = await fetchXMe(tokens.access_token)
  } catch (e) {
    console.error("[v0] X /users/me failed", e)
    return errRedirect(request, "users_me_failed")
  }

  let tweets: Awaited<ReturnType<typeof fetchRecentTweets>> = []
  try {
    tweets = await fetchRecentTweets(tokens.access_token, me.id, 50)
  } catch (e) {
    console.error("[v0] X recent tweets failed", e)
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const cleanTweets = tweets.map((t) => ({
    id: t.id,
    text: t.text,
    created_at: t.created_at ?? null,
    public_metrics: t.public_metrics ?? null,
  }))

  // Get or create Supabase user
  // For X-only auth, we create a user with email = x_username@x.local
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let userId: string
  if (user) {
    // Already authenticated, use existing user
    userId = user.id
  } else {
    // Not authenticated — create a new Supabase user with X
    // Use a special email format to mark this as X-only auth
    const email = `x_${me.id}@x.local`
    const password = require("crypto").randomBytes(32).toString("hex")

    const { data: newUser, error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          x_username: me.username,
          x_user_id: me.id,
          x_authenticated: true,
        },
      },
    })

    if (signUpErr || !newUser.user) {
      console.error("[v0] Failed to create Supabase user from X auth", signUpErr)
      return errRedirect(request, "db_upsert_failed")
    }

    userId = newUser.user.id

    // Immediately verify the email since X auth is trusted
    // We need to get a session first
    const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (signInErr || !signInData.session) {
      console.error("[v0] Failed to sign in new X user", signInErr)
      return errRedirect(request, "db_upsert_failed")
    }

    // Session is established; user is verified by X OAuth
  }

  // Upsert X connection
  const { error: upsertErr } = await supabase.from("x_connections").upsert(
    {
      user_id: userId,
      x_user_id: me.id,
      x_username: me.username,
      x_name: me.name ?? null,
      x_avatar_url: me.profile_image_url ?? null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      expires_at: expiresAt,
      scope: tokens.scope ?? null,
      recent_posts: cleanTweets,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  if (upsertErr) {
    console.error("[v0] failed to upsert x_connections", upsertErr)
    return errRedirect(request, "db_upsert_failed")
  }

  // Build style profile
  if (tweets.length > 0) {
    try {
      const profile = await analyzeStyle(tweets)
      if (profile) {
        await supabase.from("style_profiles").upsert(
          {
            user_id: userId,
            tone: profile.tone,
            length_pref: profile.length_pref,
            rhythm: profile.rhythm,
            topics: profile.topics,
            signature_phrases: profile.signature_phrases,
            do_list: profile.do_list,
            dont_list: profile.dont_list,
            summary: profile.summary,
            sample_posts: cleanTweets.slice(0, 12),
            posts_analyzed: cleanTweets.length,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
      }
    } catch (e) {
      console.error("[v0] style analysis failed", e)
    }
  }

  const res = NextResponse.redirect(new URL("/dashboard", request.url))
  // Clear OAuth cookies
  for (const name of ["x_oauth_state", "x_oauth_verifier", "x_oauth_redirect_uri"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 })
  }
  return res
}
