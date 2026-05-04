'use client';

import { Card } from '@/components/ui/card';

export default function ChatExperience() {
  return (
    <section id="how-it-works" className="py-24">
      <div className="max-w-7xl mx-auto px-6 space-y-16">
        <div className="text-center space-y-4 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Talk. It writes.</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Simple conversation, powerful output in your voice
          </p>
        </div>

        {/* Chat Preview */}
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 space-y-6 smooth-shadow-lg border-2 border-border">
            {/* Chat bubbles */}
            <div className="space-y-4">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-foreground text-background rounded-lg px-4 py-3 max-w-xs">
                  <p className="text-sm">make a post about AI</p>
                </div>
              </div>

              {/* Agent response */}
              <div className="flex justify-start">
                <div className="bg-secondary text-foreground rounded-lg px-4 py-3 max-w-xs space-y-2">
                  <p className="text-sm font-medium">Output in your style:</p>
                  <p className="text-sm text-muted-foreground italic">
                    "AI is just pattern matching on steroids. Cool tech, but the hype is real."
                  </p>
                </div>
              </div>
            </div>

            {/* Features under chat */}
            <div className="pt-4 border-t border-border grid grid-cols-3 gap-4">
              <div className="text-center space-y-2 hover-lift p-2 rounded cursor-pointer">
                <div className="text-2xl">✨</div>
                <p className="text-xs font-medium">Make variations</p>
              </div>
              <div className="text-center space-y-2 hover-lift p-2 rounded cursor-pointer">
                <div className="text-2xl">📈</div>
                <p className="text-xs font-medium">Go viral</p>
              </div>
              <div className="text-center space-y-2 hover-lift p-2 rounded cursor-pointer">
                <div className="text-2xl">🧵</div>
                <p className="text-xs font-medium">Turn into thread</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
