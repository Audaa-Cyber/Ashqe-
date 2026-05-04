'use client';

import { Button } from '@/components/ui/button';

export default function FinalCTA() {
  return (
    <section className="relative py-16 bg-foreground text-background overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-background/10 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full bg-background/10 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
        <div className="space-y-8 animate-fade-in">
          <div className="space-y-4">
            <h2 className="text-5xl md:text-7xl font-bold leading-tight text-balance">
              Ready to write 10x faster?
            </h2>
            <p className="text-xl text-background/80 leading-relaxed max-w-2xl mx-auto">
              Join thousands of creators who are already amplifying their voice with Ashqe. Start free today, no credit card needed.
            </p>
          </div>

          <div className="flex justify-center pt-4">
            <Button
              size="lg"
              className="bg-background text-foreground hover:bg-secondary h-12 px-12 text-base rounded-lg font-semibold"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
