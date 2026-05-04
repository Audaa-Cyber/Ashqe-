'use client';

import { Card } from '@/components/ui/card';

export default function DashboardPreview() {
  return (
    <section className="relative py-16 bg-background">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="max-w-2xl text-center space-y-6 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight text-balance">
            Understand what resonates with your audience
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Smart analytics help you refine your voice and create more engaging content over time.
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Performance card */}
          <Card className="lg:col-span-2 p-8 smooth-shadow-lg border border-border bg-secondary/50 hover-lift">
            <h3 className="font-bold text-lg mb-6">Top performing posts</h3>
            <div className="space-y-4">
              {[
                { title: 'AI trends for creators', engagement: '2.4K', change: '+45%' },
                { title: 'My writing philosophy', engagement: '1.8K', change: '+32%' },
                { title: 'Behind the scenes update', engagement: '1.5K', change: '+28%' },
              ].map((post, i) => (
                <div key={i} className="flex items-center justify-between p-4 bg-background rounded-xl border border-border/50 hover:border-border transition-colors">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-semibold text-foreground">{post.title}</p>
                    <p className="text-xs text-muted-foreground">{post.engagement} engagement</p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="font-bold text-foreground">{post.change}</p>
                    <p className="text-xs text-green-600">vs. average</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Key Insight card */}
          <Card className="p-8 smooth-shadow-lg border border-border bg-foreground text-background hover-lift flex flex-col justify-center">
            <div className="space-y-4 text-center">
              <p className="text-sm font-semibold text-background/70 uppercase tracking-widest">Key Insight</p>
              <div className="space-y-2">
                <div className="text-5xl font-bold">3.2x</div>
                <p className="text-background/90">Higher engagement</p>
              </div>
              <p className="text-sm text-background/70">Your short, direct posts perform best</p>
            </div>
          </Card>
        </div>

        {/* Analytics highlights */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 animate-fade-in">
          <div className="p-6 rounded-xl border border-border bg-secondary/50">
            <p className="text-sm text-muted-foreground mb-2">Avg. Engagement</p>
            <p className="text-2xl font-bold">847</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-secondary/50">
            <p className="text-sm text-muted-foreground mb-2">Top Topic</p>
            <p className="text-2xl font-bold">Tech</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-secondary/50">
            <p className="text-sm text-muted-foreground mb-2">Best Time</p>
            <p className="text-2xl font-bold">9 AM</p>
          </div>
          <div className="p-6 rounded-xl border border-border bg-secondary/50">
            <p className="text-sm text-muted-foreground mb-2">Growth</p>
            <p className="text-2xl font-bold">+18%</p>
          </div>
        </div>
      </div>
    </section>
  );
}
