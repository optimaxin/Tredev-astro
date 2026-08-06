import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { NumerologyForm } from "@/components/numerology/numerology-form";

export const metadata: Metadata = {
  title: "Numerology Calculator — Life Path, Destiny & Soul Urge | AstroTredev",
  description: "Discover your Life Path, Destiny, Soul Urge, and Personality numbers using the classical Pythagorean numerology system.",
};

export default function NumerologyPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Numerology Calculator"
        subtitle="Classical Pythagorean numerology, computed from your name and birth date."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Numerology" }]}
      />
      <Section>
        <NumerologyForm />
      </Section>
    </>
  );
}
