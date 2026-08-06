import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { AstrologerListing } from "@/components/astrologers/astrologer-listing";

export const metadata: Metadata = {
  title: "Talk to Astrologer — Get Instant Guidance | AstroTredev",
  description: "Connect with 5000+ verified astrologers for voice consultation. First 3 minutes FREE. 24/7 availability in 11+ languages.",
};

export default function TalkToAstrologerPage() {
  return (
    <>
      <PageHero
        eyebrow="Consult Experts"
        title="Talk to a Verified Astrologer"
        subtitle="Filter by language, specialty, and Guru tier. First 3 minutes are free with any astrologer."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Talk to Astrologer" }]}
      />
      <Section><AstrologerListing /></Section>
    </>
  );
}
