"use client"

import { useEffect, useState } from "react"
import { Menu, X, Command, Search, Radar as RadarIcon, TrendingUp, Lightbulb, Users, PenLine, Clock3, Brain } from "lucide-react"
import type { UIMessage } from "ai"
import DashboardHeader from "./dashboard-header"
import ChatPanel from "./chat-panel"
import DraftsGrid, { type Draft } from "./drafts-grid"
import DnaCard from "@/components/onboarding/dna-card"

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

type NavItem = readonly [string, string, typeof Command]
type NavGroup = { readonly group: string; readonly items: readonly NavItem[] }

const nav: readonly NavGroup[] = [
  { group: "COMMAND", items: [["home", "Command", Command], ["profile", "Profile", Users]] },
  { group: "INTELLIGENCE", items: [["research", "Research", Search], ["radar", "Radar", RadarIcon], ["opportunities", "Opportunities", Lightbulb], ["growth", "Growth", TrendingUp], ["bd", "BD", Users]] },
  { group: "WORKSPACE", items: [["studio", "Studio", PenLine], ["automations", "Automations", Clock3], ["memory", "Memory", Brain]] },
]
const flatNav: readonly NavItem[] = nav.flatMap((group) => group.items)
type TabId = (typeof flatNav)[number][0]

export default function DashboardShell({ user, connection, style, drafts: initialDrafts, initialMessages, sessionId, stats }: Props) {
  const [tab, setTab] = useState<TabId>("home")
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [drafts, setDrafts] = useState<Draft[]>(initialDrafts)
  const [research, setResearch] = useState("")
  const [researchResult, setResearchResult] = useState<string | null>(null)

  useEffect(() => {
    const readTab = () => {
      const value = new URLSearchParams(window.location.search).get("tab")
      if (flatNav.some(([id]) => id === value)) setTab(value as TabId)
    }
    readTab()
    window.addEventListener("popstate", readTab)
    return () => window.removeEventListener("popstate", readTab)
  }, [])

  const navigateTab = (id: TabId) => {
    setTab(id)
    setMobileNavOpen(false)
    const url = new URL(window.location.href)
    if (id === "home") url.searchParams.delete("tab")
    else url.searchParams.set("tab", id)
    window.history.pushState({ tab: id }, "", url)
  }

  const runResearch = async () => {
    if (!research.trim()) return
    setResearchResult("Researching…")
    const res = await fetch("/api/research", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ query: research, depth: "deep" }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setResearchResult(data.message || "Research failed. Check your AI and research provider configuration."); return }
    const result = data.result || {}
    const findings = Array.isArray(result.findings) ? result.findings : []
    setResearchResult([result.thesis || "Research complete.", ...findings.slice(0,4).map((x:any) => "• " + x.title + ": " + x.summary)].join("\n\n"))
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader user={user} connection={connection} />
      <div className="mx-auto flex max-w-[1500px] min-h-[calc(100vh-65px)]">
        <aside className="hidden md:flex w-64 shrink-0 border-r border-white/10 flex-col sticky top-[65px] h-[calc(100vh-65px)]">
          <div className="p-5 border-b border-white/10">
            <div className="ashqe-mono text-[10px] uppercase tracking-[.2em] text-muted-foreground">Ashqe / OS</div>
            <div className="mt-2 text-xs text-white/45">Personal X intelligence</div>
          </div>
          <nav className="flex-1 overflow-y-auto p-3">
            {nav.map(group => (
              <div key={group.group} className="mb-6 last:mb-0">
                <div className="ashqe-mono px-3 mb-2 text-[9px] tracking-[.18em] text-white/30">{group.group}</div>
                <div className="space-y-px">
                  {group.items.map(([id,label,Icon]) => (
                    <button type="button" key={id} onClick={() => navigateTab(id)} aria-current={tab===id ? "page" : undefined} className={`w-full flex items-center gap-3 text-left px-3 py-2.5 text-sm transition border-l-2 ${tab===id ? "bg-white/10 text-white border-white" : "text-muted-foreground border-transparent hover:bg-white/5 hover:text-white"}`}>
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
          <div className="border-t border-white/10 p-4">
            <div className="ashqe-mono text-[9px] uppercase tracking-widest text-muted-foreground">Connected</div>
            <div className="mt-2 text-sm truncate">@{connection.username}</div>
            <div className="text-xs text-muted-foreground">X account</div>
          </div>
        </aside>

        {mobileNavOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/60" role="presentation" onClick={() => setMobileNavOpen(false)}>
            <aside className="h-full w-[min(86vw,320px)] bg-background border-r border-white/10" role="dialog" aria-modal="true" aria-label="Ashqe navigation" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <div><div className="ashqe-mono text-[10px] tracking-[.2em]">ASHQE / OS</div><div className="text-xs text-white/40 mt-1">@{connection.username}</div></div>
                <button onClick={() => setMobileNavOpen(false)} className="p-2 border border-white/10" aria-label="Close navigation"><X className="h-4 w-4"/></button>
              </div>
              <nav id="mobile-dashboard-navigation" className="p-3 overflow-y-auto h-[calc(100%-73px)]">
                {nav.map(group => (
                  <div key={group.group} className="mb-6">
                    <div className="ashqe-mono px-3 mb-2 text-[9px] tracking-[.18em] text-white/30">{group.group}</div>
                    {group.items.map(([id,label,Icon]) => (
                      <button type="button" key={id} onClick={() => navigateTab(id)} aria-current={tab===id ? "page" : undefined} className={`w-full flex items-center gap-3 text-left px-3 py-3 text-sm border-l-2 ${tab===id ? "bg-white/10 text-white border-white" : "text-muted-foreground border-transparent"}`}>
                        <Icon className="h-4 w-4" /><span>{label}</span>
                      </button>
                    ))}
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}

        <section className="flex-1 min-w-0 p-4 sm:p-6 md:p-9">
          <div className="md:hidden flex items-center justify-between gap-3 pb-5">
            <button type="button" onClick={() => setMobileNavOpen(true)} aria-expanded={mobileNavOpen} aria-controls="mobile-dashboard-navigation" className="inline-flex items-center gap-2 border border-white/10 px-3 py-2 text-xs font-semibold">
              <Menu className="h-4 w-4"/> Menu
            </button>
            <div className="ashqe-mono text-[9px] tracking-[.16em] text-white/35 uppercase">{flatNav.find(([id]) => id===tab)?.[1]}</div>
          </div>

          {tab === "home" && <CommandHome connection={connection} stats={stats} setTab={navigateTab} initialMessages={initialMessages} sessionId={sessionId} onDraftCreated={(draft) => setDrafts((current) => [draft, ...current])} />}\n          {tab === "profile" && <Profile connection={connection} style={style} />}
          {tab === "research" && <Research research={research} setResearch={setResearch} runResearch={runResearch} result={researchResult} />}
          {tab === "radar" && <Radar />}
          {tab === "opportunities" && <Opportunities />}
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

function CommandHome({
  connection,
  stats,
  setTab,
  initialMessages,
  sessionId,
  onDraftCreated,
}: {
  connection: Props["connection"]
  stats: Props["stats"]
  setTab: (x: TabId) => void
  initialMessages: UIMessage[]
  sessionId: string | null
  onDraftCreated: (draft: Draft) => void
}) {
  const cards = [
    ["01", "RADAR", "See what is moving around the topics you care about.", "radar"],
    ["02", "RESEARCH", "Go from a question to evidence and a usable brief.", "research"],
    ["03", "STUDIO", "Turn an observation into a post in your voice.", "studio"],
    ["04", "BD", "Research people, projects and communities worth knowing.", "bd"],
  ] as const

  return (
    <div>
      <div className="max-w-4xl">
        <div className="ashqe-mono text-xs text-[#ffffff] uppercase tracking-[.18em]">Personal X intelligence</div>
        <h1 className="ashqe-display text-5xl md:text-7xl mt-3 leading-[.92]">Good evening,<br/>{connection.name || "@" + connection.username}.</h1>
        <p className="text-muted-foreground mt-5 text-lg max-w-2xl">You do not need to find the right screen first. Tell Ashqe what you want to do and let the operator route the work.</p>
      </div>

      <div className="mt-10">
        <ChatPanel
          initialMessages={initialMessages}
          sessionId={sessionId}
          connectedUsername={connection.username}
          onDraftCreated={onDraftCreated}
        />
      </div>

      <div className="mt-8 grid md:grid-cols-4 gap-px bg-white/10 border border-white/10">
        {cards.map(([n, k, title, destination]) => (
          <button key={n} onClick={() => setTab(destination)} className="text-left bg-background p-5 min-h-36 hover:bg-white/[.03] transition">
            <div className="ashqe-mono text-[10px] text-muted-foreground">{n} / {k}</div>
            <p className="mt-8 text-sm leading-6">{title}</p>
            <span className="text-xs text-[#ffffff] mt-3 inline-block">Open →</span>
          </button>
        ))}
      </div>

      <div className="mt-8 grid md:grid-cols-3 gap-4">
        <Metric label="Posts analyzed" value={stats.postsAnalyzed} />
        <Metric label="Drafts" value={stats.drafts} />
        <Metric label="Published" value={stats.published} />
      </div>
    </div>
  )
}

function Opportunities() {
  const [items, setItems] = useState<Array<{
    key:string; type:string; title:string; whyNow:string; action:string;
    confidence:number; urgency:number;
    evidence:Array<{tweetId:string;url:string;text:string;authorId:string|null}>
  }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch("/api/opportunities")
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || "Could not load opportunities")
        if (!cancelled) setItems(data.opportunities ?? [])
      })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Could not load opportunities") })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  return <div>
    <SectionTitle eyebrow="OPPORTUNITY INBOX" title="Act on what matters." sub="Evidence-backed opportunities assembled from the public X signals Ashqe is already tracking." />
    <div className="mt-8 border border-white/10 divide-y divide-white/10">
      {loading && <div className="p-6 text-sm text-muted-foreground">Scanning indexed signals…</div>}
      {error && <div className="p-6 text-sm text-red-300">{error}</div>}
      {!loading && !error && items.length === 0 && <div className="p-8 text-sm text-muted-foreground">Nothing worth acting on yet. Run Radar to look for stronger signals in the context you are watching.</div>}
      {!loading && !error && items.map((item) => (
        <article key={item.key} className="p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-3 text-[10px] ashqe-mono uppercase tracking-widest text-muted-foreground">
            <span>{item.type}</span><span>confidence {item.confidence}</span><span>urgency {item.urgency}/5</span>
          </div>
          <h3 className="mt-3 text-lg font-medium">{item.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.whyNow}</p>
          <p className="mt-3 text-sm">{item.action}</p>
          {item.evidence.length > 0 && <div className="mt-5 grid gap-px bg-white/10 md:grid-cols-2">
            {item.evidence.slice(0,2).map((e) => <a key={e.tweetId} href={e.url} target="_blank" rel="noreferrer" className="bg-background p-4 hover:bg-white/[.03] transition">
              <div className="text-[10px] ashqe-mono text-muted-foreground">EVIDENCE / X</div>
              <p className="mt-2 text-sm line-clamp-4">{e.text}</p>
            </a>)}
          </div>}
        </article>
      ))}
    </div>
  </div>
}

function Research({research,setResearch,runResearch,result}:{research:string;setResearch:(x:string)=>void;runResearch:()=>void;result:string|null}) {
 return <div><SectionTitle eyebrow="RESEARCH LAB" title="Go broad. Go deep." sub="General research, niche intelligence, projects, people, competitors and living research briefs." />
 <div className="mt-8 max-w-3xl flex gap-2"><input value={research} onChange={e=>setResearch(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runResearch()} aria-label="Research query" placeholder="Research a topic, project, person or niche…" className="focus-ring flex-1 bg-white/5 border border-white/10 px-4 py-3 outline-none"/><button onClick={runResearch} className="bg-[#ffffff] text-black px-5 font-semibold">Research</button></div>
 <div className="grid md:grid-cols-3 gap-4 mt-8">{["Deep research","Niche monitor","Competitor watch"].map((x,i)=><div className="border border-white/10 p-5 min-h-32" key={x}><div className="ashqe-mono text-[10px] text-[#ffffff]">0{i+1}</div><h3 className="mt-7">{x}</h3><p className="text-xs text-muted-foreground mt-2">Continuous context, changes and source trails.</p></div>)}</div>
 {result&&<div className="mt-8 border border-[#ffffff]/30 bg-[#ffffff]/5 p-5 text-sm">{result}</div>}</div>
}

function Radar(){
  const [signals,setSignals]=useState<any[]>([])
  const [scanning,setScanning]=useState(false)
  const [message,setMessage]=useState<string | null>(null)
  const load=()=>fetch("/api/signals").then(r=>r.ok?r.json():null).then(d=>setSignals(d?.signals??[]))
  useEffect(()=>{load()},[])
  const scan=async()=>{
    setScanning(true); setMessage(null)
    try {
      const res=await fetch("/api/radar/scan",{method:"POST"})
      const data=await res.json().catch(()=>({}))
      if(!res.ok) throw new Error(data.error||"Radar scan failed")
      await load()
      setMessage(data.count ? `Scan complete · ${data.count} new signals` : "Scan complete · no new signals")
    } catch(error) { setMessage(error instanceof Error ? error.message : "Radar scan failed") }
    finally { setScanning(false) }
  }
  return <div><SectionTitle eyebrow="RADAR" title="See movement before the crowd." sub="Ashqe turns the goals, interests and projects you asked it to remember into bounded public-X scans, then preserves the evidence trail."/>
    <div className="mt-8 flex flex-wrap justify-end items-center gap-3"><span className="text-xs text-muted-foreground">{message}</span><button disabled={scanning} onClick={scan} className="bg-white text-black px-4 py-2 text-xs font-semibold">{scanning?"Scanning…":"Scan my radar"}</button></div>
    <div className="mt-4 border border-white/10 divide-y divide-white/10">{signals.length?signals.map((x,i)=><div key={x.id} className="p-5 flex justify-between gap-6"><div><div className="ashqe-mono text-[10px] text-[#ffffff]">SIGNAL {String(i+1).padStart(2,"0")} · {x.type}</div><div className="mt-2 font-medium">{x.title}</div><p className="mt-2 text-sm text-muted-foreground max-w-2xl">{x.summary}</p>{x.source_url&&<a className="text-xs text-[#ffffff] mt-3 inline-block" href={x.source_url} target="_blank" rel="noreferrer">Open source →</a>}</div><div className="ashqe-mono text-[10px] text-muted-foreground shrink-0">{x.confidence ?? 0}%</div></div>):<div className="p-8 text-sm text-muted-foreground">No signals yet. Scan your radar and Ashqe will use your saved context to discover relevant public-X movement.</div>}</div></div>
}

function Growth({stats}:{stats:Props["stats"]}){
  const [data,setData]=useState<any>(null)
  useEffect(()=>{fetch("/api/growth").then(r=>r.ok?r.json():null).then(setData)},[])
  return <div><SectionTitle eyebrow="GROWTH" title="A growth manager that knows your account." sub="Measure patterns from your real X history, then turn them into controlled experiments."/>
    <div className="grid md:grid-cols-3 gap-4 mt-8"><Metric label="Posts analyzed" value={stats.postsAnalyzed}/><Metric label="Published" value={stats.published}/><Metric label="Draft queue" value={stats.drafts}/></div>
    <div className="mt-8 border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#ffffff]">ACCOUNT INSIGHTS</div>{data?.analysis?.insights?.length?data.analysis.insights.map((x:any,i:number)=><div key={i} className="mt-5 border-t border-white/10 pt-4"><div className="font-medium">{x.title||x.name||"Insight"}</div><p className="text-sm text-muted-foreground mt-1">{x.summary||x.reason||String(x)}</p></div>):<p className="text-sm text-muted-foreground mt-4">{data?"Not enough structured history for AI analysis yet.":"Loading your X history…"}</p>}</div>
    <div className="mt-6 border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#ffffff]">EXPERIMENT QUEUE</div>{data?.analysis?.experiments?.length?data.analysis.experiments.map((x:any,i:number)=><div key={i} className="mt-4 text-sm">{i+1}. {x.title||x.name||String(x)} {x.hypothesis&&<span className="text-muted-foreground"> — {x.hypothesis}</span>}</div>):<p className="text-sm text-muted-foreground mt-4">Experiments will appear after account history is analyzed.</p>}</div>
  </div>
}

function BD(){
  const [query,setQuery]=useState(""); const [result,setResult]=useState<any>(null); const [loading,setLoading]=useState(false)
  const run=async()=>{if(!query.trim())return;setLoading(true);const r=await fetch("/api/bd",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query})});const d=await r.json();setResult(d.result||d);setLoading(false)}
  return <div><SectionTitle eyebrow="BD ENGINE" title="Turn the network into opportunities." sub="Research people, companies, projects and communities with a clear reason to reach out and a specific collaboration angle."/>
    <div className="mt-8 flex gap-2 max-w-3xl"><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&run()} aria-label="BD research query" placeholder="Find potential partners in…" className="flex-1 bg-white/5 border border-white/10 px-4 py-3"/><button onClick={run} className="bg-[#ffffff] text-black px-5 font-semibold">{loading?"…":"Research"}</button></div>
    <div className="mt-8 border border-white/10 divide-y divide-white/10">{result?.opportunities?.length?result.opportunities.map((x:any,i:number)=><div key={i} className="p-6"><div className="ashqe-mono text-[10px] text-[#ffffff]">OPPORTUNITY {String(i+1).padStart(2,"0")}</div><h3 className="mt-3 text-lg">{x.name}</h3><p className="text-sm text-muted-foreground mt-2">{x.why}</p><p className="text-sm mt-3">{x.angle}</p>{x.evidence_url&&<a href={x.evidence_url} target="_blank" rel="noreferrer" className="text-xs text-[#ffffff] mt-3 inline-block">Evidence →</a>}</div>):<div className="p-8 text-sm text-muted-foreground">Start with a market, niche, or type of person. Ashqe will return evidence-backed opportunities.</div>}</div>
  </div>
}

function Automations(){
  const [policy,setPolicy]=useState<any>(null)
  const [saving,setSaving]=useState(false)
  const [jobs,setJobs]=useState<any[]>([])
  const [actions,setActions]=useState<any[]>([])
  const [name,setName]=useState("")
  const [instruction,setInstruction]=useState("")
  const [message,setMessage]=useState("")

  const load=async()=>{
    const [p,j,a]=await Promise.all([
      fetch("/api/execution-policy").then(r=>r.ok?r.json():null),
      fetch("/api/automations").then(r=>r.ok?r.json():null),
      fetch("/api/action-log").then(r=>r.ok?r.json():null),
    ])
    setPolicy(p?.policy ?? {autonomous_enabled:false,autonomous_posts:false,autonomous_replies:false,max_posts_per_day:3,max_replies_per_day:5,allowed_hours_start:8,allowed_hours_end:22,require_reply_opt_in:true,require_ai_reply_approval:true})
    setJobs(j?.jobs ?? [])
    setActions(a?.actions ?? [])
  }
  useEffect(()=>{load()},[])

  const save=async(next:any)=>{
    setSaving(true); setMessage("")
    const res=await fetch("/api/execution-policy",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(next)})
    const data=await res.json()
    setPolicy(data.policy ?? next)
    setSaving(false)
    setMessage(res.ok?"Autonomous policy saved.":"Could not save policy.")
  }

  const createJob=async()=>{
    if(!name.trim()||!instruction.trim()) return
    const res=await fetch("/api/automations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,instruction,schedule:"0 8 * * *",timezone:Intl.DateTimeFormat().resolvedOptions().timeZone,destination:"app",permission:"suggest",action_type:"research",require_approval:true})})
    if(res.ok){setName("");setInstruction("");setMessage("Automation created.");load()}else setMessage("Could not create automation.")
  }

  if(!policy) return <div className="text-sm text-muted-foreground">Loading automation controls…</div>
  return <div>
    <SectionTitle eyebrow="AUTOMATIONS" title="Tell Ashqe once. Let it remember." sub="Research, radar, briefs and approved X actions can run on a schedule. Autonomous execution is OFF by default." />

    <div className="mt-8 border border-white/10">
      <div className="p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-white/10">
        <div>
          <div className="ashqe-mono text-xs text-[#ffffff]">AUTONOMOUS MODE</div>
          <h3 className="text-2xl mt-2">{policy.autonomous_enabled ? "Ashqe can act for you." : "Ashqe is approval-only."}</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-xl">Turning this on gives Ashqe permission to execute only the specific action types you enable below. Every action is policy-checked and logged.</p>
        </div>
        <button onClick={()=>save({...policy,autonomous_enabled:!policy.autonomous_enabled})} disabled={saving} className={"px-6 py-3 font-semibold " + (policy.autonomous_enabled?"bg-[#ffffff] text-black":"bg-white text-black")}>
          {policy.autonomous_enabled ? "ON · Turn off" : "OFF · Turn on"}
        </button>
      </div>

      <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10">
        <PermissionRow title="Autonomous posts" description="Allow scheduled jobs to publish original posts." enabled={policy.autonomous_posts} disabled={!policy.autonomous_enabled} onChange={(v:boolean)=>save({...policy,autonomous_posts:v})}/>
        <PermissionRow title="Autonomous replies" description="Requires recipient opt-in and X's required AI-reply approval." enabled={policy.autonomous_replies} disabled={!policy.autonomous_enabled} onChange={(v:boolean)=>save({...policy,autonomous_replies:v})}/>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 border-t border-white/10">
        <LimitField label="Posts / day" value={policy.max_posts_per_day} onChange={(v:number)=>setPolicy({...policy,max_posts_per_day:v})}/>
        <LimitField label="Replies / day" value={policy.max_replies_per_day} onChange={(v:number)=>setPolicy({...policy,max_replies_per_day:v})}/>
        <LimitField label="Start hour" value={policy.allowed_hours_start} onChange={(v:number)=>setPolicy({...policy,allowed_hours_start:v})}/>
        <LimitField label="End hour" value={policy.allowed_hours_end} onChange={(v:number)=>setPolicy({...policy,allowed_hours_end:v})}/>
      </div>
      <div className="p-4 border-t border-white/10 flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{message || "Limits are enforced server-side before every autonomous action."}</span>
        <button onClick={()=>save(policy)} className="text-xs bg-white/10 hover:bg-white/15 px-4 py-2">Save limits</button>
      </div>
    </div>

    <div className="mt-6 border border-white/20 bg-white/[.03] p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div><div className="ashqe-mono text-[10px] text-white">EMERGENCY STOP</div><p className="text-sm mt-2">Immediately disable autonomous posts and replies.</p></div>
      <button onClick={()=>save({...policy,autonomous_enabled:false,autonomous_posts:false,autonomous_replies:false})} className="border border-white/30 text-white px-5 py-2 text-sm">Stop all automation</button>
    </div>

    <div className="mt-8 border border-white/10 p-6">
      <div className="ashqe-mono text-xs text-[#ffffff]">CREATE JOB</div>
      <div className="grid md:grid-cols-3 gap-3 mt-4">
        <input value={name} onChange={e=>setName(e.target.value)} aria-label="Automation name" placeholder="Morning radar" className="bg-white/5 border border-white/10 px-4 py-3 outline-none"/>
        <input value={instruction} onChange={e=>setInstruction(e.target.value)} aria-label="Automation instruction" placeholder="Research what changed in my niches overnight" className="bg-white/5 border border-white/10 px-4 py-3 outline-none md:col-span-1"/>
        <button onClick={createJob} className="bg-[#ffffff] text-black px-5 py-3 font-semibold">Create automation</button>
      </div>
    </div>

    <div className="mt-8 grid lg:grid-cols-2 gap-6">
      <div className="border border-white/10 p-6">
        <div className="ashqe-mono text-xs text-[#ffffff]">SCHEDULED JOBS</div>
        <div className="mt-5 space-y-3">{jobs.length?jobs.map(j=><div key={j.id} className="border border-white/10 p-4"><div className="font-medium">{j.name}</div><div className="text-xs text-muted-foreground mt-1">{j.instruction}</div><div className="ashqe-mono text-[10px] mt-3 text-muted-foreground">{j.schedule} · {j.destination} · {j.permission}</div></div>):<p className="text-sm text-muted-foreground mt-4">No automations yet.</p>}</div>
      </div>
      <div className="border border-white/10 p-6">
        <div className="ashqe-mono text-xs text-[#ffffff]">ACTIVITY LOG</div>
        <div className="mt-5 space-y-3">{actions.length?actions.slice(0,8).map(a=><div key={a.id} className="border border-white/10 p-4"><div className="flex justify-between"><span className="text-sm">{a.action_type}</span><span className="ashqe-mono text-[10px]">{a.status}</span></div><div className="text-xs text-muted-foreground mt-2">{a.reason}</div></div>):<p className="text-sm text-muted-foreground mt-4">No actions recorded.</p>}</div>
      </div>
    </div>

    <div className="mt-5 text-xs text-muted-foreground border-l-2 border-[#ffffff] pl-4">Autonomous replies remain disabled unless the account has the required X approval and the interaction satisfies opt-in requirements.</div>
  </div>
}

function PermissionRow({title,description,enabled,disabled,onChange}:{title:string;description:string;enabled:boolean;disabled:boolean;onChange:(v:boolean)=>void}){
 return <div className="p-6 flex items-center justify-between gap-5"><div><div className="font-medium">{title}</div><p className="text-xs text-muted-foreground mt-1 max-w-md">{description}</p></div><button disabled={disabled} onClick={()=>onChange(!enabled)} className={"w-12 h-7 border border-white/20 p-1 transition "+(enabled?"bg-[#ffffff]":"bg-white/10")+" "+(disabled?"opacity-40":"")}><span className={"block w-5 h-5 bg-black transition "+(enabled?"translate-x-5":"")}/></button></div>
}
function LimitField({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){
 return <label className="p-4 border-r border-white/10 last:border-r-0"><span className="ashqe-mono text-[10px] text-muted-foreground block">{label}</span><input type="number" min={0} max={20} value={value} onChange={e=>onChange(Number(e.target.value))} className="mt-2 w-full bg-white/5 border border-white/10 px-3 py-2"/></label>
}

function Profile({connection,style}:{connection:Props["connection"];style:StyleProfile|null}) {
  const profile = {
    username: connection.username,
    name: connection.name,
    tone: style?.tone ?? null,
    length_pref: style?.length_pref ?? null,
    rhythm: style?.rhythm ?? null,
    topics: style?.topics ?? [],
    signature_phrases: style?.signature_phrases ?? [],
    do_list: style?.do_list ?? [],
    dont_list: style?.dont_list ?? [],
    summary: style?.summary ?? null,
    posts_analyzed: style?.posts_analyzed ?? 0,
  }
  return <div>
    <SectionTitle eyebrow="PROFILE / VOICE DNA" title="This is how Ashqe knows you." sub="Your Voice DNA is built from your connected X history and refined as you use Ashqe. The branded card is yours to keep." />
    <div className="mt-8"><DnaCard profile={profile} /></div>
  </div>
}

function Memory({style}:{style:StyleProfile|null}){
  const [memories,setMemories]=useState<any[]>([])
  const [title,setTitle]=useState(""); const [content,setContent]=useState("")
  const load=()=>fetch("/api/memory").then(r=>r.ok?r.json():null).then(d=>setMemories(d?.memories??[]))
  useEffect(()=>{load()},[])
  const add=async()=>{if(!title.trim()||!content.trim())return;const r=await fetch("/api/memory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title,content,kind:"fact",importance:4})});if(r.ok){setTitle("");setContent("");load()}}
  return <div><SectionTitle eyebrow="MEMORY" title="Build the model of you." sub="Voice, interests, projects, goals and rules become durable context. You control what Ashqe remembers."/>
    <div className="mt-8 grid lg:grid-cols-2 gap-6">
      <div className="border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#ffffff]">VOICE PROFILE</div><p className="mt-5 text-sm text-muted-foreground">{style?.summary || "Your voice profile grows from connected X history."}</p><div className="mt-5 text-xs text-muted-foreground">{style?.posts_analyzed ?? 0} posts analyzed</div></div>
      <div className="border border-white/10 p-6"><div className="ashqe-mono text-xs text-[#ffffff]">ADD MEMORY</div><input value={title} onChange={e=>setTitle(e.target.value)} aria-label="Memory title" placeholder="Title" className="mt-4 w-full bg-white/5 border border-white/10 px-3 py-2"/><textarea value={content} onChange={e=>setContent(e.target.value)} aria-label="Memory content" placeholder="Something Ashqe should remember…" className="mt-2 w-full min-h-24 bg-white/5 border border-white/10 px-3 py-2"/><button onClick={add} className="mt-3 bg-white text-black px-4 py-2 text-sm font-semibold">Save memory</button></div>
    </div>
    <div className="mt-8 border border-white/10"><div className="p-5 border-b border-white/10 ashqe-mono text-xs text-[#ffffff]">MEMORY BANK</div>{memories.length?memories.map(m=><div key={m.id} className="p-5 border-b border-white/10 last:border-0"><div className="flex justify-between gap-4"><div><div className="font-medium">{m.title}</div><p className="text-sm text-muted-foreground mt-1">{m.content}</p></div><button onClick={async()=>{await fetch("/api/memory?id="+m.id,{method:"DELETE"});load()}} className="text-xs text-white">Forget</button></div></div>):<div className="p-6 text-sm text-muted-foreground">No explicit memories yet.</div>}</div>
  </div>
}

function SectionTitle({eyebrow,title,sub}:{eyebrow:string;title:string;sub:string}){return <div className="max-w-4xl"><div className="ashqe-mono text-xs text-[#ffffff] tracking-[.18em]">{eyebrow}</div><h2 className="ashqe-display text-4xl md:text-6xl mt-3 leading-none">{title}</h2><p className="text-muted-foreground mt-4 max-w-2xl leading-7">{sub}</p></div>}
function Metric({label,value}:{label:string;value:string|number}){return <div className="border border-white/10 p-5"><div className="ashqe-mono text-[10px] text-muted-foreground uppercase">{label}</div><div className="ashqe-display text-4xl mt-3">{value}</div></div>}
