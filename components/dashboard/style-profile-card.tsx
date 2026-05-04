"use client"

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

export default function StyleProfileCard({
  style,
  username,
}: {
  style: StyleProfile | null
  username: string
}) {
  return (
    <Card className="p-6 md:p-8 border-border bg-foreground text-background space-y-5 h-full">
      <div>
        <p className="text-xs font-semibold text-background/70 uppercase tracking-widest mb-2">Style profile</p>
        <h2 className="text-xl font-bold leading-tight">How @{username} writes</h2>
      </div>

      {style?.summary && <p className="text-sm leading-relaxed text-background/90">{style.summary}</p>}

      <div className="space-y-3 text-sm">
        {style?.tone && (
          <Row label="Tone" value={style.tone} />
        )}
        {style?.length_pref && <Row label="Length" value={style.length_pref} />}
        {style?.rhythm && <Row label="Rhythm" value={style.rhythm} />}
        {style?.topics?.length ? <Row label="Topics" value={style.topics.join(", ")} /> : null}
      </div>

      {style?.signature_phrases?.length ? (
        <div>
          <p className="text-xs text-background/60 mb-1.5">Signature phrasings</p>
          <div className="flex flex-wrap gap-1.5">
            {style.signature_phrases.slice(0, 6).map((p, i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-full bg-background/10 border border-background/20">
                {p}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="pt-4 border-t border-background/20">
        <p className="text-xs text-background/70">
          {style?.posts_analyzed
            ? `Trained on ${style.posts_analyzed} posts. Refines as you publish more.`
            : "Style profile pending. Connect more posts to improve accuracy."}
        </p>
      </div>
    </Card>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-background/60 mb-0.5">{label}</p>
      <p className="font-semibold leading-snug">{value}</p>
    </div>
  )
}
