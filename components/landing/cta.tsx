'use client';

import { Button } from '@/components/ui/button';

export default function CTA() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Subtle glow background */}
      <div className="absolute inset-0 hero-glow" />
      
      <div className="max-w-3xl mx-auto px-6 text-center space-y-8 relative z-10 animate-fade-in">
        <h2 className="text-5xl md:text-6xl font-bold tracking-tight">
          Start writing like yourself again
        </h2>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Let Ashqe amplify your voice
        </p>
        <Button size="lg" className="bg-foreground text-background hover:bg-muted-foreground px-8">
          Connect X
        </Button>
      </div>
    </section>
  );
}
