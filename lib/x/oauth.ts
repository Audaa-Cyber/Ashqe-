import { randomBytes, createHash } from "node:crypto"

export const X_AUTH_URL = "https://twitter.com/i/oauth2/authorize"
export const X_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"

export const X_SCOPES = ["tweet.read", "tweet.write", "users.read", "offline.access"] as const

export function generateState(): string {
  return randomBytes(16).toString("hex")
}

export function generateCodeVerifier(): string {
  return base64UrlEncode(randomBytes(32))
}

export function codeChallengeFor(verifier: string): string {
  const hash = createHash("sha256").update(verifier).digest()
  return base64UrlEncode(hash)
}

function base64UrlEncode(buf: Buffer): string {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
}

export function buildAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  state: string
  codeChallenge: string
}): string {
  const url = new URL(X_AUTH_URL)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("client_id", params.clientId)
  url.searchParams.set("redirect_uri", params.redirectUri)
  url.searchParams.set("scope", X_SCOPES.join(" "))
  url.searchParams.set("state", params.state)
  url.searchParams.set("code_challenge", params.codeChallenge)
  url.searchParams.set("code_challenge_method", "S256")
  return url.toString()
}

export interface XTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: "bearer"
}

function authHeaderFor(clientId: string, clientSecret?: string): Record<string, string> {
  if (!clientSecret) return {}
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")
  return { Authorization: `Basic ${basic}` }
}

export async function exchangeCodeForToken(args: {
  clientId: string
  clientSecret?: string
  code: string
  redirectUri: string
  codeVerifier: string
}): Promise<XTokenResponse> {
  const body = new URLSearchParams({
    code: args.code,
    grant_type: "authorization_code",
    client_id: args.clientId,
    redirect_uri: args.redirectUri,
    code_verifier: args.codeVerifier,
  })

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeaderFor(args.clientId, args.clientSecret),
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`X token exchange failed (${res.status}): ${text}`)
  }
  return (await res.json()) as XTokenResponse
}

export async function refreshAccessToken(args: {
  clientId: string
  clientSecret?: string
  refreshToken: string
}): Promise<XTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: args.refreshToken,
    client_id: args.clientId,
  })

  const res = await fetch(X_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      ...authHeaderFor(args.clientId, args.clientSecret),
    },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`X token refresh failed (${res.status}): ${text}`)
  }
  return (await res.json()) as XTokenResponse
}
