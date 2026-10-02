"use client"

import { useEffect, useMemo, useRef } from "react"
import { animate, stagger } from "animejs"
import gsap from "gsap"

type CloneOrbitProps = { username: string; progress: number; step: number }

const signals = [
  { label: "VOICE", angle: -22, distance: 118 },
  { label: "RHYTHM", angle: 102, distance: 132 },
  { label: "INTENT", angle: 218, distance: 124 },
]

export function CloneOrbit({ username, progress, step }: CloneOrbitProps) {
  const root = useRef<HTMLDivElement>(null)
  const core = useRef<HTMLDivElement>(null)
  const rings = useRef<HTMLDivElement[]>([])
  const particles = useRef<HTMLSpanElement[]>([])
  const phase = useMemo(() => Math.min(1, Math.max(0, progress / 100)), [progress])

  useEffect(() => {
    if (!root.current) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    const ctx = gsap.context(() => {
      gsap.fromTo(core.current, { scale: 0.82, opacity: 0.3, filter: "blur(8px)" }, { scale: 1, opacity: 1, filter: "blur(0px)", duration: 1.1, ease: "expo.out" })
      rings.current.forEach((ring, index) => {
        if (!ring) return
        gsap.to(ring, { rotate: index % 2 === 0 ? 360 : -360, duration: 18 + index * 5, ease: "none", repeat: -1 })
      })
      if (particles.current.length) animate(particles.current, { opacity: [{ to: 0.18, duration: 900 }, { to: 0.75, duration: 1200 }], scale: [{ to: 0.72, duration: 900 }, { to: 1, duration: 1200 }], delay: stagger(90), duration: 2100, ease: "inOutSine", loop: true, alternate: true })
    }, root)
    return () => ctx.revert()
  }, [])

  useEffect(() => {
    if (!core.current) return
    gsap.to(core.current, {
      scale: 1 + phase * 0.08,
      boxShadow: "0 0 " + (36 + phase * 42) + "px rgba(255,255,255," + (0.06 + phase * 0.12) + "), inset 0 0 28px rgba(255,255,255," + (0.05 + phase * 0.08) + ")",
      duration: 0.8, ease: "power3.out"
    })
  }, [phase])

  return (
    <div ref={root} className="relative h-[360px] w-[360px] sm:h-[430px] sm:w-[430px]" aria-label={"Cloning @" + username + ", step " + (step + 1)} role="img">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,.075),transparent_44%)]" />
      <div className="absolute inset-[9%] rounded-full border border-white/[.07]" />
      <div className="absolute inset-[19%] rounded-full border border-dashed border-white/[.10]" />
      <div ref={(node) => { if (node) rings.current[0] = node }} className="absolute inset-[14%] rounded-full border border-white/[.12]"><span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-white shadow-[0_0_18px_rgba(255,255,255,.65)]" /></div>
      <div ref={(node) => { if (node) rings.current[1] = node }} className="absolute inset-[27%] rounded-full border border-white/[.08]"><span className="absolute bottom-2 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-white/70" /></div>
      <div className="absolute inset-[34%] rounded-[32%] border border-white/[.08] rotate-45" />
      {signals.map((signal) => <div key={signal.label} className="absolute left-1/2 top-1/2 origin-left" style={{ transform: "rotate(" + signal.angle + "deg) translateX(" + signal.distance + "px)" }}><div className="flex items-center gap-2 -translate-y-1/2" style={{ transform: "rotate(" + (-signal.angle) + "deg)" }}><span className="h-1 w-1 rounded-full bg-white/80 shadow-[0_0_12px_rgba(255,255,255,.55)]" /><span className="ashqe-mono text-[8px] tracking-[.2em] text-white/30">{signal.label}</span></div></div>)}
      {Array.from({ length: 18 }).map((_, index) => { const angle = index * 20; const radius = 154 + (index % 3) * 16; return <span key={index} ref={(node) => { if (node) particles.current[index] = node }} className="absolute left-1/2 top-1/2 h-1 w-1 rounded-full bg-white/50" style={{ transform: "rotate(" + angle + "deg) translateY(-" + radius + "px)", transformOrigin: "0 0", opacity: 0.35 }} /> })}
      <div ref={core} className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/20 bg-[#0a0b0e]/95"><div className="absolute inset-3 rounded-full border border-white/[.08]" /><div className="relative flex flex-col items-center"><span className="ashqe-display text-3xl tracking-[-.08em]">A<span className="text-white/30">.</span></span><span className="ashqe-mono mt-1 text-[7px] tracking-[.2em] text-white/30">{Math.round(progress)}%</span></div></div>
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap"><span className="ashqe-mono text-[8px] tracking-[.24em] text-white/25">SIGNAL MODEL / @{username}</span></div>
    </div>
  )
}