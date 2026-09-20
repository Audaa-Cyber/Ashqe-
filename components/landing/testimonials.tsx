export default function Testimonials() {
  const pillars = [
    ["RESEARCH","General + niche research with source-aware briefs."],
    ["RADAR","Detect movement, language and conversations that are accelerating."],
    ["GROWTH","Learn what works on your account and turn it into experiments."],
    ["EXECUTION","Turn approved recommendations into drafts, workflows and scheduled jobs."],
  ]
  return (
    <section className="border-y border-white/10 bg-[#0b0d10] py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-3xl">
          <div className="ashqe-mono text-xs uppercase tracking-[.18em] text-[#d9ff4f]">The operating layer</div>
          <h2 className="ashqe-display mt-4 text-5xl md:text-7xl leading-none">Less content machine.<br/>More personal intelligence.</h2>
          <p className="mt-6 max-w-2xl text-white/55 leading-7">Ashqe is designed around one outcome: helping you make better decisions about where to spend attention, what to learn, who to talk to and what to ship.</p>
        </div>
        <div className="mt-14 grid md:grid-cols-4 gap-px bg-white/10 border border-white/10">
          {pillars.map(([title,body],i)=><div key={title} className="bg-[#0b0d10] p-6 min-h-48"><div className="ashqe-mono text-[10px] text-white/30">0{i+1}</div><h3 className="mt-12 text-lg">{title}</h3><p className="mt-3 text-sm leading-6 text-white/45">{body}</p></div>)}
        </div>
      </div>
    </section>
  )
}
