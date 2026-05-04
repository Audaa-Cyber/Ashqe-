'use client';

import { Button } from '@/components/ui/button';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    Product: [
      { name: 'Features', href: '#features' },
      { name: 'Pricing', href: '#pricing' },
      { name: 'How it works', href: '#how-it-works' },
      { name: 'Security', href: '#security' },
    ],
    Company: [
      { name: 'About', href: '#about' },
      { name: 'Blog', href: '#blog' },
      { name: 'Careers', href: '#careers' },
      { name: 'Press', href: '#press' },
    ],
    Resources: [
      { name: 'Documentation', href: '#docs' },
      { name: 'API', href: '#api' },
      { name: 'Status', href: '#status' },
      { name: 'Support', href: '#support' },
    ],
    Legal: [
      { name: 'Privacy', href: '#privacy' },
      { name: 'Terms', href: '#terms' },
      { name: 'Cookies', href: '#cookies' },
      { name: 'GDPR', href: '#gdpr' },
    ],
  };

  return (
    <footer className="bg-secondary/50 border-t border-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Newsletter Section */}
        <div className="mb-16 pb-16 border-b border-border">
          <div className="max-w-md">
            <h3 className="text-2xl font-bold mb-4">Stay updated</h3>
            <p className="text-muted-foreground mb-6">Get tips on writing, new features, and exclusive content straight to your inbox.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
              />
              <Button className="bg-foreground text-background hover:bg-foreground/90 rounded-lg">
                Subscribe
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">No spam. Unsubscribe anytime.</p>
          </div>
        </div>

        {/* Links Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <h3 className="text-xl font-bold mb-4">Ashqe</h3>
            <p className="text-sm text-muted-foreground">Write like you. Just faster.</p>
          </div>

          {/* Link Columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="font-semibold text-foreground mb-4 text-sm">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Social & Bottom Bar */}
        <div className="border-t border-border pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Social Links */}
            <div className="flex items-center gap-6">
              <a href="#twitter" className="text-2xl hover:opacity-70 transition-opacity">
                𝕏
              </a>
              <a href="#linkedin" className="text-2xl hover:opacity-70 transition-opacity">
                in
              </a>
              <a href="#github" className="text-2xl hover:opacity-70 transition-opacity">
                ⚙️
              </a>
              <a href="#discord" className="text-2xl hover:opacity-70 transition-opacity">
                💬
              </a>
            </div>

            {/* Copyright */}
            <div className="md:text-right">
              <p className="text-sm text-muted-foreground">
                © {currentYear} Ashqe. All rights reserved.
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Built with ❤️ for creators, by creators.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
