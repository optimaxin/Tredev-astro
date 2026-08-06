"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Users, Award, ShieldCheck, Sparkles, MessageCircle, ScrollText, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InkBackground } from "@/components/ui/ink-background";
import { ZodiacWheel } from "@/components/ui/zodiac-wheel";

const rotatingWords = ["Clarity", "Karma", "Dharma", "Destiny"];

const trustBadges = [
  { icon: Star, text: "4.8 Rating" },
  { icon: Users, text: "2M+ Consultations" },
  { icon: Award, text: "5000+ Verified Astrologers" },
  { icon: ShieldCheck, text: "100% Confidential" },
];

const quickAccess = [
  { icon: ScrollText, label: "Free Kundli", href: "/free-kundli" },
  { icon: Heart, label: "Match Compatibility", href: "/kundli-matching" },
  { icon: Sparkles, label: "Talk to a Guru", href: "/talk-to-astrologer" },
];

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % rotatingWords.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden text-white">
      <InkBackground animated />
      <ZodiacWheel className="pointer-events-none absolute left-1/2 top-1/2 size-[720px] -translate-x-1/2 -translate-y-1/2 text-[var(--color-marigold)]/[0.06]" />

      <div className="relative mx-auto flex max-w-3xl flex-col items-center px-4 py-24 text-center sm:px-6 lg:py-32">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-success)]/15 px-3 py-1 text-xs text-[var(--color-success)]">
          <span className="size-1.5 animate-breathing rounded-full bg-[var(--color-success)]" /> 247 astrologers online now
        </span>

        <span className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-sindoor)]">
          The Verified Astrology Marketplace
        </span>

        <h1 className="mt-5 font-heading text-5xl font-normal leading-[1.1] sm:text-6xl lg:text-7xl">
          Where Uncertainty
          <br />
          Becomes{" "}
          <span key={wordIndex} className="italic text-[var(--color-marigold)]">
            {rotatingWords[wordIndex]}
          </span>
        </h1>

        <p className="mt-6 max-w-lg text-lg text-white/70">
          Your chart. Your astrologer. Your path — first 3 minutes free, verified gurus only, no generic horoscopes.
        </p>

        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button
            size="lg"
            className="animate-glow-pulse gap-2 rounded-full border border-[var(--color-sindoor)]/60 bg-transparent px-8 text-base font-semibold uppercase tracking-wide text-[var(--color-sindoor)] hover:bg-[var(--color-sindoor)]/10"
            render={<Link href="/talk-to-astrologer" />}
          >
            <Sparkles className="size-4" /> Talk to Astrologer
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="gap-2 rounded-full border-white/15 bg-white/5 px-8 text-base uppercase tracking-wide text-white hover:bg-white/10"
            render={<Link href="/chat-with-astrologer" />}
          >
            <MessageCircle className="size-4" /> Explore Astrologers
          </Button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
          {trustBadges.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-1.5 text-sm text-white/60">
              <Icon className="size-4 text-[var(--color-marigold)]" /> {text}
            </div>
          ))}
        </div>

        <div className="mt-8 grid w-full max-w-md grid-cols-3 gap-3">
          {quickAccess.map((q) => (
            <Link key={q.label} href={q.href} className="group flex flex-col items-center gap-2 rounded-xl glass p-3 text-center transition-colors hover:border-[var(--color-marigold)]/50">
              <span className="flex size-10 items-center justify-center rounded-full bg-[var(--color-marigold)]/15 text-[var(--color-marigold)] transition-transform group-hover:scale-110">
                <q.icon className="size-5" />
              </span>
              <span className="text-xs font-medium text-white/70">{q.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
          Scroll
          <span className="h-10 w-px animate-pulse bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </div>
    </section>
  );
}
