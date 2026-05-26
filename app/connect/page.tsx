'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ConnectPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'idle' | 'connecting' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check for OAuth errors
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setStatus('error');
    }
  }, [searchParams]);

  const handleConnect = () => {
    setStatus('connecting');
    setError(null);

    // Generate state for CSRF protection
    const state = Math.random().toString(36).substring(7);
    sessionStorage.setItem('oauth_state', state);

    // Build OAuth URL for X
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: process.env.NEXT_PUBLIC_X_CLIENT_ID || '',
      redirect_uri: process.env.NEXT_PUBLIC_X_REDIRECT_URI || '',
      scope: 'tweet.read tweet.write users.read offline.access',
      state,
      code_challenge_method: 'plain',
      code_challenge: state,
    });

    // Redirect to X OAuth
    window.location.href = `https://twitter.com/i/oauth2/authorize?${params}`;
  };

  const isLoading = status === 'connecting';

  return (
    <main className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold tracking-tight">
            Ashqe
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to home
          </Link>
        </div>
      </header>

      {/* Connect Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md p-10 smooth-shadow-lg border border-border bg-background animate-fade-in">
          <div className="space-y-8">
            {/* X Logo */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-2xl bg-foreground flex items-center justify-center">
                <svg className="w-8 h-8 text-background" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </div>
            </div>

            {/* Header */}
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-bold tracking-tight">Connect your X account</h1>
              <p className="text-muted-foreground leading-relaxed">
                We&apos;ll read your last 50 posts to learn your voice. Your style profile is private and yours alone.
              </p>
            </div>

            {/* Error state */}
            {status === 'error' && error && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm font-semibold text-red-900 mb-2">Connection failed</p>
                  <p className="text-sm text-red-800 mb-4">{error}</p>
                  <Button
                    onClick={() => {
                      setStatus('idle');
                      setError(null);
                    }}
                    size="sm"
                    className="w-full bg-red-900 text-white hover:bg-red-800"
                  >
                    Try again
                  </Button>
                </div>
              </div>
            )}

            {/* Status messages */}
            {status === 'idle' && !error && (
              <Button
                onClick={handleConnect}
                disabled={isLoading}
                size="lg"
                className="w-full bg-foreground text-background hover:bg-foreground/90 h-12 text-base rounded-lg font-semibold"
              >
                {isLoading ? 'Redirecting to X...' : 'Continue with X'}
              </Button>
            )}

            {isLoading && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary border border-border">
                  <div className="w-5 h-5 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
                  <p className="text-sm font-medium text-foreground">
                    Authenticating with X...
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckIcon active={true} />
                    <span>Opening X login</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckIcon active={false} />
                    <span>Analyzing your last 50 posts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckIcon active={false} />
                    <span>Building your style profile</span>
                  </div>
                </div>
              </div>
            )}

            {/* Trust note */}
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Secured with OAuth. We never see your password and never store raw tokens.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

function CheckIcon({ active }: { active: boolean }) {
  return (
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
        active ? 'bg-foreground' : 'bg-muted'
      }`}
    >
      {active && (
        <svg className="w-3 h-3 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </div>
  );
}
