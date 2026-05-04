'use client';

export default function FeatureStrip() {
  const features = [
    {
      icon: '✍️',
      title: 'Style cloning',
      description: 'Learns your tone in seconds'
    },
    {
      icon: '⚡',
      title: 'Instant posts',
      description: 'Generate in seconds'
    },
    {
      icon: '📊',
      title: 'Smart insights',
      description: 'Improve over time'
    }
  ];

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="text-center space-y-4 p-8 rounded-xl border border-border hover-lift transition-all"
            >
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="text-lg font-semibold">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
