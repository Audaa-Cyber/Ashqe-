'use client';

import { Card } from '@/components/ui/card';

export default function HowItWorks() {
  const steps = [
    {
      number: '01',
      title: 'Connect Your Account',
      description: 'Securely link your X account to Ashqe. We analyze your writing style, tone, and unique voice.',
      icon: '🔗',
    },
    {
      number: '02',
      title: 'Train Your AI Voice',
      description: 'Our AI learns your patterns, vocabulary, and communication style from your past posts.',
      icon: '🧠',
    },
    {
      number: '03',
      title: 'Generate Content',
      description: 'Write naturally as you normally would. Ashqe transforms your ideas into full posts in your voice.',
      icon: '✨',
    },
    {
      number: '04',
      title: 'Publish & Analyze',
      description: 'Post directly or iterate. Track performance and refine what resonates with your audience.',
      icon: '📊',
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
                    <span className="text-4xl">{step.icon}</span>
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
                    <span className="text-lg">✓</span>
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
