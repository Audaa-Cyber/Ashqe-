import { randomBytes } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { fetchRecentTweets, fetchXMe } from "@/lib/x/api"
import { exchangeCodeForToken } from "@/lib/x/oauth"
import { analyzeStyle } from "@/lib/style-analyzer"
import { type NextRequest, NextResponse } from "next/server"
import { encryptToken } from "@/lib/security/tokens"

export const maxDuration = 60
export const dynamic = "force-dynamic"

function errRedirect(request: NextRequest, msg: string) {
  console.error("[x-oauth] " + msg)
  const url = new URL("/", request.url)
  url.searchParams.set("error", msg)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const params = request.nextUrl.searchParams
  const code = params.get("code")
  const stateParam = params.get("state")
  const errorParam = params.get("error")

  if (errorParam) return errRedirect(request, errorParam)
  if (!code || !stateParam) return errRedirect(request, "missing_code_or_state")

  const stateCookie = request.cookies.get("x_oauth_state")?.value
  const verifier = request.cookies.get("x_oauth_verifier")?.value
  const redirectUri = request.cookies.get("x_oauth_redirect_uri")?.value
  if (!stateCookie || !verifier || !redirectUri) return errRedirect(request, "missing_oauth_cookies")
  if (stateCookie !== stateParam) return errRedirect(request, "state_mismatch")

  const clientId = process.env.X_CLIENT_ID
  if (!clientId) return errRedirect(request, "missing_x_client_id")

  let tokens
  try {
    tokens = await exchangeCodeForToken({ clientId, clientSecret: process.env.X_CLIENT_SECRET, code, redirectUri, codeVerifier: verifier })
  } catch (error) {
    console.error("[x-oauth] token exchange failed", error)
    return errRedirect(request, "token_exchange_failed")
  }

  let me
  try {
    me = await fetchXMe(tokens.access_token)
  } catch (error) {
    console.error("[x-oauth] users/me failed", error)
    return errRedirect(request, "users_me_failed")
  }

  let tweets: Awaited<ReturnType<typeof fetchRecentTweets>> = []
  try {
    tweets = await fetchRecentTweets(tokens.access_token, me.id, 50)
  } catch (error) {
    console.error("[x-oauth] recent posts fetch failed", error)
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const cleanTweets = tweets.map((tweet) => ({ id: tweet.id, text: tweet.text, created_at: tweet.created_at ?? null, public_metrics: tweet.public_metrics ?? null }))

  const { data: authData } = await supabase.auth.getUser()
  let userId = authData.user?.id

  if (!userId) {
    try {
      const admin = createAdminClient()
      const email = "x_" + me.id + "@auth.ashqe.local"
      const password = randomBytes(48).toString("base64url")
      const { data: existingConnection } = await admin.from("x_connections").select("user_id").eq("x_user_id", me.id).maybeSingle()

      if (existingConnection?.user_id) {
        userId = existingConnection.user_id
        const { error } = await admin.auth.admin.updateUserById(userId, { password, email_confirm: true, user_metadata: { x_username: me.username, x_user_id: me.id, x_authenticated: true } })
        if (error) throw error
      } else {
        const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { x_username: me.username, x_user_id: me.id, x_authenticated: true } })
        if (error || !data.user) throw error ?? new Error("user_creation_failed")
        userId = data.user.id
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError || !signInData.session) throw signInError ?? new Error("session_creation_failed")
    } catch (error) {
      console.error("[x-oauth] Supabase X session creation failed", error)
      return errRedirect(request, "supabase_session_failed")
    }
  }

  if (!userId) return errRedirect(request, "missing_user_id")

  const { error: upsertError } = await supabase.from("x_connections").upsert({
    user_id: userId,
    x_user_id: me.id,
    x_username: me.username,
    x_name: me.name ?? null,
    x_avatar_url: me.profile_image_url ?? null,
    access_token: encryptToken(tokens.access_token),
    refresh_token: tokens.refresh_token ? encryptToken(tokens.refresh_token) : null,
    expires_at: expiresAt,
    scope: tokens.scope ?? null,
    recent_posts: cleanTweets,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" })

  if (upsertError) return errRedirect(request, "db_upsert_failed")

  if (tweets.length > 0) {
    try {
      const profile = await analyzeStyle(tweets)
      if (profile) {
        const { error } = await supabase.from("style_profiles").upsert({
          user_id: userId, tone: profile.tone, length_pref: profile.length_pref, rhythm: profile.rhythm,
          topics: profile.topics, signature_phrases: profile.signature_phrases, do_list: profile.do_list,
          dont_list: profile.dont_list, summary: profile.summary, sample_posts: cleanTweets.slice(0, 12),
          posts_analyzed: cleanTweets.length, updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" })
        if (error) console.error("[x-oauth] style profile save failed", error)
      }
    } catch (error) {
      console.error("[x-oauth] style analysis failed", error)
    }
  }

  const res = NextResponse.redirect(new URL("/dashboard", request.url))
  for (const name of ["x_oauth_state", "x_oauth_verifier", "x_oauth_redirect_uri"]) res.cookies.set(name, "", { path: "/", maxAge: 0 })
  return res
}
