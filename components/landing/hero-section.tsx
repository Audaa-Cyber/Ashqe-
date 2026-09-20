'use client';

import Link from 'next/link';
import { ArrowRight, Sparkles, Check, PenLine, Brain, Wand2 } from 'lucide-react';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden border-b border-border/50">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,hsl(var(--foreground)/0.08),transparent_35%),radial-gradient(circle_at_15%_70%,hsl(var(--foreground)/0.05),transparent_30%)]" />
      <div className="mx-auto grid min-h-[calc(100vh-73px)] max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/70 px-3.5 py-2 text-xs font-semibold tracking-wide">
            <Sparkles className="h-3.5 w-3.5" />
            YOUR PERSONAL AI AGENT FOR X
          </div>

          <h1 className="text-balance text-5xl font-semibold tracking-[-0.04em] sm:text-6xl lg:text-7xl">
            Write like you.
            <span className="block text-muted-foreground">Only faster.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-muted-foreground sm:text-xl">
            Ashqe learns your writing style from your X posts, then turns your ideas into posts that feel natural, personal, and unmistakably yours.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/connect"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-foreground px-6 text-sm font-semibold text-background transition-transform hover:-translate-y-0.5"
            >
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border px-6 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              See how it works
            </a>
          </div>

          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['Learns your voice', 'Drafts in seconds', 'You stay in control'].map((item) => (
              <span key={item} className="inline-flex items-center gap-2">
                <Check className="h-4 w-4 text-foreground" />
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-xl">
          <div className="absolute -inset-10 rounded-full bg-foreground/5 blur-3xl" />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-background/90 p-4 shadow-2xl backdrop-blur">
            <div className="rounded-2xl border border-border/70 bg-secondary/30 p-5">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Ashqe studio</p>
                  <p className="mt-1 text-sm font-medium">Your writing copilot</p>
                </div>
                <div className="rounded-lg border border-border bg-background p-2">
                  <Wand2 className="h-4 w-4" />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-background p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary">
                    <PenLine className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">New post</p>
                    <p className="text-xs text-muted-foreground">Written in your style</p>
                  </div>
                </div>
                <p className="text-[15px] leading-7">
                  Been building quietly for a while.
                  <br />
                  Today I finally shipped it.
                  <br />
                  <span className="text-muted-foreground">Small step, but it feels good.</span>
                </p>
                <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-muted-foreground">Voice match · High</span>
                  <button className="rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background">Save draft</button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                  <Brain className="h-4 w-4" />
                  <p className="mt-3 text-sm font-semibold">Your voice</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Tone, rhythm, words and habits.</p>
                </div>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <Sparkles className="h-4 w-4" />
                  <p className="mt-3 text-sm font-semibold">Your ideas</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Turn rough thoughts into posts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
