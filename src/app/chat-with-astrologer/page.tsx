import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { AstrologerListing } from "@/components/astrologers/astrologer-listing";

export const metadata: Metadata = {
  title: "Chat with Astrologer — Instant Text Guidance | AstroTredev",
  description: "Chat with verified astrologers in real time. First 3 minutes free, WhatsApp-style conversation, translation support.",
};

export default function ChatWithAstrologerPage() {
  return (
    <>
      <PageHero
        eyebrow="Consult Experts"
        title="Chat with a Guru"
        subtitle="Prefer typing over talking? Get the same depth of guidance through real-time chat."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Chat with Astrologer" }]}
      />
      <SectionContainer>
        <AstrologerListing />
      </SectionContainer>
    </>
  );
}
