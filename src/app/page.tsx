import { Hero } from "@/components/home/hero";
import { HowItWorks } from "@/components/home/how-it-works";
import { LiveTicker } from "@/components/home/live-ticker";
import { Categories } from "@/components/home/categories";
import { FeaturedAstrologers } from "@/components/home/featured-astrologers";
import { FreeKundliForm } from "@/components/home/free-kundli-form";
import { StatsCounter } from "@/components/home/stats-counter";
import { PremiumKundliCampaign } from "@/components/home/premium-kundli-campaign";
import { Testimonials } from "@/components/home/testimonials";
import { WhyChooseUs } from "@/components/home/why-choose-us";
import { FreeToolsShowcase } from "@/components/home/free-tools-showcase";
import { BlogPreview } from "@/components/home/blog-preview";
import { DownloadApp } from "@/components/home/download-app";
import { SectionDivider } from "@/components/ui/section-divider";

export default function Home() {
  return (
    <>
      <Hero />
      <LiveTicker />
      <HowItWorks />
      <Categories />
      <FeaturedAstrologers />
      <FreeKundliForm />
      <StatsCounter />
      <PremiumKundliCampaign />
      <SectionDivider />
      <Testimonials />
      <WhyChooseUs />
      <FreeToolsShowcase />
      <BlogPreview />
      <DownloadApp />
    </>
  );
}
