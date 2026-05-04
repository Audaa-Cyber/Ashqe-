"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
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
  onDraftUpdated: (d: Draft) => void
  onDraftDeleted: (id: string) => void
}

export default function DraftsGrid({ drafts, username, onDraftUpdated, onDraftDeleted }: Props) {
  const [busy, setBusy] = useState<string | null>(null)

  const handlePost = async (d: Draft) => {
    if (d.content.length > 280) {
      toast.error("Too long for X (max 280 characters)")
      return
    }
    setBusy(d.id)
    try {
      const res = await fetch("/api/x/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: d.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to post")
      onDraftUpdated({
        ...d,
        status: "published",
        x_post_id: json.id,
        published_at: new Date().toISOString(),
      })
      toast.success("Posted to X", {
        action: json.url ? { label: "View", onClick: () => window.open(json.url, "_blank") } : undefined,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post")
    } finally {
      setBusy(null)
    }
  }

  const handleDelete = async (d: Draft) => {
    setBusy(d.id)
    try {
      const res = await fetch(`/api/drafts/${d.id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.error ?? "Failed to delete")
      }
      onDraftDeleted(d.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete")
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
        <Card className="p-10 border-border bg-secondary/30 text-center">
          <p className="text-sm text-muted-foreground">
            No drafts yet. Ask the agent for a post, then save or publish it.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {drafts.map((d) => (
            <Card key={d.id} className="p-5 border-border bg-background">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${
                      d.status === "published"
                        ? "bg-foreground text-background"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {d.status === "published" ? "Published" : "Draft"}
                  </span>
                  <p className="text-xs text-muted-foreground">{relative(d.created_at)}</p>
                </div>
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{d.content}</p>
                <div className="flex items-center gap-2 pt-2">
                  {d.status === "published" && d.x_post_id ? (
                    <a
                      href={`https://x.com/${username}/status/${d.x_post_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-sm font-medium underline-offset-4 hover:underline"
                    >
                      View on X
                    </a>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handlePost(d)}
                      disabled={busy === d.id || d.content.length > 280}
                      className="bg-foreground text-background hover:bg-foreground/90 h-8"
                    >
                      {busy === d.id ? "Posting..." : "Post to X"}
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(d)}
                    disabled={busy === d.id}
                    className="h-8 text-muted-foreground hover:text-foreground"
                  >
                    Delete
                  </Button>
                  <span
                    className={`ml-auto text-xs ${
                      d.content.length > 280 ? "text-destructive" : "text-muted-foreground"
                    }`}
                  >
                    {d.content.length}/280
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </section>
  )
}

function relative(iso: string): string {
  const ts = new Date(iso).getTime()
  const diff = Date.now() - ts
  const m = Math.floor(diff / 60000)
  if (m < 1) return "just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString()
}
