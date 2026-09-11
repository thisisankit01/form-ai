import Hero from "@/sections/Hero";
import ProductExplanationStrip from "@/sections/ProductExplanationStrip";
import FeatureSection from "@/sections/FeatureSection";
import HowItWorks from "@/sections/HowItWorks";
import SamplePricing from "@/sections/SamplePricing";
import CTASection from "@/sections/CTASection";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ProductExplanationStrip />
      <FeatureSection />
      <HowItWorks />
      <SamplePricing />
      <CTASection />
    </>
  );
}