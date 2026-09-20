"use client"

import Link from "next/link"
import { useState } from "react"

interface Props {
  user: { email: string }
  connection: { username: string; name: string | null; avatarUrl: string | null }
}

export default function DashboardHeader({ user, connection }: Props) {
  const [open, setOpen] = useState(false)
  const initial = (connection.name?.[0] ?? user.email[0] ?? "A").toUpperCase()

  return (
    <header className="border-b border-border/60 sticky top-0 bg-background/95 backdrop-blur-md z-50">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xl font-bold tracking-tight">
            Ashqe
          </Link>
          <Link href="/billing" className="hidden sm:inline text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary transition-colors">Billing</Link>
          <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-secondary text-foreground font-medium">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`https://x.com/${connection.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border hover:bg-secondary/70 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-foreground" aria-hidden />
            <span className="text-xs font-medium">@{connection.username}</span>
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="w-9 h-9 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-sm overflow-hidden focus:outline-none focus:ring-2 focus:ring-foreground"
              aria-label="Account menu"
            >
              {connection.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={connection.avatarUrl} alt={connection.username} className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </button>
            {open && (
              <div className="absolute right-0 mt-2 w-56 rounded-lg border border-border bg-background shadow-lg p-2 text-sm">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="font-medium truncate">{user.email}</p>
                </div>
                <Link href="/api/privacy/export" className="block px-3 py-2 rounded hover:bg-secondary">Export data</Link>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await fetch("/api/x/disconnect", { method: "POST" })
                    if (res.ok) {
                      window.location.href = "/"
                    }
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-secondary text-destructive"
                >
                  Sign out
                </button>
                <button type="button" onClick={async()=>{if(window.prompt("Type DELETE MY ACCOUNT to permanently delete your Ashqe account and data.")!=="DELETE MY ACCOUNT")return;const r=await fetch("/api/privacy/delete",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({confirmation:"DELETE MY ACCOUNT"})});if(r.ok)window.location.href="/";}} className="w-full text-left px-3 py-2 rounded hover:bg-red-500/10 text-red-300">Delete account</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
