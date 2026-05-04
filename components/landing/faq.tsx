'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How does Ashqe learn my writing style?',
      answer: "After you connect your X account, Ashqe reads your last 50 posts and builds a structured style profile — your tone, vocabulary, sentence structure, formatting habits, and the patterns that make your voice yours. That profile is what your personal agent writes from.",
    },
    {
      question: 'Will my posts sound like AI?',
      answer: "No. Ashqe doesn't write like a generic AI — it writes like you. Because it's grounded in your own posts, your agent picks up the small things: how you open a thought, how you land a joke, how long your sentences run. People who follow you shouldn't be able to tell the difference.",
    },
    {
      question: 'Is my data safe and private?',
      answer: "Yes. We connect to X through OAuth, so we never see your password and never store raw tokens. Your style profile belongs to you, is never used to train shared models, and you can delete everything from your account at any time.",
    },
    {
      question: 'Can I edit the posts before publishing?',
      answer: "Always. Your agent suggests posts and variations — you decide what gets shipped. You can rewrite, tweak, mix drafts together, or throw it all away and start over. Nothing is posted until you tap publish.",
    },
    {
      question: 'How long does it take to set up?',
      answer: "About five minutes. Sign in with X, let Ashqe analyze your recent posts, and you'll be chatting with your personal agent on the other side. The more you use it, the sharper it gets.",
    },
    {
      question: 'Does Ashqe post to X for me?',
      answer: "Only when you ask it to. Once you approve a post, you can publish it directly to X with one tap, secured through OAuth. You can also just copy the text and post it yourself — it's your account, your call.",
    },
  ];

  return (
    <section className="relative py-16 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6 text-balance">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Everything you need to know about Ashqe.
          </p>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Card className="border-border bg-background overflow-hidden">
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full px-8 py-6 flex items-center justify-between hover:bg-secondary/30 transition-colors"
                >
                  <h3 className="text-lg font-semibold text-foreground text-left">{faq.question}</h3>
                  <span
                    className="text-2xl font-light text-foreground transition-transform duration-300 ml-4 flex-shrink-0"
                    style={{
                      transform: openIndex === index ? 'rotate(180deg)' : 'rotate(0deg)',
                    }}
                  >
                    ↓
                  </span>
                </button>

                {/* Answer */}
                {openIndex === index && (
                  <div className="px-8 pb-6 border-t border-border pt-6 bg-secondary/20">
                    <p className="text-base text-muted-foreground leading-relaxed">{faq.answer}</p>
                  </div>
                )}
              </Card>
            </div>
          ))}
        </div>

        {/* Contact Support */}
        <div className="mt-16 text-center animate-fade-in">
          <p className="text-lg text-muted-foreground mb-4">Still have questions?</p>
          <Button className="bg-foreground text-background hover:bg-foreground/90">
            Contact our support team
          </Button>
        </div>
      </div>
    </section>
  );
}
