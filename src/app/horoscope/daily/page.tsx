import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { PanchangWidget } from "@/components/horoscope/panchang-widget";

export const metadata: Metadata = {
  title: "Today's Panchang — Daily Horoscope | AstroTredev",
  description: "Real-time Tithi, Nakshatra, Yoga, Karan, Rahu Kaal, and Abhijit Muhurat computed from actual planetary positions for any city.",
};

export default function DailyHoroscopePage() {
  return (
    <>
      <PageHero
        eyebrow="Free Tool"
        title="Today's Panchang"
        subtitle="The day's Vedic almanac, calculated live from real sunrise, sunset, and planetary positions."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Daily Horoscope" }]}
      />
      <Section>
        <PanchangWidget />
      </Section>
    </>
  );
}
