"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"

const links=[["System","#features"],["Loop","#how-it-works"],["FAQ","#faq"]] as const

export default function Header(){
  const [open,setOpen]=useState(false)
  return <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08090b]/85 backdrop-blur-xl"><div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6"><Link href="/" className="ashqe-display text-xl">Ashqe<span className="text-[#d9ff4f]">.</span></Link><nav className="hidden md:flex gap-8">{links.map(([l,h])=><a key={h} href={h} className="text-sm text-white/45 hover:text-white">{l}</a>)}</nav><div className="flex items-center gap-3"><Link href="/connect" className="hidden sm:inline-flex h-10 items-center bg-[#d9ff4f] px-4 text-xs font-bold text-black">Connect X</Link><button onClick={()=>setOpen(!open)} className="md:hidden border border-white/10 p-2" aria-label="Menu">{open?<X className="h-5 w-5"/>:<Menu className="h-5 w-5"/>}</button></div></div>{open&&<div className="border-t border-white/10 p-6 md:hidden space-y-4">{links.map(([l,h])=><a key={h} href={h} onClick={()=>setOpen(false)} className="block text-sm">{l}</a>)}<Link href="/connect" className="block bg-[#d9ff4f] text-black text-center py-3 font-bold">Connect X</Link></div>}</header>
}