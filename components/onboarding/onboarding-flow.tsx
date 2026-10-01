"use client"

import { useState } from "react"
import { ArrowRight, Check, Sparkles } from "lucide-react"

const goals = ["Grow my audience","Build authority","Meet more people","Find builders / projects","Promote my work","Find opportunities"]
const autonomy = [
  ["Observe","Watch my X world and tell me what matters.","observe"],
  ["Assist","Research and prepare work for me.","assist"],
  ["Act with approval","Prepare actions and ask before executing.","approval"],
  ["Autonomous","Execute only the categories and limits I allow.","autonomous"],
] as const

export default function OnboardingFlow({username,name,style}:{username:string;name:string|null;style:{tone:string|null;length_pref:string|null;rhythm:string|null;summary:string|null;posts_analyzed:number|null}|null}) {
  const [step,setStep]=useState(0)
  const [selectedGoals,setSelectedGoals]=useState<string[]>([])
  const [topics,setTopics]=useState("")
  const [mode,setMode]=useState("approval")
  const [saving,setSaving]=useState(false)

  const next=()=>setStep(s=>Math.min(4,s+1))
  const finish=async()=>{
    setSaving(true)
    const memories=[
      ...selectedGoals.map(g=>({title:"X goal",content:g,kind:"goal",importance:4})),
      ...(topics.split(",").map(x=>x.trim()).filter(Boolean).map(x=>({title:"Radar topic",content:x,kind:"interest",importance:3}))),
      {title:"Autonomy preference",content:mode,kind:"preference",importance:4},
    ]
    await Promise.all(memories.map(m=>fetch("/api/memory",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(m)}).catch(()=>null)))
    window.location.href="/dashboard"
  }

  return <main className="min-h-screen bg-background text-foreground">
    <header className="h-16 border-b border-white/10 flex items-center justify-between px-5 sm:px-8">
      <div className="ashqe-display text-xl">Ashqe<span className="text-white/40">.</span></div>
      <div className="ashqe-mono text-[9px] tracking-[.18em] text-white/35">INITIALIZING YOUR OPERATOR</div>
    </header>
    <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-6xl lg:grid-cols-[220px_1fr]">
      <aside className="hidden lg:block border-r border-white/10 p-6">
        <div className="ashqe-mono text-[9px] text-white/30">SETUP</div>
        <div className="mt-6 space-y-4">{["Welcome","Goals","Radar","Voice","Autonomy"].map((x,i)=><div key={x} className={`flex gap-3 items-center text-xs ${i===step?"text-white":"text-white/30"}`}><span className={`w-5 h-5 border flex items-center justify-center ${i<step?"bg-white text-black border-white":i===step?"border-white":"border-white/15"}`}>{i<step?<Check className="h-3 w-3"/>:i+1}</span>{x}</div>)}</div>
      </aside>
      <section className="p-5 sm:p-8 md:p-12 flex items-center">
        <div className="w-full max-w-3xl">
          {step===0&&<div><div className="ashqe-mono text-xs tracking-[.18em] text-white/45">WELCOME / @{username}</div><h1 className="ashqe-display text-5xl sm:text-7xl mt-5 leading-[.9]">Let's set up<br/>your Ashqe.</h1><p className="mt-6 text-white/55 max-w-xl leading-7">I'll learn the shape of your X world first, then configure what I watch, remember and do for you.</p><button onClick={next} className="mt-9 bg-white text-black px-6 py-3 text-sm font-bold inline-flex items-center gap-2">Start setup <ArrowRight className="h-4 w-4"/></button></div>}
          {step===1&&<div><div className="ashqe-mono text-xs text-white/45">01 / GOALS</div><h2 className="ashqe-display text-4xl sm:text-6xl mt-4">What do you want<br/>X to do for you?</h2><div className="grid sm:grid-cols-2 gap-px bg-white/10 border border-white/10 mt-8">{goals.map(g=><button key={g} onClick={()=>setSelectedGoals(v=>v.includes(g)?v.filter(x=>x!==g):[...v,g])} className={`text-left p-5 min-h-20 border-l-2 ${selectedGoals.includes(g)?"bg-white/10 border-white":"bg-background border-transparent hover:bg-white/5"}`}>{g}</button>)}</div><button onClick={next} className="mt-6 bg-white text-black px-6 py-3 text-sm font-bold">Continue</button></div>}
          {step===2&&<div><div className="ashqe-mono text-xs text-white/45">02 / RADAR</div><h2 className="ashqe-display text-4xl sm:text-6xl mt-4">What should I<br/>pay attention to?</h2><p className="mt-4 text-sm text-white/45">Add topics, projects, communities or keywords. Separate them with commas.</p><textarea value={topics} onChange={e=>setTopics(e.target.value)} placeholder="AI, wallets, Arc, Web3 builders..." className="mt-7 w-full min-h-36 border border-white/10 bg-white/[.03] p-4 outline-none focus:border-white/40 resize-none"/><button onClick={next} className="mt-6 bg-white text-black px-6 py-3 text-sm font-bold">Continue</button></div>}
          {step===3&&<div><div className="ashqe-mono text-xs text-white/45">03 / VOICE DNA</div><h2 className="ashqe-display text-4xl sm:text-6xl mt-4">This is what<br/>I learned.</h2><div className="mt-8 border border-white/10 divide-y divide-white/10"><div className="p-5"><div className="ashqe-mono text-[9px] text-white/30">VOICE</div><div className="mt-2 text-lg">{style?.tone||"Conversational"} · {style?.rhythm||"Natural rhythm"}</div></div><div className="p-5"><div className="ashqe-mono text-[9px] text-white/30">STYLE</div><div className="mt-2 text-sm text-white/60">{style?.summary||"Your voice profile will grow as you use Ashqe."}</div></div><div className="p-5"><div className="ashqe-mono text-[9px] text-white/30">SOURCE</div><div className="mt-2 text-sm text-white/60">{style?.posts_analyzed||0} posts analyzed</div></div></div><button onClick={next} className="mt-6 bg-white text-black px-6 py-3 text-sm font-bold inline-flex items-center gap-2"><Sparkles className="h-4 w-4"/> Looks good</button></div>}
          {step===4&&<div><div className="ashqe-mono text-xs text-white/45">04 / AUTONOMY</div><h2 className="ashqe-display text-4xl sm:text-6xl mt-4">How much should<br/>I do for you?</h2><div className="mt-8 space-y-px border border-white/10">{autonomy.map(([title,desc,id])=><button key={id} onClick={()=>setMode(id)} className={`w-full text-left p-5 border-l-2 ${mode===id?"bg-white/10 border-white":"border-transparent hover:bg-white/5"}`}><div className="font-semibold">{title}</div><div className="text-sm text-white/45 mt-1">{desc}</div></button>)}</div><button disabled={saving} onClick={finish} className="mt-6 bg-white text-black px-6 py-3 text-sm font-bold">{saving?"Setting up…":"Enter Ashqe →"}</button></div>}
          <div className="mt-10 flex gap-1">{[0,1,2,3,4].map(i=><span key={i} className={`h-0.5 flex-1 ${i<=step?"bg-white":"bg-white/10"}`}/>)}</div>
        </div>
      </section>
    </div>
  </main>
}