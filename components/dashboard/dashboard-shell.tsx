"use client"

import { useState } from "react"
import type { UIMessage } from "ai"
import DashboardHeader from "./dashboard-header"
import ChatPanel from "./chat-panel"
import DraftsGrid, { type Draft } from "./drafts-grid"

interface StyleProfile {
  tone: string | null; length_pref: string | null; rhythm: string | null; topics: string[] | null
  signature_phrases: string[] | null; do_list: string[] | null; dont_list: string[] | null
  summary: string | null; posts_analyzed: number | null; updated_at: string | null
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

const nav = [
  ["home","Command"],
  ["research","Research"],
  ["radar","Radar"],
  ["growth","Growth"],
  ["bd","BD"],
  ["studio","Studio"],
  ["automations","Automations"],
  ["memory","Memory"],
] as const

export default function DashboardShell({ user, connection, style, drafts: initialDrafts, initialMessages, sessionId, stats }: Props) {
  const [tab, setTab] = useState<(typeof nav)[number][0]>("home")
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)
  const [research, setResearch] = useState("")
  const [researchResult, setResearchResult] = useState<string | null>(null)

  const runResearch = async () => {
    if (!research.trim()) return
    const res = await fetch("/api/chat", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ message: `Research this deeply and return sourced findings: ${research}` }) })
    setResearchResult(res.ok ? "Research request accepted. Results will appear here when the connected AI provider is configured." : "Research request failed. Check your AI configuration.")
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader user={user} connection={connection} />
      <div className="mx-auto flex max-w-[1500px] min-h-[calc(100vh-65px)]">
        <aside className="hidden md:block w-60 shrink-0 border-r border-white/10 p-5">
          <div className="ashqe-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground mb-5">Ashqe / OS</div>
          <nav className="space-y-1">
            {nav.map(([id,label]) => (
              <button key={id} onClick={() => setTab(id)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition ${tab===id ? "bg-white text-black" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}>
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-10 border-t border-white/10 pt-5">
            <div className="ashqe-mono text-[10px] uppercase tracking-widest text-muted-foreground">Connected</div>
            <div className="mt-2 text-sm">@{connection.username}</div>
            <div className="text-xs text-muted-foreground">X account</div>
          </div>
        </aside>

        <section className="flex-1 min-w-0 p-5 md:p-9">
          <div className="md:hidden flex gap-2 overflow-x-auto pb-5">
            {nav.map(([id,label]) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 px-3 py-2 rounded-full text-xs ${tab===id ? "bg-white text-black":"bg-white/5 text-muted-foreground"}`}>{label}</button>)}
          </div>

          {tab === "home" && <CommandHome connection={connection} stats={stats} setTab={setTab} />}
          {tab === "research" && <Research research={research} setResearch={setResearch} runResearch={runResearch} result={researchResult} />}
          {tab === "radar" && <Radar />}
          {tab === "growth" && <Growth stats={stats} />}
          {tab === "bd" && <BD />}
          {tab === "studio" && (
            <div>
              <SectionTitle eyebrow="STUDIO" title="Create without sounding generated." sub="Write, review and refine posts and replies. Ashqe treats generic AI phrasing as a defect, not a feature." />
              <div className="mt-8"><ChatPanel initialMessages={initialMessages} sessionId={sessionId} onDraftCreated={(d)=>setDrafts(p=>[d,...p])} connectedUsername={connection.username} /></div>
              <div className="mt-8"><DraftsGrid drafts={drafts} username={connection.username} onDraftUpdated={(d)=>setDrafts(p=>p.map(x=>x.id===d.id?d:x))} onDraftDeleted={(id)=>setDrafts(p=>p.filter(x=>x.id!==id))} /></div>
            </div>
          )}
          {tab === "automations" && <Automations />}
          {tab === "memory" && <Memory style={style} />}
        </section>
      </div>
    </main>
  )
}

function CommandHome({connection,stats,setTab}:{connection:Props["connection"];stats:Props["stats"];setTab:(x:any)=>void}) {
  const cards=[
    ["01","CONVERSATION","A relevant discussion is waiting for you.","radar"],
    ["02","RESEARCH","An emerging topic needs a closer look.","research"],
    ["03","CONTENT","Your next post should come from a real observation.","studio"],
    ["04","BD","Look for people and projects worth knowing.","bd"],
  ]
  return <div>
    <div className="max-w-4xl">
      <div className="ashqe-mono text-xs text-[#d9ff4f] uppercase tracking-[.18em]">Personal X intelligence</div>
      <h1 className="ashqe-display text-5xl md:text-7xl mt-3 leading-[.92]">Good evening,<br/>{connection.name || "@"+connection.username}.</h1>
      <p className="text-muted-foreground mt-5 text-lg max-w-2xl">What should we do? Ashqe watches your information environment so you can spend time acting on signal, not scrolling for it.</p>
    </div>
    <div className="grid md:grid-cols-4 gap-px bg-white/10 mt-12 border border-white/10">
      {cards.map(([n,k,t,d])=><button key={n} onClick={()=>setTab(d)} className="text-left bg-background p-5 min-h-40 hover:bg-white/[.03] transition"><div className="ashqe-mono text-[10px] text-muted-foreground">{n} / {k}</div><p className="mt-8 text-sm leading-6">{t}</p><span className="text-xs text-[#d9ff4f] mt-3 inline-block">Open →</span></button>)}
    </div>
    <div className="mt-10 grid md:grid-cols-3 gap-4">
      <Metric label="Posts analyzed" value={stats.postsAnalyzed} />
      <Metric label="Drafts" value={stats.drafts} />
      <Metric label="Published" value={stats.published} />
    </div>
  </div>
}

function Research({research,setResearch,runResearch,result}:{research:string;setResearch:(x:string)=>void;runResearch:()=>void;result:string|null}) {
 return <div><SectionTitle eyebrow="RESEARCH LAB" title="Go broad. Go deep." sub="General research, niche intelligence, projects, people, competitors and living research briefs." />
 <div className="mt-8 max-w-3xl flex gap-2"><input value={research} onChange={e=>setResearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runResearch()} placeholder="Research a topic, project, person or niche…" className="focus-ring flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 outline-none"/><button onClick={runResearch} className="bg-[#d9ff4f] text-black px-5 rounded-lg font-semibold">Research</button></div>
 <div className="grid md:grid-cols-3 gap-4 mt-8">{["Deep research","Niche monitor","Competitor watch"].map((x,i)=><div className="border border-white/10 p-5 min-h-32" key={x}><div className="ashqe-mono text-[10px] text-[#d9ff4f]">0{i+1}</div><h3 className="mt-7">{x}</h3><p className="text-xs text-muted-foreground mt-2">Continuous context, changes and source trails.</p></div>)}</div>
 {result&&<div className="mt-8 border border-[#d9ff4f]/30 bg-[#d9ff4f]/5 p-5 text-sm">{result}</div>}</div>
}

function Radar(){return <div><SectionTitle eyebrow="RADAR" title="See movement before the crowd." sub="Ashqe looks for acceleration, repeated signals, new language and conversations crossing communities."/><div className="mt-8 border border-white/10 divide-y divide-white/10">{["Emerging narrative","Conversation spike","New account signal","Cross-community overlap"].map((x,i)=><div key={x} className="p-5 flex justify-between"><div><div className="ashqe-mono text-[10px] text-[#d9ff4f]">SIGNAL 0{i+1}</div><div className="mt-2">{x}</div></div><span className="text-xs text-muted-foreground">Awaiting live X data</span></div>)}</div></div>}

function Growth({stats}:{stats:Props["stats"]}){return <div><SectionTitle eyebrow="GROWTH" title="A growth manager that knows your account." sub="Measure patterns, run experiments and turn what works into repeatable systems."/><div className="grid md:grid-cols-3 gap-4 mt-8"><Metric label="Posts analyzed" value={stats.postsAnalyzed}/><Metric label="Publishing" value={stats.published}/><Metric label="Draft queue" value={stats.drafts}/></div><div className="mt-8 border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#d9ff4f]">NEXT EXPERIMENT</div><h3 className="text-xl mt-3">Build a repeatable observation format</h3><p className="text-muted-foreground mt-2 text-sm">Ashqe will compare hooks, topics, timing and engagement once enough account history is available.</p></div></div>}

function BD(){return <div><SectionTitle eyebrow="BD ENGINE" title="Turn the network into opportunities." sub="Discover people, projects, communities and partnership angles without turning your account into a spam machine."/><div className="mt-8 grid md:grid-cols-2 gap-px bg-white/10 border border-white/10">{["Potential partner","Founder worth knowing","Community opportunity","Collaboration angle"].map((x,i)=><div className="bg-background p-6 min-h-36" key={x}><div className="ashqe-mono text-[10px] text-muted-foreground">OPPORTUNITY 0{i+1}</div><h3 className="mt-7">{x}</h3><p className="text-xs text-muted-foreground mt-2">Requires live network and research data.</p></div>)}</div></div>}

function Automations(){return <div><SectionTitle eyebrow="AUTOMATIONS" title="Tell Ashqe once. Let it remember." sub="Natural-language scheduled jobs for research, monitoring, briefs and reminders. X actions stay approval-gated by default."/><div className="mt-8 border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#d9ff4f]">EXAMPLE</div><p className="mt-4 text-lg">“Every morning at 8, research what changed in my niches overnight and send me the important findings on Telegram.”</p><div className="mt-6 grid md:grid-cols-4 gap-3 text-xs text-muted-foreground"><span>08:00 daily</span><span>Research + radar</span><span>Telegram</span><span>Suggest only</span></div></div><div className="mt-5 border border-dashed border-white/15 p-6 text-sm text-muted-foreground">Scheduler foundation is ready. Connect CRON_SECRET, Telegram and an AI provider in production to execute jobs.</div></div>}

function Memory({style}:{style:StyleProfile|null}){return <div><SectionTitle eyebrow="MEMORY" title="Build the model of you." sub="Voice, interests, projects, goals and rules become durable context for every agent."/><div className="mt-8 grid md:grid-cols-2 gap-4"><div className="border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#d9ff4f]">VOICE</div><p className="mt-5 text-sm text-muted-foreground">{style?.summary || "Your voice profile will grow from your connected X history."}</p></div><div className="border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#d9ff4f]">TOPICS</div><p className="mt-5 text-sm text-muted-foreground">{style?.topics?.join(" · ") || "Add niches and let Ashqe learn what matters."}</p></div></div></div>}

function SectionTitle({eyebrow,title,sub}:{eyebrow:string;title:string;sub:string}){return <div className="max-w-4xl"><div className="ashqe-mono text-xs text-[#d9ff4f] tracking-[.18em]">{eyebrow}</div><h2 className="ashqe-display text-4xl md:text-6xl mt-3 leading-none">{title}</h2><p className="text-muted-foreground mt-4 max-w-2xl leading-7">{sub}</p></div>}
function Metric({label,value}:{label:string;value:string|number}){return <div className="border border-white/10 p-5"><div className="ashqe-mono text-[10px] text-muted-foreground uppercase">{label}</div><div className="ashqe-display text-4xl mt-3">{value}</div></div>}
