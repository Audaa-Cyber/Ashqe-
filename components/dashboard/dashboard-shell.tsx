"use client"

import { useState } from "react"
import type { UIMessage } from "ai"
import DashboardHeader from "./dashboard-header"
import ChatPanel from "./chat-panel"
import StyleProfileCard from "./style-profile-card"
import DraftsGrid, { type Draft } from "./drafts-grid"
import { Card } from "@/components/ui/card"

interface StyleProfile {
  tone: string | null
  length_pref: string | null
  rhythm: string | null
  topics: string[] | null
  signature_phrases: string[] | null
  do_list: string[] | null
  dont_list: string[] | null
  summary: string | null
  posts_analyzed: number | null
  updated_at: string | null
}

interface Props {
  user: { email: string }
  connection: { username: string; name: string | null; avatarUrl: string | null }
  style: StyleProfile | null
  drafts: Draft[]
  initialMessages: UIMessage[]
  sessionId: string | null
  stats: { postsAnalyzed: number; published: number; drafts: number }
}

export default function DashboardShell({
  user,
  connection,
  style,
  drafts: initialDrafts,
  initialMessages,
  sessionId: initialSessionId,
  stats,
}: Props) {
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)

  const handleDraftCreated = (draft: Draft) => {
    setDrafts((prev) => [draft, ...prev])
  }

  const handleDraftUpdated = (draft: Draft) => {
    setDrafts((prev) => prev.map((d) => (d.id === draft.id ? draft : d)))
  }

  const handleDraftDeleted = (id: string) => {
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  const draftCount = drafts.filter((d) => d.status === "draft").length
  const publishedCount = drafts.filter((d) => d.status === "published").length

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader user={user} connection={connection} />

      <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
        <section className="animate-fade-in">
          <p className="text-sm text-muted-foreground mb-2">Welcome back</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-balance">Your agent is ready.</h1>
          <p className="text-base text-muted-foreground mt-3 max-w-2xl leading-relaxed">
            Trained on your last {stats.postsAnalyzed} posts. Tell it what you want to say and it will write in your
            voice — then post it to X with one click.
          </p>
        </section>

        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <StatCard label="Posts analyzed" value={stats.postsAnalyzed} />
          <StatCard label="Drafts" value={draftCount} />
          <StatCard label="Published" value={publishedCount} />
          <StatCard label="Voice" value={style?.tone ? capitalize(style.tone.split(",")[0] ?? "Trained") : "Trained"} />
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          <div className="lg:col-span-2">
            <ChatPanel
              initialMessages={initialMessages}
              sessionId={initialSessionId}
              onDraftCreated={handleDraftCreated}
              connectedUsername={connection.username}
            />
          </div>
          <StyleProfileCard style={style} username={connection.username} />
        </section>

        <DraftsGrid
          drafts={drafts}
          username={connection.username}
          onDraftUpdated={handleDraftUpdated}
          onDraftDeleted={handleDraftDeleted}
        />
      </div>
    </main>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card className="p-5 border-border bg-secondary/40">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-2xl md:text-3xl font-bold mt-2 truncate">{value}</p>
    </Card>
  )
}

function capitalize(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}
