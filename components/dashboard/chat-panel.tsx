"use client"

import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { Draft } from "./drafts-grid"
import { toast } from "sonner"

interface Props {
  initialMessages: UIMessage[]
  sessionId: string | null
  connectedUsername: string
  onDraftCreated: (draft: Draft) => void
}

function getMessageText(msg: UIMessage): string {
  if (!msg.parts || !Array.isArray(msg.parts)) return ""
  return msg.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("")
}

export default function ChatPanel({ initialMessages, sessionId: initialSessionId, onDraftCreated }: Props) {
  const [sessionId] = useState<string | null>(initialSessionId)
  const [input, setInput] = useState("")
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null)
  const [postingId, setPostingId] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { messages, sendMessage, status, stop, regenerate, error } = useChat({
    id: sessionId ?? undefined,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: msgs }) => ({
        body: { messages: msgs, sessionId },
      }),
    }),
    onFinish: ({ message: _message }) => {
      // session id may be set by the server response header (chat route emits it)
      // but for now we trust initialSessionId or whatever was created server-side
      void _message
    },
  })

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages])

  const isStreaming = status === "streaming" || status === "submitted"

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text || isStreaming) return
    sendMessage({ text })
    setInput("")
  }

  const handleSaveDraft = async (msg: UIMessage) => {
    const content = getMessageText(msg).trim()
    if (!content) return
    setSavingDraftId(msg.id)
    try {
      const res = await fetch("/api/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, sessionId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed")
      onDraftCreated(json.draft)
      toast.success("Saved to drafts")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSavingDraftId(null)
    }
  }

  const handlePost = async (msg: UIMessage) => {
    const content = getMessageText(msg).trim()
    if (!content) return
    if (content.length > 280) {
      toast.error("Too long for X (max 280 characters)")
      return
    }
    setPostingId(msg.id)
    try {
      const res = await fetch("/api/x/post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: content }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? "Failed to post")
      toast.success("Posted to X", {
        action: json.url ? { label: "View", onClick: () => window.open(json.url, "_blank") } : undefined,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post")
    } finally {
      setPostingId(null)
    }
  }

  return (
    <Card className="p-6 md:p-8 border-border bg-background space-y-5 h-full flex flex-col min-h-[560px]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Chat with your agent</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Tell it what you want to say</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-foreground text-background text-xs font-semibold">
          <span className={`w-1.5 h-1.5 rounded-full ${isStreaming ? "bg-background animate-pulse" : "bg-background"}`} />
          {isStreaming ? "Thinking" : "Live"}
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
        {messages.length === 0 && (
          <div className="flex justify-start">
            <div className="bg-secondary text-foreground rounded-2xl px-5 py-3 max-w-md">
              <p className="text-sm leading-relaxed">
                Hey. Ready when you are. What do you want to post about?
              </p>
            </div>
          </div>
        )}

        {messages.map((m) => {
          const text = getMessageText(m)
          const isUser = m.role === "user"
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div
                className={`rounded-2xl px-5 py-3 max-w-[85%] md:max-w-[75%] whitespace-pre-wrap leading-relaxed ${
                  isUser
                    ? "bg-foreground text-background"
                    : "bg-secondary text-foreground border border-border"
                }`}
              >
                {!isUser && (
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                    In your voice
                  </p>
                )}
                <p className="text-sm">{text || (isStreaming ? "…" : "")}</p>
                {!isUser && text.trim().length > 0 && status !== "streaming" && (
                  <div className="mt-3 pt-3 border-t border-border flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handlePost(m)}
                      disabled={postingId === m.id || text.length > 280}
                      className="bg-foreground text-background hover:bg-foreground/90 h-8"
                    >
                      {postingId === m.id ? "Posting..." : "Post to X"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSaveDraft(m)}
                      disabled={savingDraftId === m.id}
                      className="h-8"
                    >
                      {savingDraftId === m.id ? "Saving..." : "Save draft"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => regenerate()}
                      disabled={isStreaming}
                      className="h-8"
                    >
                      Try again
                    </Button>
                    <span
                      className={`ml-auto text-xs self-center ${
                        text.length > 280 ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {text.length}/280
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-2">
            {error.message || "Something went wrong"}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-border pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="What do you want to post about?"
            disabled={isStreaming}
            className="flex-1 px-4 py-3 rounded-lg border border-border bg-secondary/40 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground disabled:opacity-60"
          />
          {isStreaming ? (
            <Button type="button" onClick={stop} variant="outline" className="px-5 bg-transparent">
              Stop
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={!input.trim()}
              className="bg-foreground text-background hover:bg-foreground/90 px-5"
            >
              Send
            </Button>
          )}
        </div>
      </form>
    </Card>
  )
}
