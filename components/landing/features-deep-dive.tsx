export default function FeaturesDive() {
  const features=[
    ["RESEARCH","General + niche research with source trails, evidence and clear next moves."],
    ["RADAR","Find acceleration, new language, conversation spikes and cross-community movement."],
    ["GROWTH","Learn from your actual account history and turn patterns into controlled experiments."],
    ["BD","Research people, companies, projects and communities with a reason and a specific angle."],
    ["MEMORY","Keep durable context about your voice, projects, interests and decisions under your control."],
    ["EXECUTION","Turn approved intelligence into drafts, scheduled jobs and guarded X actions."],
  ]
  return <section id="features" className="border-b border-white/10 py-24 bg-white/[.015]"><div className="mx-auto max-w-7xl px-6"><div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8"><div><div className="ashqe-mono text-xs text-[#ffffff]">SYSTEM / 03</div><h2 className="ashqe-display mt-4 text-5xl md:text-7xl leading-none">Six systems.<br/>One context.</h2></div><p className="max-w-md text-sm leading-7 text-white/45">Every surface shares the same memory and permission model. You are not jumping between disconnected AI tools.</p></div><div className="mt-14 grid md:grid-cols-2 lg:grid-cols-3 border-t border-l border-white/10">{features.map(([t,d],i)=><div key={t} className="border-r border-b border-white/10 p-7 min-h-52"><div className="ashqe-mono text-[10px] text-[#ffffff]">0{i+1}</div><h3 className="mt-12 text-xl">{t}</h3><p className="mt-3 text-sm leading-6 text-white/45">{d}</p></div>)}</div></div></section>
}
