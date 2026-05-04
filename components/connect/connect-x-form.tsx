"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

const ERROR_MESSAGES: Record<string, string> = {
  state_mismatch: "Sign-in state didn't match. Please try again.",
  missing_code_or_state: "X didn't return a valid response. Please try again.",
  missing_oauth_cookies: "Your sign-in session expired. Please try again.",
  missing_x_client_id: "X is not configured for this deployment.",
  token_exchange_failed: "Couldn't exchange the X authorization code. Please try again.",
  users_me_failed: "Couldn't read your X profile.",
  db_upsert_failed: "Couldn't save your connection. Please try again.",
  access_denied: "You declined the X authorization.",
}

export default function ConnectXForm({ error, email: _email }: { error: string | null; email: string }) {
  const [submitting, setSubmitting] = useState(false)

  const message = error ? (ERROR_MESSAGES[error] ?? `Connection failed: ${error}`) : null

  const handleClick = () => {
    setSubmitting(true)
    window.location.href = "/api/x/connect"
  }

  return (
    <Card className="w-full max-w-md p-10 border border-border bg-background animate-fade-in">
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center">
            <svg className="w-8 h-8 text-background" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight text-balance">Connect your X account</h1>
          <p className="text-muted-foreground leading-relaxed">
            We&apos;ll read your last 50 posts to learn your voice. Your style profile is private and yours alone.
          </p>
        </div>

        {message && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {message}
          </div>
        )}

        <Button
          size="lg"
          disabled={submitting}
          onClick={handleClick}
          className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 text-base rounded-lg font-semibold"
        >
          {submitting ? "Redirecting to X..." : "Continue with X"}
        </Button>

        <ul className="space-y-2 text-sm text-muted-foreground">
          <li className="flex items-center gap-2">
            <Dot /> Secure OAuth 2.0 with PKCE
          </li>
          <li className="flex items-center gap-2">
            <Dot /> Reads your recent posts
          </li>
          <li className="flex items-center gap-2">
            <Dot /> Lets you publish drafts with one click
          </li>
        </ul>

        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            We never see your password. You can disconnect at any time from your dashboard.
          </p>
        </div>
      </div>
    </Card>
  )
}

function Dot() {
  return <span className="w-1.5 h-1.5 rounded-full bg-foreground" aria-hidden />
}
