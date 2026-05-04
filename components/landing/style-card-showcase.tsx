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
            From your posts to your style profile
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Tap the card. See how Ashqe turns your X profile into a structured model of your voice.
          </p>
        </div>

        {/* Flip Card */}
        <div className="flex justify-center pt-4 animate-fade-in pb-32">
          <div 
            className="w-full max-w-2xl h-80 cursor-pointer card-flip"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
              {/* Front - Input Side */}
              <div className="card-flip-front">
                <Card className="w-full h-full flex flex-col items-center justify-center p-12 smooth-shadow-lg border border-border bg-secondary/50">
                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Your X Profile</p>
                      <div className="w-20 h-20 rounded-full bg-muted mx-auto" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-foreground">@your_handle</p>
                      <p className="text-sm text-muted-foreground mt-2">50 posts analyzed</p>
                    </div>
                    <p className="text-xs text-muted-foreground pt-4">
                      Tap to see your style profile
                    </p>
                  </div>
                </Card>
              </div>

              {/* Back - Analysis Side */}
              <div className="card-flip-back">
                <Card className="w-full h-full flex items-center justify-center p-12 smooth-shadow-lg border border-border bg-foreground text-background">
                  <div className="text-center space-y-6">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-background/70 uppercase tracking-widest">Style Profile</p>
                      <p className="text-2xl font-bold">This is how you write</p>
                    </div>
                    <div className="space-y-3 text-sm">
                      <p className="opacity-90">"Short, honest thoughts. Casual rhythm. A line that lands at the end."</p>
                      <div className="grid grid-cols-3 gap-4 pt-4">
                        <div>
                          <p className="text-xs opacity-70">Tone</p>
                          <p className="font-semibold">Honest</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-70">Length</p>
                          <p className="font-semibold">Concise</p>
                        </div>
                        <div>
                          <p className="text-xs opacity-70">Rhythm</p>
                          <p className="font-semibold">Punchy</p>
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
