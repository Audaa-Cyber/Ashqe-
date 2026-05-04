'use client';

import { Card } from '@/components/ui/card';

export default function HowItWorks() {
  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: JSX.Element } = {
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
      title: 'Connect Your Account',
      description: 'Securely link your X account to Ashqe. We analyze your writing style, tone, and unique voice.',
      icon: 'connect',
    },
    {
      number: '02',
      title: 'Train Your AI Voice',
      description: 'Our AI learns your patterns, vocabulary, and communication style from your past posts.',
      icon: 'train',
    },
    {
      number: '03',
      title: 'Generate Content',
      description: 'Write naturally as you normally would. Ashqe transforms your ideas into full posts in your voice.',
      icon: 'generate',
    },
    {
      number: '04',
      title: 'Publish & Analyze',
      description: 'Post directly or iterate. Track performance and refine what resonates with your audience.',
      icon: 'publish',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-16 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-balance">
            How Ashqe Works
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Four simple steps to unlock your voice and create content faster than ever before.
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
              <h3 className="text-3xl font-bold mb-4">Powered by Advanced AI</h3>
              <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
                We use state-of-the-art language models trained on your personal writing samples to capture every nuance of your unique voice.
              </p>
              <ul className="space-y-3">
                {['Real-time generation', 'Style consistency', 'Variation creation', 'Smart scheduling'].map((item, idx) => (
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
