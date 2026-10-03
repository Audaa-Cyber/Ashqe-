export default function HowItWorks() {
  const steps = [
    ["01","OBSERVE","Ashqe watches your connected X context, monitored niches and research sources."],
    ["02","UNDERSTAND","It connects signals with your voice, projects, history and goals instead of treating every prompt as a blank slate."],
    ["03","ACT","Research, draft, reply, schedule or publish. Every consequential X action passes through your permission policy."],
    ["04","LEARN","Outcomes feed your memory and account intelligence so the system gets more useful over time."],
  ]
  return <section id="how-it-works" className="border-b border-white/10 py-20">
    <div className="mx-auto max-w-7xl px-6"><div className="max-w-3xl"><h2 className="ashqe-display text-5xl leading-none md:text-7xl">Not a writer.<br/>An operating loop.</h2><p className="mt-6 text-lg leading-8 text-white/55">The product is designed around a continuous loop: observe the world, understand what matters to you, act with intent, then remember what happened.</p></div>
      <div className="mt-12 grid border border-white/10 md:grid-cols-4">{steps.map(([n,t,d])=><div key={n} className="min-h-64 border-b border-white/10 p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="ashqe-mono text-[10px] text-white/35">{n}</div><h3 className="mt-16 text-xl">{t}</h3><p className="mt-3 text-sm leading-6 text-white/45">{d}</p></div>)}</div>
    </div>
  </section>
}
