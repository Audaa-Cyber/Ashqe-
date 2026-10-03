import Link from "next/link"

export default function FinalCTA(){
  return <section className="border-b border-white/10 py-24"><div className="mx-auto max-w-5xl px-6 text-center"><h2 className="ashqe-display text-6xl leading-[.9] md:text-8xl">Stop scrolling<br/>for signal.</h2><p className="mx-auto mt-7 max-w-2xl text-lg leading-8 text-white/50">Connect X. Give Ashqe context. Let it find what matters and help you act on it.</p><Link href="/connect" className="mt-9 inline-flex h-12 items-center bg-white px-7 text-sm font-bold text-black">Enter Ashqe →</Link></div></section>
}
