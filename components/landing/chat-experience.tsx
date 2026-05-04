'use client';

import { Card } from '@/components/ui/card';

export default function ChatExperience() {
  return (
    <section className="relative py-32 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 space-y-16">
        <div className="max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight text-balance">
            Simple conversation, powerful output
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Just tell Ashqe what you want to say. It writes in your voice instantly.
          </p>
        </div>

        {/* Chat Preview */}
        <div className="max-w-3xl mx-auto animate-fade-in">
          <Card className="p-8 space-y-8 smooth-shadow-lg border border-border bg-background">
            {/* Chat bubbles */}
            <div className="space-y-6">
              {/* User message */}
              <div className="flex justify-end animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <div className="bg-foreground text-background rounded-2xl px-6 py-4 max-w-sm">
                  <p className="text-base font-medium">Create a post about AI trends for my tech audience</p>
                </div>
              </div>

              {/* Agent response */}
              <div className="flex justify-start animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="bg-secondary text-foreground rounded-2xl px-6 py-4 max-w-sm space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">✨ Generated in your voice:</p>
                  <p className="text-base leading-relaxed">
                    "AI is evolving faster than our frameworks to understand it. The gap between what's possible and what's practical keeps widening. Builders who bridge that gap win."
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-border grid grid-cols-3 gap-4">
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="text-3xl">✨</div>
                <p className="text-sm font-semibold text-foreground">Make variations</p>
                <p className="text-xs text-muted-foreground">Try different tones</p>
              </div>
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="text-3xl">📈</div>
                <p className="text-sm font-semibold text-foreground">Optimize engagement</p>
                <p className="text-xs text-muted-foreground">Based on your audience</p>
              </div>
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="text-3xl">🧵</div>
                <p className="text-sm font-semibold text-foreground">Expand to thread</p>
                <p className="text-xs text-muted-foreground">Create full narratives</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Section */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 animate-fade-in">
          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-foreground">⚡ Real-time</p>
            <p className="text-sm text-muted-foreground">Generation in seconds</p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-foreground">🎯 Accurate</p>
            <p className="text-sm text-muted-foreground">Maintains your style perfectly</p>
          </div>
          <div className="text-center space-y-2">
            <p className="text-2xl font-bold text-foreground">♾️ Unlimited</p>
            <p className="text-sm text-muted-foreground">Generate as much as you want</p>
          </div>
        </div>
      </div>
    </section>
  );
}
