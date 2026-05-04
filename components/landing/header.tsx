'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="text-2xl font-bold tracking-tight">Ashqe</div>
          <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-secondary text-foreground font-medium">
            ✨ AI Writing
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-12 text-sm">
          <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            How it works
          </a>
          <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Features
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Pricing
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
            Blog
          </a>
        </nav>

        {/* CTA Button */}
        <div className="flex items-center gap-4">
          <Button className="hidden sm:flex bg-foreground text-background hover:bg-foreground/90 rounded-lg font-semibold">
            Connect X
          </Button>
          
          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-6 space-y-4">
          <a href="#how-it-works" className="block text-foreground hover:text-muted-foreground transition-colors font-medium">
            How it works
          </a>
          <a href="#features" className="block text-foreground hover:text-muted-foreground transition-colors font-medium">
            Features
          </a>
          <a href="#" className="block text-foreground hover:text-muted-foreground transition-colors font-medium">
            Pricing
          </a>
          <a href="#" className="block text-foreground hover:text-muted-foreground transition-colors font-medium">
            Blog
          </a>
          <Button className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-lg font-semibold">
            Connect X
          </Button>
        </div>
      )}
    </header>
  );
}
