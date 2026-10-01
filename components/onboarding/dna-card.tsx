"use client"

import { useCallback, useRef } from "react"

export interface DnaProfile {
  username: string
  name: string | null
  tone: string | null
  length_pref: string | null
  rhythm: string | null
  topics: string[] | null
  signature_phrases: string[] | null
  do_list: string[] | null
  dont_list: string[] | null
  summary: string | null
  posts_analyzed: number | null
}

function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c] ?? c))
}

function lines(text: string, max = 3) {
  return text.split(/\s+/).reduce<string[]>((acc, word) => {
    const next = acc[acc.length - 1]
    if (!next || next.length + word.length + 1 > 34) acc.push(word)
    else acc[acc.length - 1] = next + " " + word
    return acc
  }, []).slice(0, max)
}

export default function DnaCard({ profile, compact = false }: { profile: DnaProfile; compact?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const download = useCallback(() => {
    const canvas = canvasRef.current ?? document.createElement("canvas")
    canvas.width = 1600
    canvas.height = 1000
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const g = ctx.createLinearGradient(0, 0, 1600, 1000)
    g.addColorStop(0, "#090909")
    g.addColorStop(1, "#171717")
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 1600, 1000)

    ctx.strokeStyle = "rgba(255,255,255,.14)"
    ctx.lineWidth = 2
    ctx.strokeRect(44, 44, 1512, 912)

    ctx.fillStyle = "#ffffff"
    ctx.font = "700 42px Arial"
    ctx.fillText("ASHQE", 82, 112)
    ctx.fillStyle = "rgba(255,255,255,.48)"
    ctx.font = "500 18px monospace"
    ctx.fillText("VOICE DNA / PERSONAL X INTELLIGENCE", 82, 145)

    ctx.fillStyle = "#ffffff"
    ctx.font = "700 70px Arial"
    ctx.fillText(profile.name || "Your Voice", 82, 245)
    ctx.fillStyle = "rgba(255,255,255,.55)"
    ctx.font = "500 25px monospace"
    ctx.fillText("@" + profile.username, 82, 286)

    const fields = [
      ["TONE", profile.tone || "Conversational"],
      ["LENGTH", profile.length_pref || "Natural"],
      ["RHYTHM", profile.rhythm || "Distinctive"],
    ]
    fields.forEach(([label, value], i) => {
      const x = 82 + i * 490
      ctx.fillStyle = "rgba(255,255,255,.32)"
      ctx.font = "600 16px monospace"
      ctx.fillText(label, x, 360)
      ctx.fillStyle = "#ffffff"
      ctx.font = "600 27px Arial"
      lines(value).forEach((line, j) => ctx.fillText(line, x, 400 + j * 34))
    })

    ctx.fillStyle = "rgba(255,255,255,.32)"
    ctx.font = "600 16px monospace"
    ctx.fillText("VOICE SIGNATURE", 82, 535)
    ctx.fillStyle = "#ffffff"
    ctx.font = "500 25px Arial"
    lines(profile.summary || "A personal voice profile built from your X history.", 4).forEach((line, i) => ctx.fillText(line, 82, 578 + i * 34))

    ctx.fillStyle = "rgba(255,255,255,.32)"
    ctx.font = "600 16px monospace"
    ctx.fillText("SIGNATURE PHRASES", 82, 745)
    ctx.fillStyle = "#ffffff"
    ctx.font = "500 22px Arial"
    ctx.fillText((profile.signature_phrases || []).slice(0, 5).join("  ·  ") || "Still learning", 82, 785)

    ctx.fillStyle = "rgba(255,255,255,.35)"
    ctx.font = "500 16px monospace"
    ctx.fillText((profile.posts_analyzed || 0) + " POSTS ANALYZED", 82, 888)
    ctx.fillText("ASHQE / YOUR DNA / " + new Date().getFullYear(), 1120, 888)

    const link = document.createElement("a")
    link.download = "ashqe-voice-dna.png"
    link.href = canvas.toDataURL("image/png")
    link.click()
  }, [profile])

  return (
    <div className={compact ? "w-full" : "w-full max-w-5xl"}>
      <div className="relative overflow-hidden border border-white/15 bg-[#0b0b0b]">
        <div className="absolute -right-24 -top-24 h-72 w-72 border border-white/10 rotate-45" />
        <div className="absolute right-16 top-12 h-24 w-24 border border-white/10 rounded-full animate-pulse" />
        <div className="relative p-6 sm:p-9 md:p-12">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="ashqe-display text-2xl tracking-tight">Ashqe<span className="text-white/35">.</span></div>
              <div className="ashqe-mono mt-1 text-[9px] tracking-[.2em] text-white/35">VOICE DNA / PERSONAL X INTELLIGENCE</div>
            </div>
            <div className="ashqe-mono text-[9px] text-white/30">{profile.posts_analyzed || 0} POSTS ANALYZED</div>
          </div>

          <div className="mt-14">
            <div className="ashqe-mono text-[9px] text-white/35">IDENTITY</div>
            <h2 className="ashqe-display mt-3 text-4xl sm:text-6xl leading-none">{profile.name || "Your Voice"}</h2>
            <div className="mt-2 ashqe-mono text-xs text-white/45">@{profile.username}</div>
          </div>

          <div className="mt-12 grid md:grid-cols-3 border border-white/10 divide-y md:divide-y-0 md:divide-x divide-white/10">
            {[
              ["TONE", profile.tone || "Conversational"],
              ["LENGTH", profile.length_pref || "Natural"],
              ["RHYTHM", profile.rhythm || "Distinctive"],
            ].map(([label, value]) => (
              <div key={label} className="p-5 min-h-28">
                <div className="ashqe-mono text-[9px] text-white/30">{label}</div>
                <div className="mt-3 text-sm leading-6">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-5 border border-white/10 p-5">
            <div className="ashqe-mono text-[9px] text-white/30">VOICE SIGNATURE</div>
            <p className="mt-3 max-w-3xl text-sm sm:text-base leading-7 text-white/75">{profile.summary || "Ashqe is still learning your voice."}</p>
          </div>

          <div className="mt-5 border border-white/10 p-5">
            <div className="ashqe-mono text-[9px] text-white/30">SIGNATURE PHRASES</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {(profile.signature_phrases || []).slice(0, 6).map((phrase) => (
                <span key={phrase} className="border border-white/15 px-3 py-2 text-xs">{phrase}</span>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="ashqe-mono text-[9px] text-white/25">BUILT BY ASHQE / YOUR VOICE, YOUR DATA</div>
            <button onClick={download} className="bg-white text-black px-5 py-3 text-xs font-bold tracking-wide">
              Download DNA card
            </button>
          </div>
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />
    </div>
  )
}
