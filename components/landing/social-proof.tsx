'use client';

import { Card } from '@/components/ui/card';

export default function SocialProof() {
  const testimonials = [
    {
      quote: 'feels exactly like me',
      attribution: '@creator1'
    },
    {
      quote: 'i stopped overthinking posts',
      attribution: '@creator2'
    }
  ];

  return (
    <section className="py-24 bg-secondary/30">
      <div className="max-w-7xl mx-auto px-6 space-y-12">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">Loved by creators</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="p-6 smooth-shadow-lg border-2 border-border hover-lift">
              <p className="text-lg font-medium italic mb-4">"{testimonial.quote}"</p>
              <p className="text-sm text-muted-foreground">{testimonial.attribution}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
