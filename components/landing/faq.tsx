'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      question: 'How does Ashqe learn my writing style?',
      answer: 'Ashqe analyzes your past posts on X to understand your vocabulary, tone, sentence structure, and unique voice patterns. We process this data securely and use it to train your personalized AI model. The more posts we analyze, the better the AI becomes at capturing your authentic voice.',
    },
    {
      question: 'Will my posts sound like AI?',
      answer: 'No. Ashqe is specifically designed to sound like YOU, not like generic AI. The AI learns your unique voice and generates content that maintains your personal style, humor, and perspective. Your audience should never be able to tell the difference.',
    },
    {
      question: 'Is my data safe and private?',
      answer: 'Your privacy is our top priority. All data is encrypted end-to-end, and we never share your writing samples or personal information with third parties. We comply with GDPR, CCPA, and other data protection regulations. You can delete your data anytime.',
    },
    {
      question: 'Can I edit the generated posts?',
      answer: 'Absolutely. You have full control over every post. The AI generates suggestions, but you can edit, rewrite, or completely change anything before posting. We provide multiple variations so you can pick the best one or create a hybrid version.',
    },
    {
      question: 'How long does it take to set up?',
      answer: 'Just 5 minutes. Connect your X account, let Ashqe analyze your recent posts (usually 1-2 minutes), and you&apos;re ready to generate content. The AI improves over time as it sees more of your posts.',
    },
    {
      question: 'What if I want different tones for different posts?',
      answer: 'Ashqe supports style variations. You can generate posts in different tones (professional, casual, witty, inspirational) while keeping your core voice. This lets you adapt to different contexts without sounding inauthentic.',
    },
    {
      question: 'Can I use Ashqe for other platforms besides X?',
      answer: 'Currently, Ashqe is optimized for X. We&apos;re working on integrations with LinkedIn, Instagram, and other platforms. Your voice model will transfer across platforms once available.',
    },
    {
      question: 'What&apos;s the pricing?',
      answer: 'We offer a free tier to get started. Paid plans start at $19/month for unlimited generation and advanced features. We also have enterprise plans for teams and organizations. No credit card required for the free trial.',
    },
  ];

  return (
    <section className="relative py-32 bg-secondary/30">
      <div className="max-w-3xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-16 animate-fade-in">
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
