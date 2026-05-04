'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import Header from '@/components/landing/header';
import HeroSection from '@/components/landing/hero-section';
import StyleCardShowcase from '@/components/landing/style-card-showcase';
import ChatExperience from '@/components/landing/chat-experience';
import DashboardPreview from '@/components/landing/dashboard-preview';
import FeatureStrip from '@/components/landing/feature-strip';
import SocialProof from '@/components/landing/social-proof';
import CTA from '@/components/landing/cta';

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <HeroSection />
      <StyleCardShowcase />
      <ChatExperience />
      <DashboardPreview />
      <FeatureStrip />
      <SocialProof />
      <CTA />
    </main>
  );
}
