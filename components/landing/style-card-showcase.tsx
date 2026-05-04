'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

export default function StyleCardShowcase() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <section className="relative py-16 bg-background">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight text-balance">
            Your voice, perfectly captured
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Click to see how Ashqe understands and preserves your unique writing style
          </p>
        </div>

        {/* Flip Card */}
        <div className="flex justify-center pt-4 animate-fade-in pb-32 overflow-visible">
          <div 
            className="card-flip w-full max-w-2xl h-80 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
              {/* Front - Input Side */}
              <div className="card-flip-front w-full h-full">
                <Card className="w-full h-full flex flex-col items-center justify-center p-12 smooth-shadow-lg border border-border bg-secondary/50 hover-lift">
                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Your X Profile</p>
                      <div className="w-20 h-20 rounded-full bg-muted mx-auto" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">@your_handle</p>
                      <p className="text-sm text-muted-foreground mt-2">"Your unique writing signature"</p>
                    </div>
                    <p className="text-xs text-muted-foreground pt-4">
                      {isFlipped ? 'Click to see the analysis' : 'Click to reveal your writing profile'}
                    </p>
                  </div>
                </Card>
              </div>

              {/* Back - Analysis Side */}
              <div className="card-flip-back w-full h-full">
                <Card className="w-full h-full flex items-center justify-center p-12 smooth-shadow-lg border border-border bg-foreground text-background">
                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-background/70 uppercase tracking-widest">Voice Analysis</p>
                      <p className="text-2xl font-bold">Your Style Profile</p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <p>"Short, punchy thoughts that land clean, casual, and sharp"</p>
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <div>
                          <p className="text-xs opacity-70">Tone</p>
                          <p className="font-semibold">Casual</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-70">Length</p>
                          <p className="font-semibold">Concise</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-70">Style</p>
                          <p className="font-semibold">Direct</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
