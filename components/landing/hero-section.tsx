'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HeroSection() {
  return (
    <section className="relative min-h-[600px] flex items-center overflow-hidden">
      <div className="hero-glow absolute inset-0" />
      <div className="max-w-7xl mx-auto w-full px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left side - Text */}
        <div className="space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight">
            Write like you. Just faster.
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
            Your voice, your tone, your style — turned into an AI that actually sounds like you
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Button size="lg" className="bg-foreground text-background hover:bg-muted-foreground">
              Connect X
            </Button>
            <Button size="lg" variant="outline" className="border-2 border-foreground hover:bg-secondary">
              See how it works
            </Button>
          </div>
        </div>

        {/* Right side - Visual Preview */}
        <div className="relative h-[400px] md:h-[500px] flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl border border-border bg-secondary/50 smooth-shadow-lg backdrop-blur-sm" />
          
          {/* Animated floating card */}
          <div className="relative w-full h-full flex items-center justify-center perspective">
            <div className="w-56 h-64 rounded-xl border border-border bg-background smooth-shadow-lg p-6 space-y-4 animate-bounce" style={{ animationDuration: '4s' }}>
              <div className="h-12 w-12 rounded-full bg-muted" />
              <div className="space-y-2">
                <div className="h-3 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
              </div>
              <div className="pt-4 space-y-2">
                <div className="h-3 w-full bg-foreground/10 rounded" />
                <div className="h-3 w-5/6 bg-foreground/10 rounded" />
              </div>
            </div>

            {/* Chat bubble preview */}
            <div className="absolute bottom-8 right-8 w-48 rounded-lg bg-foreground text-background p-4 smooth-shadow-lg text-sm" style={{ animation: 'fadeIn 0.8s ease-out 0.3s both' }}>
              <p className="font-medium">✨ "make a post about AI"</p>
              <p className="text-xs text-background/70 mt-1">Output in your style...</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
