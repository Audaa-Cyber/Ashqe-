"use client"

import { useEffect, useRef, useState } from "react"

export default function MouseAtmosphere() {
  const glowRef = useRef<HTMLDivElement>(null)
  const dotRef = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const [interactive, setInteractive] = useState(false)
  const [pressing, setPressing] = useState(false)

  useEffect(() => {
    const glow = glowRef.current
    const dot = dotRef.current
    const ring = ringRef.current
    if (!glow || !dot || !ring) return

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    const coarsePointer = window.matchMedia("(pointer: coarse)")
    if (reducedMotion.matches || coarsePointer.matches) return

    document.documentElement.classList.add("ashqe-cursor-enabled")

    let targetX = window.innerWidth * 0.5
    let targetY = window.innerHeight * 0.35
    let currentX = targetX
    let currentY = targetY
    let ringX = targetX
    let ringY = targetY
    let frame = 0

    const move = (event: PointerEvent) => {
      targetX = event.clientX
      targetY = event.clientY

      const target = event.target
      if (target instanceof Element) {
        setInteractive(Boolean(target.closest("a,button,[role='button'],input,textarea,select,[data-cursor='interactive']")))
      }
    }

    const down = () => setPressing(true)
    const up = () => setPressing(false)

    const render = () => {
      currentX += (targetX - currentX) * 0.18
      currentY += (targetY - currentY) * 0.18
      ringX += (targetX - ringX) * 0.12
      ringY += (targetY - ringY) * 0.12

      glow.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate3d(-50%, -50%, 0)`
      dot.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`
      ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`
      frame = requestAnimationFrame(render)
    }

    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerdown", down, { passive: true })
    window.addEventListener("pointerup", up, { passive: true })
    window.addEventListener("blur", up)
    frame = requestAnimationFrame(render)

    return () => {
      document.documentElement.classList.remove("ashqe-cursor-enabled")
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerdown", down)
      window.removeEventListener("pointerup", up)
      window.removeEventListener("blur", up)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div ref={glowRef} className="ashqe-mouse-glow" />
      </div>
      <div aria-hidden="true" className={`ashqe-premium-cursor ${interactive ? "is-hovering" : ""} ${pressing ? "is-pressing" : ""}`}>
        <div ref={dotRef} className="ashqe-cursor-dot" />
        <div ref={ringRef} className="ashqe-cursor-ring" />
      </div>
    </>
  )
}
