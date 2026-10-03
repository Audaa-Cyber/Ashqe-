"use client"

import { useLayoutEffect, useRef } from "react"
import gsap from "gsap"

type SplitTextProps = {
  text: string
  className?: string
  delay?: number
}

export function SplitText({ text, className = "", delay = 0 }: SplitTextProps) {
  const root = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    const node = root.current
    if (!node) return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return

    const chars = Array.from(node.querySelectorAll<HTMLElement>("[data-split-char]"))
    const ctx = gsap.context(() => {
      gsap.fromTo(chars,
        { yPercent: 105, opacity: 0, rotateX: -60, filter: "blur(5px)" },
        { yPercent: 0, opacity: 1, rotateX: 0, filter: "blur(0px)", duration: 0.9, delay, stagger: 0.025, ease: "power4.out" }
      )
    }, node)
    return () => ctx.revert()
  }, [delay, text])

  return (
    <span ref={root} className={className} aria-label={text}>
      {Array.from(text).map((char, index) => (
        <span key={index} data-split-char aria-hidden="true" className="inline-block will-change-transform">
          {char === " " ? "\u00a0" : char}
        </span>
      ))}
    </span>
  )
}
