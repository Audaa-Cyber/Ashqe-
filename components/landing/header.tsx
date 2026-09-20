'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

const links = [
  ['How it works', '#how-it-works'],
  ['Features', '#features'],
  ['FAQ', '#faq'],
] as const;

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-xl font-bold tracking-[-0.03em]">Ashqe</span>
          <span className="hidden rounded-full border border-border bg-secondary px-2 py-1 text-[10px] font-semibold uppercase tracking-wider sm:inline">
            AI writing
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map(([label, href]) => (
            <a key={href} href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/connect" className="hidden rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 sm:inline-flex">
            Connect X
          </Link>
          <button
            type="button"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-lg border border-border p-2 md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="border-t border-border bg-background px-6 py-5 md:hidden">
          <div className="mx-auto max-w-7xl space-y-4">
            {links.map(([label, href]) => (
              <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="block text-sm font-medium">
                {label}
              </a>
            ))}
            <Link href="/connect" onClick={() => setMobileMenuOpen(false)} className="flex h-11 items-center justify-center rounded-lg bg-foreground text-sm font-semibold text-background">
              Connect X
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
