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
                  <p className="text-sm font-semibold text-muted-foreground">Generated in your voice:</p>
                  <p className="text-base leading-relaxed">
                    "AI is evolving faster than our frameworks to understand it. The gap between what's possible and what's practical keeps widening. Builders who bridge that gap win."
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-6 border-t border-border grid grid-cols-3 gap-4">
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="w-8 h-8 mx-auto bg-foreground/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 01-2 2h-2m-4-8V8m0 4v4m4-8V8m0 4v4" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-foreground">Make variations</p>
                <p className="text-xs text-muted-foreground">Try different tones</p>
              </div>
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="w-8 h-8 mx-auto bg-foreground/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7H5v12h12V9m0-2h4m0 0V5m0 4V3" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-foreground">Optimize engagement</p>
                <p className="text-xs text-muted-foreground">Based on your audience</p>
              </div>
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="w-8 h-8 mx-auto bg-foreground/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-foreground">Expand to thread</p>
                <p className="text-xs text-muted-foreground">Create full narratives</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Info Section */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 pt-8 animate-fade-in">
          <div className="text-center space-y-3">
            <div className="w-10 h-10 mx-auto bg-secondary rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-foreground">Real-time</p>
            <p className="text-sm text-muted-foreground">Generation in seconds</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-10 h-10 mx-auto bg-secondary rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-foreground">Accurate</p>
            <p className="text-sm text-muted-foreground">Maintains your style perfectly</p>
          </div>
          <div className="text-center space-y-3">
            <div className="w-10 h-10 mx-auto bg-secondary rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-lg font-bold text-foreground">Unlimited</p>
            <p className="text-sm text-muted-foreground">Generate as much as you want</p>
          </div>
        </div>
      </div>
    </section>
  );
}
