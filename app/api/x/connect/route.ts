import { buildAuthorizeUrl, codeChallengeFor, generateCodeVerifier, generateState } from "@/lib/x/oauth"
import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const clientId = process.env.X_CLIENT_ID
  if (!clientId) return NextResponse.json({ error: "X_CLIENT_ID is not configured" }, { status: 500 })

  const redirectUri = process.env.X_REDIRECT_URI ?? (request.nextUrl.origin + "/api/x/callback")
  const state = generateState()
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = codeChallengeFor(codeVerifier)
  const authorizeUrl = buildAuthorizeUrl({ clientId, redirectUri, state, codeChallenge })

  const res = NextResponse.redirect(authorizeUrl)
  const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 600 }
  res.cookies.set("x_oauth_state", state, options)
  res.cookies.set("x_oauth_verifier", codeVerifier, options)
  res.cookies.set("x_oauth_redirect_uri", redirectUri, options)
  return res
}
