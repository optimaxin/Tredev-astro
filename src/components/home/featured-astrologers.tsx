import { Section, SectionHeading } from "@/components/ui/section";
import { AstrologerCard } from "@/components/ui/astrologer-card";
import { getAstrologers } from "@/lib/astrologers";

export async function FeaturedAstrologers() {
  const astrologers = await getAstrologers();
  return (
    <Section>
      <SectionHeading eyebrow="Handpicked" heading="Our Top-Rated Astrologers" subheading="Handpicked experts with 4.8+ rating and 10+ years experience" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {astrologers.slice(0, 4).map((a) => <AstrologerCard key={a.id} astrologer={a} />)}
      </div>
    </Section>
  );
}
