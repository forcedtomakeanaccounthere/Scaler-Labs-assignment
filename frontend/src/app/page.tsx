import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import StatsBar from "@/components/landing/StatsBar";
import Features from "@/components/landing/Features";
import HowItWorks from "@/components/landing/HowItWorks";
import IndustryTicker from "@/components/landing/IndustryTicker";
import AdaptivePlatform from "@/components/landing/AdaptivePlatform";
import CTASection from "@/components/landing/CTASection";
import Footer from "@/components/landing/Footer";
import ScrollToTop from "@/components/ui/ScrollToTop";

export default function Home() {
  return (
    <main
      className="relative overflow-x-hidden transition-colors duration-300"
      style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
    >
      <Navbar />
      <Hero />
      <StatsBar />
      <Features />
      <HowItWorks />
      <IndustryTicker />
      <AdaptivePlatform />
      <CTASection />
      <Footer />
      <ScrollToTop />
    </main>
  );
}
