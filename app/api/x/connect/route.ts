import { createClient } from "@/lib/supabase/server"
import {
  buildAuthorizeUrl,
  codeChallengeFor,
  generateCodeVerifier,
  generateState,
} from "@/lib/x/oauth"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  // X OAuth doesn't require existing Supabase user
  // The callback will create one if needed

  const clientId = process.env.X_CLIENT_ID
  if (!clientId) {
    return NextResponse.json({ error: "X_CLIENT_ID is not configured" }, { status: 500 })
  }

  const origin = request.nextUrl.origin
  const redirectUri = `${origin}/api/x/callback`

  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = codeChallengeFor(codeVerifier)

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    state,
    codeChallenge,
  })

  const res = NextResponse.redirect(authorizeUrl)

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 10 * 60, // 10 minutes
  }

  res.cookies.set("x_oauth_state", state, cookieOpts)
  res.cookies.set("x_oauth_verifier", codeVerifier, cookieOpts)
  res.cookies.set("x_oauth_redirect_uri", redirectUri, cookieOpts)
  return res
}
