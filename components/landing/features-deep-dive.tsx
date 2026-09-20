'use client';

import type { ReactElement } from 'react';
import { Card } from '@/components/ui/card';

export default function FeaturesDive() {
  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: ReactElement } = {
      voice: (
        <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L19.414 18.414m-2.828-2.828l1.414-1.414M9.172 9.172L7.757 7.757m1.414 1.414L5.343 5.343M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      lightning: (
        <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      palette: (
        <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.414-1.414a2 2 0 012.828 0l2.828 2.828a2 2 0 010 2.828l-2.829 2.829m-4-4l4 4" />
        </svg>
      ),
      chart: (
        <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      clock: (
        <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      shield: (
        <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m7.784-4.817a.5.5 0 00-.596.72c.178.283.408.546.681.78M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    };
    return iconMap[iconName] || null;
  };

  const features = [
    {
      title: 'Trained on your last 50 posts',
      description: 'Ashqe reads your recent posts to capture how you actually write — not how AI thinks you should write.',
      details: ['Tone analysis', 'Vocabulary mapping', 'Formatting habits'],
      icon: 'voice',
    },
    {
      title: 'Chat with your agent',
      description: 'Just say what you want to share. Your personal agent turns it into a post that sounds like you wrote it.',
      details: ['Natural conversation', 'Multiple drafts', 'Instant rewrites'],
      icon: 'lightning',
    },
    {
      title: 'A real style profile',
      description: 'A structured profile of your voice — your patterns, your habits, your quirks. Not a generic prompt.',
      details: ['Tone', 'Structure', 'Vocabulary', 'Habits'],
      icon: 'palette',
    },
    {
      title: 'See what worked',
      description: 'Quiet insights into which of your posts landed and why, so your agent keeps getting closer to your best self.',
      details: ['Top posts', 'Style insights', 'What resonates'],
      icon: 'chart',
    },
    {
      title: 'Post directly to X',
      description: 'Approve and ship to X with one tap, secured with OAuth. We never store raw tokens or passwords.',
      details: ['One-tap publish', 'OAuth secured', 'You stay in control'],
      icon: 'clock',
    },
    {
      title: 'Your voice stays yours',
      description: 'We never train shared models on your writing. Your style profile belongs to you, and only you.',
      details: ['Private by default', 'No shared training', 'Delete anytime'],
      icon: 'shield',
    },
  ];

  return (
    <section id="features" className="relative py-16 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-balance">
            Built around your voice
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Everything Ashqe does starts with one idea — sounding exactly like you, never like AI.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card className="p-8 h-full border-border bg-background hover-lift">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-foreground">{feature.title}</h3>
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      {getIcon(feature.icon)}
                    </div>
                  </div>
                  <p className="text-base text-muted-foreground leading-relaxed">{feature.description}</p>
                  <div className="flex flex-wrap gap-2 pt-4">
                    {feature.details.map((detail, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-full text-xs font-medium bg-secondary text-foreground border border-border"
                      >
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Feature Highlight */}
        <div className="relative rounded-2xl border border-border bg-gradient-to-br from-foreground/5 to-transparent p-12 overflow-hidden animate-fade-in">
          <div className="absolute -right-32 -bottom-32 w-96 h-96 rounded-full bg-foreground/5 blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-3xl font-bold mb-4">Why creators choose Ashqe</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div>
                <div className="text-4xl font-bold text-foreground mb-2">50</div>
                <p className="text-muted-foreground">Recent posts analyzed to learn your unique voice</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-foreground mb-2">100%</div>
                <p className="text-muted-foreground">You. Every post sounds like you actually wrote it</p>
              </div>
              <div>
                <div className="text-4xl font-bold text-foreground mb-2">5 min</div>
                <p className="text-muted-foreground">From signing in to your first post in your voice</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
