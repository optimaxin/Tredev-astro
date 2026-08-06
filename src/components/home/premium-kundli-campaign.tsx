"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, ScrollText, Clock, Check, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OmMark } from "@/components/ui/om-mark";
import { ZodiacWheel } from "@/components/ui/zodiac-wheel";
import { Section } from "@/components/ui/section";

const features = [
  "25+ Pages Detailed Analysis",
  "Handwritten by Expert Astrologer",
  "Personal Video Explanation (10-15 min)",
  "5 Years Future Predictions",
  "Marriage, Career, Health Analysis",
  "Gemstone & Remedy Recommendations",
  "Lifetime Digital Access",
  "Free Shipping (Physical Copy)",
];

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : initialSeconds)), 1000);
    return () => clearInterval(id);
  }, [initialSeconds]);
  const h = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, "0");
  const s = String(seconds % 60).padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function PremiumKundliCampaign() {
  const timer = useCountdown(8 * 3600 + 45 * 60 + 32);

  return (
    <Section>
      <div className="grid gap-10 rounded-2xl border bg-card p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-marigold)]/15 px-3 py-1 text-sm font-medium text-[var(--color-marigold)]">
            <Star className="size-3.5 fill-current" /> 50,000+ Delivered
          </span>
          <h2 className="mt-4 flex items-start gap-3 text-3xl font-bold">
            <ScrollText className="mt-1 size-7 shrink-0 text-[var(--color-marigold)]" />
            Your Divine Blueprint, Handwritten by Maharishis
          </h2>
          <p className="mt-2 text-muted-foreground">Personally analyzed by our senior Maharishi-tier astrologers, not computer-generated.</p>
          <div className="relative mt-6 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border-2 border-[var(--color-marigold)]/30 bg-gradient-to-br from-[var(--color-ink)] to-[var(--color-plum)]">
            <ZodiacWheel className="absolute inset-0 m-auto size-56 text-[var(--color-marigold)]/25" />
            <OmMark className="relative text-7xl opacity-90" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-[var(--color-marigold)]">₹499</span>
            <span className="text-lg text-muted-foreground line-through">₹2,999</span>
            <span className="rounded-full bg-[var(--color-error)]/15 px-2 py-0.5 text-sm font-semibold text-[var(--color-error)]">83% OFF</span>
          </div>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-[var(--color-error)]"><Clock className="size-3.5" /> Offer expires in {timer}</p>

          <ul className="mt-6 space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]" /> {f}
              </li>
            ))}
          </ul>

          <Button size="lg" className="mt-6 w-full gap-2 animate-glow-pulse" render={<Link href="/premium-kundli/order" />}>
            Claim Your Divine Blueprint @ ₹499 <Target className="size-4" />
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">100% Satisfaction or Money Back</p>
        </div>
      </div>
    </Section>
  );
}
