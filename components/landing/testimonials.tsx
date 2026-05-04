'use client';

import { Card } from '@/components/ui/card';

export default function Testimonials() {
  const testimonials = [
    {
      content: "Ashqe is like having a writing coach that knows exactly how I think. The posts come out sounding 100% me, just faster.",
      author: 'Sarah Chen',
      role: 'Tech Creator',
      avatar: '👩‍💻',
      metric: '150K followers',
    },
    {
      content: "I went from staring at a blank page to publishing 5 high-quality posts a day. My engagement actually went up because the content is more consistent.",
      author: 'Marcus Johnson',
      role: 'Marketing Strategist',
      avatar: '👨‍💼',
      metric: '89% engagement increase',
    },
    {
      content: "The voice cloning is insanely accurate. People keep commenting that my posts feel more authentic than ever, which is wild because I wrote them in minutes.",
      author: 'Alex Rivera',
      role: 'Founder & CEO',
      avatar: '👨‍🎓',
      metric: '4.2x faster output',
    },
    {
      content: "Finally, I can focus on ideas instead of struggling with how to express them. Ashqe handles the writing while I stay authentic.",
      author: 'Emma Wilson',
      role: 'Thought Leader',
      avatar: '👩‍🔬',
      metric: '200+ posts/month',
    },
  ];

  return (
    <section className="relative py-32 bg-background">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="max-w-2xl mb-12 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-balance">
            Loved by creators worldwide
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            See how creators are using Ashqe to amplify their voice and grow their audience.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Card className="p-8 h-full border-border bg-secondary/50 hover-lift flex flex-col">
                {/* Stars */}
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="text-lg">★</span>
                  ))}
                </div>

                {/* Testimonial */}
                <p className="text-lg leading-relaxed text-foreground mb-8 flex-1">
                  "{testimonial.content}"
                </p>

                {/* Author */}
                <div className="border-t border-border pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-3xl">{testimonial.avatar}</span>
                        <div>
                          <p className="font-semibold text-foreground">{testimonial.author}</p>
                          <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 inline-block px-3 py-1 bg-foreground/10 rounded-full text-xs font-medium text-foreground">
                    {testimonial.metric}
                  </div>
                </div>
              </Card>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 animate-fade-in">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">12K+</div>
            <p className="text-muted-foreground">Active creators</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">2.3M</div>
            <p className="text-muted-foreground">Posts generated</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">98%</div>
            <p className="text-muted-foreground">Satisfaction rate</p>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">24/7</div>
            <p className="text-muted-foreground">Support available</p>
          </div>
        </div>
      </div>
    </section>
  );
}
