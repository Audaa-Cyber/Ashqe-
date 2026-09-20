import Link from "next/link"

export default function FinalCTA(){
  return <section className="border-b border-white/10 py-28"><div className="mx-auto max-w-5xl px-6 text-center"><div className="ashqe-mono text-xs text-[#ffffff]">BEGIN / 07</div><h2 className="ashqe-display mt-5 text-6xl md:text-8xl leading-[.9]">Stop scrolling<br/>for signal.</h2><p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/50">Connect X. Give Ashqe context. Let it find what matters and help you act on it.</p><Link href="/connect" className="mt-9 inline-flex h-12 items-center bg-[#ffffff] px-7 text-sm font-bold text-black">Enter Ashqe →</Link></div></section>
}
