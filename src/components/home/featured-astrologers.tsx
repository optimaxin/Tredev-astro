import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { AstrologerCard } from "@/components/ui/astrologer-card";
import { astrologers } from "@/lib/mock-data";

export function FeaturedAstrologers() {
  return (
    <SectionContainer>
      <SectionHeading
        eyebrow="⭐ Handpicked"
        heading="Our Top-Rated Astrologers"
        subheading="Handpicked experts with 4.8+ rating and 10+ years experience"
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {astrologers.map((a) => (
          <AstrologerCard key={a.id} astrologer={a} />
        ))}
      </div>
    </SectionContainer>
  );
}
