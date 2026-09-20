import Header from "@/components/landing/header"
import HeroSection from "@/components/landing/hero-section"
import HowItWorks from "@/components/landing/how-it-works"
import FeaturesDeepDive from "@/components/landing/features-deep-dive"
import StyleCardShowcase from "@/components/landing/style-card-showcase"
import ChatExperience from "@/components/landing/chat-experience"
import DashboardPreview from "@/components/landing/dashboard-preview"
import Testimonials from "@/components/landing/testimonials"
import FAQ from "@/components/landing/faq"
import FinalCTA from "@/components/landing/final-cta"
import Footer from "@/components/landing/footer"

export const dynamic = "force-dynamic"

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Header />
      <HeroSection />
      <HowItWorks />
      <FeaturesDeepDive />
      <StyleCardShowcase />
      <ChatExperience />
      <DashboardPreview />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <Footer />
    </main>
  )
}
