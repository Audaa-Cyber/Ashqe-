'use client';

import { Card } from '@/components/ui/card';

export default function DashboardPreview() {
  return (
    <section id="insights" className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center space-y-4 animate-fade-in">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">Know what works in your voice</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Smart analytics to improve your writing over time
          </p>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Top posts card */}
          <Card className="md:col-span-2 p-6 smooth-shadow-lg border-2 border-border hover-lift">
            <h3 className="font-semibold text-sm mb-4">Your top posts</h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start justify-between p-3 bg-secondary rounded-lg">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium">Post {i}</p>
                    <p className="text-xs text-muted-foreground">1.2K engagement</p>
                  </div>
                  <div className="text-lg font-bold text-foreground">↗</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Insight card */}
          <Card className="p-6 smooth-shadow-lg border-2 border-border hover-lift flex flex-col justify-center">
            <div className="space-y-3 text-center">
              <div className="text-4xl font-bold">3.2x</div>
              <p className="text-sm text-muted-foreground">Higher engagement</p>
              <p className="text-xs text-muted-foreground">Your short posts perform better</p>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
