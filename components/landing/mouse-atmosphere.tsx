"use client"

import { useEffect, useRef } from "react"

export default function MouseAtmosphere() {
  const glowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const glow = glowRef.current
    if (!glow) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const coarsePointer = window.matchMedia("(pointer: coarse)")
    if (reducedMotion.matches || coarsePointer.matches) return

    let targetX = window.innerWidth * 0.5
    let targetY = window.innerHeight * 0.35
    let currentX = targetX
    let currentY = targetY
    let frame = 0

    const move = (event: PointerEvent) => {
      targetX = event.clientX
      targetY = event.clientY
    }

    const render = () => {
      currentX += (targetX - currentX) * 0.085
      currentY += (targetY - currentY) * 0.085
      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate3d(-50%, -50%, 0)`
      frame = requestAnimationFrame(render)
    }

    window.addEventListener("pointermove", move, { passive: true })
    frame = requestAnimationFrame(render)

    return () => {
      window.removeEventListener("pointermove", move)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div ref={glowRef} className="ashqe-mouse-glow" />
    </div>
  )
}
