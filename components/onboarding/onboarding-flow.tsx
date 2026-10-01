"use client"

import { useEffect, useMemo, useState } from "react"
import { ArrowRight, Check, Loader2, ScanLine, Sparkles } from "lucide-react"
import DnaCard, { type DnaProfile } from "./dna-card"

type Style = Omit<DnaProfile, "username" | "name"> & { updated_at?: string | null }
type Phase = "clone" | "conversation" | "dna" | "finish"

const cloneSteps = [
  "Connecting to your X history",
  "Reading your writing patterns",
  "Mapping tone, rhythm and language",
  "Finding the signals behind your posts",
  "Assembling your Voice DNA",
]

const autonomy = [
  ["Observe", "Watch my X world and tell me what matters.", "observe"],
  ["Assist", "Research and prepare work for me.", "assist"],
  ["Act with approval", "Prepare actions and ask before executing.", "approval"],
  ["Autonomous", "Execute only what I explicitly allow.", "autonomous"],
] as const

function useTypewriter(text: string, speed = 26, enabled = true) {
  const [shown, setShown] = useState("")
  useEffect(() => {
    if (!enabled) return
    setShown("")
    let i = 0
    const timer = window.setInterval(() => {
      i += 1
      setShown(text.slice(0, i))
      if (i >= text.length) window.clearInterval(timer)
    }, speed)
    return () => window.clearInterval(timer)
  }, [text, speed, enabled])
  return shown
}

function AshqeLine({ children, delay = 0 }: { children: string; delay?: number }) {
  const [ready, setReady] = useState(delay === 0)
  useEffect(() => {
    if (delay === 0) return
    const t = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(t)
  }, [delay])
  const text = useTypewriter(children, 24, ready)
  return <p className="min-h-[1.5em] text-lg sm:text-xl leading-8 text-white/80">{text}<span className={ready && text.length === children.length ? "opacity-0" : "opacity-70"}>▋</span></p>
}

