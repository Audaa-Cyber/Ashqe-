'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';

export default function StyleCardShowcase() {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <section id="features" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-4 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Your voice, captured</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Hover or tap to see how we capture your unique writing style
          </p>
        </div>

        {/* Flip Card */}
        <div className="flex justify-center pt-8">
          <div 
            className="card-flip w-full max-w-md h-64 cursor-pointer"
            onClick={() => setIsFlipped(!isFlipped)}
          >
            <div className={`card-flip-inner ${isFlipped ? 'flipped' : ''}`}>
              {/* Front */}
              <div className="card-flip-front w-full h-full">
                <Card className="w-full h-full flex flex-col items-center justify-center p-8 smooth-shadow-lg border-2 border-border bg-background">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-muted mx-auto" />
                    <div>
                      <p className="text-sm font-semibold">@username</p>
                      <p className="text-xs text-muted-foreground mt-1">"your writing signature"</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Back */}
              <div className="card-flip-back w-full h-full">
                <Card className="w-full h-full flex items-center justify-center p-8 smooth-shadow-lg border-2 border-border bg-foreground text-background">
                  <div className="text-center space-y-2">
                    <p className="text-lg font-medium">"short thoughts that land</p>
                    <p className="text-lg font-medium">clean, casual, and sharp"</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {isFlipped ? 'Click to see the signature' : 'Click to reveal the style'}
        </div>
      </div>
    </section>
  );
}
