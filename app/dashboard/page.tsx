'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/50 sticky top-0 bg-background/95 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-2xl font-bold tracking-tight">
              Ashqe
            </Link>
            <span className="hidden sm:inline text-xs px-2 py-1 rounded-full bg-secondary text-foreground font-medium">
              Dashboard
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
              <div className="w-2 h-2 rounded-full bg-foreground" />
              <span className="text-xs font-medium">Connected to @your_handle</span>
            </div>
            <div className="w-9 h-9 rounded-full bg-muted" />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
        {/* Welcome */}
        <section className="animate-fade-in">
          <p className="text-sm text-muted-foreground mb-2">Welcome back</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Your agent is ready.</h1>
          <p className="text-lg text-muted-foreground mt-3 max-w-2xl">
            Style profile trained on your last 50 posts. Tell it what you want to say and it will write in your voice.
          </p>
        </section>

        {/* Quick Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
          <Card className="p-6 border-border bg-secondary/40">
            <p className="text-sm text-muted-foreground">Posts analyzed</p>
            <p className="text-3xl font-bold mt-2">50</p>
          </Card>
          <Card className="p-6 border-border bg-secondary/40">
            <p className="text-sm text-muted-foreground">Drafts ready</p>
            <p className="text-3xl font-bold mt-2">12</p>
          </Card>
          <Card className="p-6 border-border bg-secondary/40">
            <p className="text-sm text-muted-foreground">Published</p>
            <p className="text-3xl font-bold mt-2">3</p>
          </Card>
          <Card className="p-6 border-border bg-secondary/40">
            <p className="text-sm text-muted-foreground">Style accuracy</p>
            <p className="text-3xl font-bold mt-2">94%</p>
          </Card>
        </section>

        {/* Main Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Chat Panel */}
          <Card className="lg:col-span-2 p-8 border-border bg-background smooth-shadow space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Chat with your agent</h2>
                <p className="text-sm text-muted-foreground mt-1">Tell it what you want to say</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-foreground text-background text-xs font-semibold">
                Live
              </div>
            </div>

            {/* Conversation */}
            <div className="space-y-4 min-h-[280px]">
              <div className="flex justify-start">
                <div className="bg-secondary text-foreground rounded-2xl px-5 py-3 max-w-md">
                  <p className="text-sm">Hey. Ready when you are. What&apos;s on your mind today?</p>
                </div>
              </div>
              <div className="flex justify-end">
                <div className="bg-foreground text-background rounded-2xl px-5 py-3 max-w-md">
                  <p className="text-sm">Write something about shipping side projects on weekends.</p>
                </div>
              </div>
              <div className="flex justify-start">
                <div className="bg-secondary text-foreground rounded-2xl px-5 py-3 max-w-md space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">In your voice</p>
                  <p className="text-sm leading-relaxed">
                    &quot;Most of my best ideas got built on Saturdays. Not because weekends are magic — but because nobody&apos;s expecting anything from me. Make space for the work nobody asked for.&quot;
                  </p>
                </div>
              </div>
            </div>

            {/* Composer */}
            <div className="border-t border-border pt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="What do you want to post about?"
                  className="flex-1 px-4 py-3 rounded-lg border border-border bg-secondary/40 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground"
                />
                <Button className="bg-foreground text-background hover:bg-foreground/90 px-5">
                  Send
                </Button>
              </div>
            </div>
          </Card>

          {/* Style Profile Panel */}
          <Card className="p-8 border-border bg-foreground text-background smooth-shadow space-y-6">
            <div>
              <p className="text-xs font-semibold text-background/70 uppercase tracking-widest mb-3">Style Profile</p>
              <h2 className="text-2xl font-bold leading-tight">This is how you write</h2>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-background/60 mb-1">Tone</p>
                <p className="font-semibold">Honest, direct</p>
              </div>
              <div>
                <p className="text-xs text-background/60 mb-1">Length</p>
                <p className="font-semibold">Concise (1-3 sentences)</p>
              </div>
              <div>
                <p className="text-xs text-background/60 mb-1">Rhythm</p>
                <p className="font-semibold">Punchy with a landing line</p>
              </div>
              <div>
                <p className="text-xs text-background/60 mb-1">Topics</p>
                <p className="font-semibold">Building, shipping, craft</p>
              </div>
            </div>

            <div className="pt-4 border-t border-background/20">
              <p className="text-xs text-background/70">
                Trained on 50 posts. Refines as you publish more.
              </p>
            </div>
          </Card>
        </section>

        {/* Recent Drafts */}
        <section className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Recent drafts</h2>
            <Button variant="outline" className="border-border">View all</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                topic: 'Shipping side projects',
                preview: 'Most of my best ideas got built on Saturdays. Not because weekends are magic...',
                time: '2 minutes ago',
              },
              {
                topic: 'On building in public',
                preview: 'Building in public isn&apos;t about validation. It&apos;s about accountability...',
                time: '1 hour ago',
              },
              {
                topic: 'Working with constraints',
                preview: 'Constraints don&apos;t kill creativity. They focus it. Give me a deadline and a scope...',
                time: '3 hours ago',
              },
              {
                topic: 'Why I write daily',
                preview: 'Writing daily isn&apos;t about output. It&apos;s about thinking out loud and learning faster...',
                time: 'Yesterday',
              },
            ].map((draft, i) => (
              <Card key={i} className="p-6 border-border bg-background hover-lift cursor-pointer">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{draft.topic}</p>
                    <p className="text-xs text-muted-foreground">{draft.time}</p>
                  </div>
                  <p className="text-sm text-foreground leading-relaxed" dangerouslySetInnerHTML={{ __html: draft.preview }} />
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="bg-foreground text-background hover:bg-foreground/90">Post to X</Button>
                    <Button size="sm" variant="outline" className="border-border">Edit</Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
