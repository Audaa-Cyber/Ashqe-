"use client"

import { useState } from "react"
import { toast } from "sonner"

export interface Draft {
  id: string
  topic: string | null
  content: string
  status: "draft" | "published"
  x_post_id: string | null
  published_at: string | null
  created_at: string
}

interface Props {
  drafts: Draft[]
  username: string
  onDraftUpdated: (draft: Draft) => void
  onDraftDeleted: (id: string) => void
}

export default function DraftsGrid({ drafts, username, onDraftUpdated, onDraftDeleted }: Props) {
  const [busy, setBusy] = useState<string | null>(null)

  const handlePost = async (draft: Draft) => {
    if (draft.content.length > 280) {
      toast.error("Too long for X (max 280 characters)")
      return
    }
    setBusy(draft.id)
    try {
      const res = await fetch("/api/x/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed to post")
      onDraftUpdated({ ...draft, status: "published", x_post_id: json.id, published_at: new Date().toISOString() })
      toast.success("Posted to X", {
        action: json.url ? { label: "View", onClick: () => window.open(json.url, "_blank", "noopener,noreferrer") } : undefined,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to post")
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (draft: Draft) => {
    setBusy(draft.id)
    try {
      const res = await fetch(`/api/drafts/${draft.id}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error ?? "Failed to delete")
      onDraftDeleted(draft.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Drafts &amp; posts</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {drafts.length === 0 ? "Generate something in chat to save it here" : `${drafts.length} items`}
          </p>
        </div>
      </div>
      {drafts.length === 0 ? (
        <div className="border border-border bg-secondary/30 p-10 text-center">
          <p className="text-sm text-muted-foreground">No drafts yet. Ask the agent for a post, then save or publish it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map((draft) => (
            <article key={draft.id} className="p-5 border border-border bg-background">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 ${draft.status === "published" ? "bg-foreground text-background" : "bg-secondary text-muted-foreground"}`}>
                    {draft.status === "published" ? "Published" : "Draft"}
                  </span>
                  <p className="text-xs text-muted-foreground">{relative(draft.created_at)}</p>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{draft.content}</p>
                <div className="flex items-center gap-2 pt-2">
                  {draft.status === "published" && draft.x_post_id ? (
                    <a href={`https://x.com/${username}/status/${draft.x_post_id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-sm font-medium underline-offset-4 hover:underline">
                      View on X
                    </a>
                  ) : (
                    <button onClick={() => handlePost(draft)} disabled={busy === draft.id || draft.content.length > 280} className="bg-foreground text-background hover:bg-foreground/90 h-8 px-3 text-sm font-medium disabled:opacity-40">
                      {busy === draft.id ? "Posting..." : "Post to X"}
                    </button>
                  )}
                  <button onClick={() => handleDelete(draft)} disabled={busy === draft.id} className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground disabled:opacity-40">
                    {busy === draft.id ? "Working..." : "Delete"}
                  </button>
                  <span className={`ml-auto text-xs ${draft.content.length > 280 ? "text-destructive" : "text-muted-foreground"}`}>
                    {draft.content.length}/280
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}

function relative(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return "unknown"
  const diff = Math.max(0, Date.now() - ts)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}
