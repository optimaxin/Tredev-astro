import { Hero } from "@/components/home/hero";
import { LiveTicker } from "@/components/home/live-ticker";
import { StatsCounter } from "@/components/home/stats-counter";
import { FourPillars } from "@/components/home/four-pillars";
import { HowItWorks } from "@/components/home/how-it-works";
import { Categories } from "@/components/home/categories";
import { FeaturedAstrologers } from "@/components/home/featured-astrologers";
import { Testimonials } from "@/components/home/testimonials";
import { FreeKundliForm } from "@/components/home/free-kundli-form";
import { PremiumKundliCampaign } from "@/components/home/premium-kundli-campaign";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { FreeToolsShowcase } from "@/components/home/free-tools-showcase";
import { BlogPreview } from "@/components/home/blog-preview";
import { DownloadApp } from "@/components/home/download-app";

export default function Home() {
  return (
    <>
      <Hero />
      <LiveTicker />
      <StatsCounter />
      <FourPillars />
      <HowItWorks />
      <Categories />
      <FeaturedAstrologers />
      <Testimonials />
      <FreeKundliForm />
      <PremiumKundliCampaign />
      <WhyChooseUs />
      <FreeToolsShowcase />
      <BlogPreview />
      <DownloadApp />
    </>
  );
}
