'use client';

import type { ReactElement } from 'react';
import { Card } from '@/components/ui/card';

export default function HowItWorks() {
  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: ReactElement } = {
      connect: (
        <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.658 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
      train: (
        <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      generate: (
        <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      publish: (
        <svg className="w-8 h-8 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    };
    return iconMap[iconName] || null;
  };

  const steps = [
    {
      number: '01',
      title: 'Connect your X account',
      description: 'Sign in securely with OAuth. No passwords, no raw tokens. Ashqe never touches credentials it doesn\'t need.',
      icon: 'connect',
    },
    {
      number: '02',
      title: 'We study your last 50 posts',
      description: 'Ashqe quietly reads your recent posts and builds a structured profile of your tone, vocabulary, formatting, and habits.',
      icon: 'train',
    },
    {
      number: '03',
      title: 'Chat with your personal agent',
      description: 'Tell your agent what you want to say. It writes posts that sound like you wrote them yourself, every time.',
      icon: 'generate',
    },
    {
      number: '04',
      title: 'Publish with one tap',
      description: 'Approve and post directly to X, or copy it elsewhere. You stay fully in control of every word that goes out.',
      icon: 'publish',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-16 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-balance">
            How Ashqe works
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            From connection to your first post in under five minutes. No setup, no prompts to engineer.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {steps.map((step, index) => (
            <div
              key={index}
              className="group relative animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card className="p-8 h-full border-border hover-lift bg-background relative overflow-hidden">
                {/* Background accent */}
                <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-secondary opacity-30" />

                {/* Content */}
                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between">
                    <span className="text-5xl font-bold text-muted/30">{step.number}</span>
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                      {getIcon(step.icon)}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">{step.title}</h3>
                  <p className="text-base text-muted-foreground leading-relaxed">{step.description}</p>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 w-0 h-1 bg-foreground group-hover:w-full transition-all duration-500" />
              </Card>
            </div>
          ))}
        </div>

        {/* Integration highlight */}
        <div className="relative rounded-2xl border border-border bg-secondary/50 p-12 overflow-hidden animate-fade-in">
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/5 to-transparent" />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-3xl font-bold mb-4">A real model of your voice</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                Not a prompt. Not a template. Ashqe builds a structured style profile from your own writing — tone, rhythm, vocabulary, and the small habits that make your voice yours.
              </p>
              <ul className="space-y-3">
                {['Tone and rhythm', 'Vocabulary patterns', 'Formatting habits', 'Topic preferences'].map((item, idx) => (
                  <li key={idx} className="flex items-center gap-3 text-foreground">
                    <svg className="w-5 h-5 text-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative h-80 bg-background rounded-xl border border-border overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="space-y-4 w-full h-full p-6 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-4/5 bg-muted rounded" />
                    <div className="h-3 w-3/4 bg-muted rounded" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full bg-foreground/10 rounded" />
                    <div className="h-3 w-5/6 bg-foreground/10 rounded" />
                  </div>
                  <div className="h-12 w-full bg-foreground/5 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