export default function OnboardingFlow({
  username,
  name,
  style: initialStyle,
}: {
  username: string
  name: string | null
  style: Style | null
}) {
  const [phase, setPhase] = useState<Phase>("clone")
  const [cloneIndex, setCloneIndex] = useState(0)
  const [clonePercent, setClonePercent] = useState(0)
  const [style, setStyle] = useState<Style | null>(initialStyle)
  const [conversationStep, setConversationStep] = useState(0)
  const [goals, setGoals] = useState<string[]>([])
  const [goalText, setGoalText] = useState("")
  const [topics, setTopics] = useState("")
  const [autonomy, setAutonomy] = useState("approval")
  const [saving, setSaving] = useState(false)
  const [cloneError, setCloneError] = useState(false)

  useEffect(() => {
    if (phase !== "clone") return

    let cancelled = false
    let progress = 0
    const tick = window.setInterval(() => {
      progress = Math.min(88, progress + 2 + Math.random() * 5)
      if (!cancelled) {
        setClonePercent(Math.round(progress))
        setCloneIndex(Math.min(cloneSteps.length - 1, Math.floor(progress / 19)))
      }
    }, 260)

    const run = async () => {
      try {
        const res = await fetch("/api/onboarding/clone", { method: "POST" })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "clone_failed")
        if (!cancelled) {
          if (data.profile) setStyle({ ...data.profile, updated_at: new Date().toISOString() })
          setClonePercent(100)
          window.setTimeout(() => !cancelled && setPhase("conversation"), 850)
        }
      } catch {
        if (!cancelled) setCloneError(true)
      }
    }

    run()
    return () => {
      cancelled = true
      window.clearInterval(tick)
    }
  }, [phase])

  const profile = useMemo<DnaProfile>(() => ({
    username,
    name,
    tone: style?.tone ?? "Conversational",
    length_pref: style?.length_pref ?? "Natural",
    rhythm: style?.rhythm ?? "Distinctive",
    topics: style?.topics ?? [],
    signature_phrases: style?.signature_phrases ?? [],
    do_list: style?.do_list ?? [],
    dont_list: style?.dont_list ?? [],
    summary: style?.summary ?? "A living profile of how you communicate on X.",
    posts_analyzed: style?.posts_analyzed ?? 0,
  }), [username, name, style])

  const saveAndFinish = async () => {
    setSaving(true)
    const res = await fetch("/api/onboarding/complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goals,
        topics: topics.split(",").map((x) => x.trim()).filter(Boolean),
        autonomy,
      }),
    })
    if (!res.ok) {
      setSaving(false)
      return
    }
    setPhase("finish")
    setSaving(false)
  }

  const submitGoal = () => {
    const clean = goalText.trim()
    if (clean) setGoals((current) => [...current, clean])
    setGoalText("")
    setConversationStep(1)
  }

  const topicList = topics.split(",").map((x) => x.trim()).filter(Boolean)

  if (phase === "clone") {
    return (
      <main className="min-h-screen bg-background text-foreground overflow-hidden">
        <div className="min-h-screen flex items-center justify-center px-6 relative">
          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.035) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
          <div className="relative w-full max-w-3xl">
            <div className="flex items-center justify-between ashqe-mono text-[9px] tracking-[.22em] text-white/35">
              <span>ASHQE / X CONNECTION ESTABLISHED</span>
              <span>{Math.round(clonePercent)}%</span>
            </div>

            <div className="mt-10 flex justify-center">
              <div className="relative h-64 w-64 sm:h-80 sm:w-80 flex items-center justify-center">
                <div className="absolute inset-8 border border-white/15 rounded-full animate-[spin_10s_linear_infinite]" />
                <div className="absolute inset-14 border border-white/20 rounded-full animate-[spin_6s_linear_infinite_reverse]" />
                <div className="absolute inset-20 border border-white/25 rounded-full animate-pulse" />
                <div className="absolute h-28 w-28 border border-white/30 rotate-45 animate-[spin_8s_linear_infinite]" />
                <div className="relative h-20 w-20 bg-white text-black flex items-center justify-center shadow-[0_0_80px_rgba(255,255,255,.12)]">
                  <span className="ashqe-display text-2xl">A<span className="text-black/40">.</span></span>
                </div>
                {[0,1,2,3,4,5].map((i) => (
                  <span key={i} className="absolute h-1.5 w-1.5 bg-white/70 rounded-full animate-ping" style={{ transform: `rotate(${i * 60}deg) translateY(-132px)`, animationDelay: `${i * 180}ms` }} />
                ))}
              </div>
            </div>

            <div className="mt-10 text-center">
              <div className="ashqe-mono text-[10px] tracking-[.2em] text-white/35">CLONING / @{username}</div>
              <h1 className="ashqe-display text-4xl sm:text-6xl mt-4 leading-none">I’m learning your signal.</h1>
              <p className="mt-5 text-white/45 min-h-6">{cloneSteps[cloneIndex]}…</p>
            </div>

            <div className="mt-10 h-px bg-white/10 overflow-hidden">
              <div className="h-full bg-white transition-all duration-300" style={{ width: `${clonePercent}%` }} />
            </div>

            <div className="mt-5 flex justify-between ashqe-mono text-[9px] text-white/25">
              <span>{cloneError ? "CLONE RETRY / YOUR X DATA IS STILL SAFE" : "VOICE / BEHAVIOR / INTERESTS / RHYTHM"}</span>
              <span>{cloneError ? "RETRYING…" : "LIVE"}</span>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (phase === "conversation") {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-5 sm:px-8">
          <div className="ashqe-display text-xl">Ashqe<span className="text-white/40">.</span></div>
          <div className="ashqe-mono text-[9px] tracking-[.18em] text-white/30">@{username} / VOICE ONLINE</div>
        </header>

        <div className="mx-auto min-h-[calc(100vh-64px)] max-w-4xl px-5 sm:px-8 py-12 sm:py-20 flex">
          <div className="w-full flex flex-col">
            <div className="ashqe-mono text-[9px] tracking-[.2em] text-white/25">FIRST CONVERSATION</div>

            {conversationStep === 0 && (
              <div className="mt-12 max-w-3xl">
                <AshqeLine>Hey{name ? `, ${name}` : ""}. I’m Ashqe.</AshqeLine>
                <div className="mt-3"><AshqeLine delay={700}>I’ve been through your X history. I have a first read on your voice.</AshqeLine></div>
                <div className="mt-3"><AshqeLine delay={1500}>Now I want to understand what you’re actually trying to build here.</AshqeLine></div>

                <div className="mt-12 border-l-2 border-white/25 pl-5">
                  <div className="ashqe-mono text-[9px] text-white/30">ASHQE / QUESTION 01</div>
                  <label className="block mt-3 text-2xl sm:text-3xl leading-tight">What do you want X to help you accomplish?</label>
                  <textarea autoFocus value={goalText} onChange={(e) => setGoalText(e.target.value)} onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submitGoal() }} placeholder="Tell me in your own words…" className="mt-7 w-full min-h-32 bg-transparent border-b border-white/20 focus:border-white outline-none resize-none text-lg py-3 placeholder:text-white/20" />
                  <div className="mt-4 flex justify-between items-center">
                    <span className="ashqe-mono text-[9px] text-white/20">⌘ / CTRL + ENTER</span>
                    <button onClick={submitGoal} disabled={!goalText.trim()} className="bg-white text-black px-5 py-3 text-xs font-bold disabled:opacity-30">Continue <ArrowRight className="inline h-3.5 w-3.5 ml-1" /></button>
                  </div>
                </div>
              </div>
            )}

            {conversationStep === 1 && (
              <div className="mt-12 max-w-3xl">
                <AshqeLine>Got it. I’ll keep that in the model.</AshqeLine>
                {goals[0] && <div className="mt-6 border border-white/10 p-5 text-sm text-white/55">“{goals[0]}”</div>}
                <div className="mt-10"><AshqeLine delay={650}>Next: what should I keep an eye on for you?</AshqeLine></div>
                <div className="mt-3"><AshqeLine delay={1300}>Topics, people, projects, communities, markets. Anything you don’t want to miss.</AshqeLine></div>
                <textarea autoFocus value={topics} onChange={(e) => setTopics(e.target.value)} placeholder="AI, Arc, Web3 builders, design, …" className="mt-10 w-full min-h-28 bg-transparent border-b border-white/20 focus:border-white outline-none resize-none text-lg py-3 placeholder:text-white/20" />
                <div className="mt-4 flex flex-wrap gap-2">{topicList.map((topic) => <span key={topic} className="border border-white/15 px-3 py-2 text-xs">{topic}</span>)}</div>
                <button onClick={() => setConversationStep(2)} className="mt-7 bg-white text-black px-5 py-3 text-xs font-bold">That’s enough <ArrowRight className="inline h-3.5 w-3.5 ml-1" /></button>
              </div>
            )}

            {conversationStep === 2 && (
              <div className="mt-12 max-w-3xl">
                <AshqeLine>Perfect. I know where to look.</AshqeLine>
                <div className="mt-3"><AshqeLine delay={700}>One last thing before I finish building your operator.</AshqeLine></div>
                <div className="mt-3"><AshqeLine delay={1350}>How much should I do on my own?</AshqeLine></div>

                <div className="mt-10 border border-white/10 divide-y divide-white/10">
                  {autonomy.map(([title, description, id]) => (
                    <button key={id} onClick={() => setAutonomy(id)} className={`w-full text-left p-5 border-l-2 ${autonomy === id ? "border-white bg-white/10" : "border-transparent hover:bg-white/5"}`}>
                      <div className="font-medium">{title}</div>
                      <div className="mt-1 text-sm text-white/40">{description}</div>
                    </button>
                  ))}
                </div>

                <button onClick={() => setPhase("dna")} className="mt-7 bg-white text-black px-5 py-3 text-xs font-bold">
                  Build my DNA <Sparkles className="inline h-3.5 w-3.5 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    )
  }

  if (phase === "dna") {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <header className="h-16 border-b border-white/10 flex items-center justify-between px-5 sm:px-8">
          <div className="ashqe-display text-xl">Ashqe<span className="text-white/40">.</span></div>
          <div className="ashqe-mono text-[9px] tracking-[.18em] text-white/30">DNA / SYNTHESIZING</div>
        </header>
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center px-5 py-12">
          <div className="w-full max-w-5xl">
            <div className="flex items-center gap-3 ashqe-mono text-[9px] tracking-[.2em] text-white/35"><Loader2 className="h-3.5 w-3.5 animate-spin" /> SYNTHESIZING YOUR VOICE DNA</div>
            <div className="mt-7"><DnaCard profile={profile} /></div>
            <div className="mt-7 border border-white/10 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div><div className="text-sm">This is the profile Ashqe will use to write, reason and adapt to you.</div><div className="mt-1 text-xs text-white/35">You can keep refining it later.</div></div>
              <button onClick={saveAndFinish} disabled={saving} className="bg-white text-black px-6 py-3 text-xs font-bold">{saving ? "Saving…" : "Finish & enter Ashqe →"}</button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-5xl">
          <div className="flex items-center gap-3 ashqe-mono text-[9px] tracking-[.2em] text-white/35"><Check className="h-3.5 w-3.5" /> ASHQE IS READY</div>
          <h1 className="ashqe-display text-5xl sm:text-7xl mt-6 leading-none">Your voice has<br/>a home now.</h1>
          <p className="mt-6 text-white/45 max-w-2xl leading-7">Your Voice DNA is stored with your Ashqe profile. You can come back to it, keep refining it, or download the branded card whenever you want.</p>
          <div className="mt-10"><DnaCard profile={profile} /></div>
          <button onClick={() => window.location.href = "/dashboard"} className="mt-8 bg-white text-black px-7 py-3 text-xs font-bold">Enter Command Center <ArrowRight className="inline h-3.5 w-3.5 ml-1" /></button>
        </div>
      </div>
    </main>
  )
}
