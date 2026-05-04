'use client';

import { Button } from '@/components/ui/button';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="text-xl font-bold tracking-tight">Ashqe</div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How it works</a>
            <a href="#insights" className="hover:text-foreground transition-colors">Insights</a>
          </nav>
        </div>
        <Button className="bg-foreground text-background hover:bg-muted-foreground">Connect X</Button>
      </div>
    </header>
  );
}
