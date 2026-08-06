import type { Metadata } from "next";
import { Moon, Sun, Star, Compass } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Section, SectionHeading } from "@/components/ui/section";
import { FreeKundliForm } from "@/components/home/free-kundli-form";

export const metadata: Metadata = {
  title: "Free Kundli — Generate Your Birth Chart Online | AstroTredev",
  description: "Generate your free Vedic Kundli instantly. Get your Moon sign, Sun sign, Nakshatra, and Ascendant based on your date, time, and place of birth.",
};

const included = [
  { icon: Sun, label: "Sun Sign", desc: "Your core identity and life direction" },
  { icon: Moon, label: "Moon Sign", desc: "Your emotional nature and inner mind" },
  { icon: Compass, label: "Ascendant", desc: "How the world perceives you" },
  { icon: Star, label: "Nakshatra", desc: "Your birth star and its ruling deity" },
];

export default function FreeKundliPage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Generate Your Free Kundli"
        subtitle="Enter your birth details to instantly reveal your Vedic birth chart essentials."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Free Kundli" }]}
      />
      <FreeKundliForm />
      <Section className="border-t">
        <SectionHeading eyebrow="What You Get" heading="Inside Your Free Kundli" subheading="A snapshot of the core placements every Vedic reading starts from." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {included.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="rounded-xl border p-5 text-center">
              <Icon className="mx-auto size-6 text-[var(--color-marigold)]" />
              <p className="mt-3 font-semibold">{label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
