import Link from "next/link"
import { ArrowRight, Radar, Search, Zap } from "lucide-react"

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 signal-grid">
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-[1fr_.9fr]">
        <div className="max-w-3xl">
          <div className="ashqe-mono text-xs uppercase tracking-[.22em] text-[#d9ff4f]">Personal X intelligence / 01</div>
          <h1 className="ashqe-display mt-6 text-6xl leading-[.88] sm:text-7xl lg:text-8xl">
            Your AI<br/><span className="text-white/40">operating system</span><br/>for X.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-white/60">
            Research your world. Detect movement before it is obvious. Find conversations and BD opportunities. Create without sounding generated. Then let Ashqe execute the work you approve.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/connect" className="inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#d9ff4f] px-6 text-sm font-bold text-black transition hover:translate-y-[-1px]">
              Enter Ashqe <ArrowRight className="h-4 w-4"/>
            </Link>
            <a href="#how-it-works" className="inline-flex h-12 items-center justify-center rounded-lg border border-white/15 px-6 text-sm font-semibold text-white/80 hover:bg-white/5">Explore the system</a>
          </div>
          <div className="mt-10 ashqe-mono text-[10px] uppercase tracking-[.16em] text-white/35">Research · Radar · Growth · BD · Studio · Automations · Memory</div>
        </div>

        <div className="border border-white/10 bg-[#0d0f13]/90">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <span className="ashqe-mono text-[10px] uppercase tracking-[.18em] text-white/40">ASHQE / LIVE BRIEF</span>
            <span className="flex items-center gap-2 text-[10px] text-[#d9ff4f]"><span className="h-1.5 w-1.5 rounded-full bg-[#d9ff4f]"/>WATCHING</span>
          </div>
          <div className="p-5">
            {[
              { Icon: Radar, label: "EARLY SIGNAL", text: "AI × wallets is accelerating" },
              { Icon: Search, label: "RESEARCH", text: "3 changes need your attention" },
              { Icon: Zap, label: "OPPORTUNITY", text: "A relevant conversation is opening" },
            ].map(({ Icon, label, text }, i) => (
              <div key={i} className="border-b border-white/10 py-5 last:border-0">
                <div className="flex gap-4">
                  <Icon className="h-4 w-4 text-[#d9ff4f]"/>
                  <div><div className="ashqe-mono text-[9px] text-white/35">{label}</div><div className="mt-2 text-sm">{text}</div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-white/10 bg-white/[.02] p-5">
            <div className="ashqe-mono text-[9px] text-white/35">NEXT MOVE</div>
            <p className="mt-2 text-sm">Research the signal before publishing an opinion.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
