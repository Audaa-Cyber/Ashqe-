'use client';

import { Card } from '@/components/ui/card';

export default function ChatExperience() {
  return (
    <section className="relative py-16 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight text-balance">
            Just talk. It writes.
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            No prompts. No templates. Tell your agent what's on your mind and it drafts a post that already sounds like you.
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
                  <p className="text-base font-medium">Write something about shipping side projects on weekends</p>
                </div>
              </div>

              {/* Agent response */}
              <div className="flex justify-start animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="bg-secondary text-foreground rounded-2xl px-6 py-4 max-w-sm space-y-3">
                  <p className="text-sm font-semibold text-muted-foreground">In your voice:</p>
                  <p className="text-base leading-relaxed">
                    "Most of my best ideas got built on Saturdays. Not because weekends are magic — but because nobody's expecting anything from me. Make space for the work nobody asked for."
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
                <p className="text-sm font-semibold text-foreground">Try another draft</p>
                <p className="text-xs text-muted-foreground">Same idea, fresh take</p>
              </div>
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="w-8 h-8 mx-auto bg-foreground/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-foreground">Turn into a thread</p>
                <p className="text-xs text-muted-foreground">Expand the idea</p>
              </div>
              <div className="text-center space-y-3 hover-lift p-4 rounded-lg cursor-pointer">
                <div className="w-8 h-8 mx-auto bg-foreground/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-foreground">Post to X</p>
                <p className="text-xs text-muted-foreground">One tap to publish</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
