"use client"

import { useState } from "react"

const items=[
["Does Ashqe post for me?","Only when you explicitly enable autonomous posting and the server-side policy allows the action. It is OFF by default."],
["Can I control autonomous replies?","Yes. Replies have their own permission switch, daily cap and opt-in requirement. AI-powered automated replies also remain gated on the required X approval."],
["Does Ashqe know my writing style?","It builds a structured voice profile from your connected X history and can keep additional memories you explicitly add."],
["Where does research come from?","Live web research can use the configured research provider and Ashqe can also use connected X context. Findings retain source URLs where available."],
["Can I stop automation instantly?","Yes. The Automations surface has an emergency stop, and Telegram supports /pause."],
["Can I forget something?","Yes. Explicit memories can be deleted from the Memory surface."],
]
export default function FAQ(){
 const [open,setOpen]=useState<number|null>(null)
 return <section id="faq" className="border-b border-white/10 py-24"><div className="mx-auto max-w-5xl px-6"><div className="ashqe-mono text-xs text-[#ffffff]">FAQ / 08</div><h2 className="ashqe-display mt-4 text-5xl md:text-7xl">Clear rules.<br/>No black box.</h2><div className="mt-12 border-t border-white/10">{items.map(([q,a],i)=><div key={q} className="border-b border-white/10"><button onClick={()=>setOpen(open===i?null:i)} className="w-full flex items-center justify-between gap-6 py-6 text-left"><span className="text-lg">{q}</span><span className="ashqe-mono text-xs text-[#ffffff]">{open===i?"−":"+"}</span></button>{open===i&&<p className="max-w-3xl pb-6 text-sm leading-7 text-white/50">{a}</p>}</div>)}</div></div></section>
}
