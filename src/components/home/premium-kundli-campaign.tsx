"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { OmMark } from "@/components/ui/om-mark";
import { SectionContainer } from "@/components/ui/section-container";

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
    <SectionContainer>
      <div className="grid gap-10 rounded-2xl border bg-card p-6 sm:p-10 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-block rounded-full bg-[var(--color-gold)]/15 px-3 py-1 text-sm font-medium text-[var(--color-gold)]">
            ⭐ 50,000+ Delivered
          </span>
          <h2 className="mt-4 text-3xl font-bold">
            📜 Get Your HANDWRITTEN Premium Kundli
          </h2>
          <p className="mt-2 text-muted-foreground">
            Personally analyzed by our top Platinum astrologers, not computer-generated.
          </p>
          <div className="mt-6 flex aspect-[4/3] items-center justify-center rounded-t-[8rem] rounded-b-xl border-2 border-[var(--color-brass)]/40 bg-gradient-to-br from-[var(--color-cosmic)] to-[var(--color-cosmic-navy)]">
            <OmMark className="text-7xl opacity-80" />
          </div>
        </div>

        <div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-[var(--color-gold)]">₹299</span>
            <span className="text-lg text-muted-foreground line-through">₹1,499</span>
            <span className="rounded-full bg-[var(--color-error)]/15 px-2 py-0.5 text-sm font-semibold text-[var(--color-error)]">
              80% OFF
            </span>
          </div>
          <p className="mt-1 text-sm font-medium text-[var(--color-error)]">
            ⏰ Offer expires in {timer}
          </p>

          <ul className="mt-6 space-y-2">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm">
                <span className="text-[var(--color-success)]">✅</span>
                {f}
              </li>
            ))}
          </ul>

          <Button
            variant="gold"
            size="lg"
            className="mt-6 w-full gap-2 animate-glow-pulse"
            render={<Link href="/premium-kundli/order" />}
          >
            Get Your Premium Kundli @ ₹299 🎯
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            100% Satisfaction or Money Back
          </p>
        </div>
      </div>
    </SectionContainer>
  );
}
