'use client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      <div className="hero-glow absolute inset-0" />
      <div className="max-w-7xl mx-auto w-full px-6 py-32 grid grid-cols-1 md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left side - Text */}
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-4">
            <div className="inline-block px-4 py-2 rounded-full bg-secondary border border-border text-xs font-semibold text-foreground">
              Powered by Your Voice
            </div>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-tight text-balance">
              Write like you. Just faster.
            </h1>
          </div>
          <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
            Your voice, your tone, your style — turned into an AI that actually sounds like you. Create content 10x faster while staying authentically you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Button size="lg" className="bg-foreground text-background hover:bg-foreground/90 h-12 px-8 text-base rounded-lg">
              Get Started
            </Button>
          </div>
        </div>

        {/* Right side - Visual Preview */}
        <div className="relative h-[400px] md:h-[600px] flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl border border-border/50 bg-gradient-to-br from-secondary/80 to-background smooth-shadow-lg backdrop-blur-sm overflow-hidden" />
          
          {/* Animated floating cards */}
          <div className="relative w-full h-full flex items-center justify-center perspective">
            {/* Main card */}
            <div className="absolute w-64 h-80 rounded-2xl border border-border bg-background smooth-shadow-lg p-6 space-y-4" style={{ animation: 'float 3s ease-in-out infinite' }}>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="space-y-2 flex-1">
                  <div className="h-2 w-20 bg-muted rounded" />
                  <div className="h-2 w-16 bg-muted rounded opacity-50" />
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <div className="h-2 w-full bg-foreground/10 rounded" />
                <div className="h-2 w-5/6 bg-foreground/10 rounded" />
                <div className="h-2 w-4/6 bg-foreground/10 rounded" />
              </div>
            </div>

            {/* Chat bubble preview */}
            <div className="absolute bottom-12 right-0 w-56 rounded-2xl bg-foreground text-background p-6 smooth-shadow-lg text-sm space-y-3" style={{ animation: 'slideIn 0.8s ease-out 0.3s both' }}>
              <p className="font-semibold text-base">Generate post</p>
              <p className="text-background/80">"Create an engaging thread about AI trends"</p>
              <div className="pt-2 space-y-2">
                <div className="h-2 w-full bg-background/20 rounded" />
                <div className="h-2 w-4/5 bg-background/20 rounded" />
              </div>
            </div>

            {/* Stats card */}
            <div className="absolute top-12 left-0 rounded-xl border border-border bg-background smooth-shadow-lg p-4 text-sm space-y-3 w-48" style={{ animation: 'fadeIn 1s ease-out 0.5s both' }}>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">TOP PERFORMING</p>
                <p className="font-bold text-lg">2,847 Likes</p>
              </div>
              <div className="w-full bg-secondary rounded h-2">
                <div className="w-4/5 bg-foreground h-2 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}
