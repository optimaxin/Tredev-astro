import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { MatchForm } from "@/components/kundli-matching/match-form";

export const metadata: Metadata = {
  title: "Kundli Matching — Guna Milan Calculator | AstroTredev",
  description: "Check real marriage compatibility with the classical 36-point Ashtakoot Guna Milan system, computed from actual birth charts.",
};

export default function KundliMatchingPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Kundli Matching"
        subtitle="Classical 36-point Guna Milan, computed from real planetary positions — not a guess."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Kundli Matching" }]}
      />
      <Section>
        <MatchForm />
      </Section>
    </>
  );
}
