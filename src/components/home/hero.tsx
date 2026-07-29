"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Star, Users, Award, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CosmicBackground } from "@/components/ui/cosmic-background";
import { OmMark } from "@/components/ui/om-mark";
import { astrologers } from "@/lib/mock-data";

const rotatingWords = ["Astrologers", "Jyotishis", "Gurus", "Guides"];

const trustBadges = [
  { icon: Star, text: "4.8 Rating" },
  { icon: Users, text: "2M+ Consultations" },
  { icon: Award, text: "5000+ Verified Astrologers" },
  { icon: ShieldCheck, text: "100% Confidential" },
];

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setWordIndex((i) => (i + 1) % rotatingWords.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative overflow-hidden text-white">
      <CosmicBackground />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full glass px-4 py-1.5 text-sm font-medium">
            <OmMark className="text-base" /> #1 Trusted Astrology Platform in India
          </span>

          <h1 className="mt-6 font-heading text-5xl font-semibold leading-tight sm:text-6xl lg:text-7xl">
            Discover Your Destiny with India&apos;s Finest{" "}
            <span key={wordIndex} className="text-[var(--color-gold)]">
              {rotatingWords[wordIndex]}
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg text-white/80">
            First 3 minutes FREE with any astrologer. Get personalized guidance for love,
            career, marriage, health &amp; more.
          </p>

          <p className="mt-3 max-w-lg font-devanagari text-base text-[var(--color-brass)]">
            सर्वे भवन्तु सुखिनः{" "}
            <span className="font-sans text-sm text-white/50">— may all beings find happiness</span>
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="animate-glow-pulse gap-2 text-base"
              render={<Link href="/talk-to-astrologer" />}
            >
              🔮 Talk to Astrologer Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="gap-2 border-white/30 bg-white/5 text-base text-white hover:bg-white/10"
              render={<Link href="/chat-with-astrologer" />}
            >
              💬 Chat with Astrologer
            </Button>
          </div>

          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3">
            {trustBadges.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-1.5 text-sm text-white/70">
                <Icon className="size-4 text-[var(--color-gold)]" />
                {text}
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-col gap-4 lg:pt-8">
          <span className="self-start rounded-full bg-[var(--color-success)]/20 px-3 py-1 text-sm text-[var(--color-success)]">
            🟢 247 astrologers online now
          </span>
          {astrologers.slice(0, 3).map((a, i) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-xl glass p-4"
              style={{ marginLeft: i % 2 === 1 ? "2rem" : 0 }}
            >
              <Avatar className="size-12 border-2 border-[var(--color-gold)]">
                <AvatarFallback className="bg-[var(--color-cosmic)] text-white">
                  {a.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{a.name}</p>
                <div className="flex items-center gap-1 text-sm text-white/70">
                  <Star className="size-3.5 fill-[var(--color-gold)] text-[var(--color-gold)]" />
                  {a.rating}
                  <span className={a.online ? "text-[var(--color-success)]" : "text-white/50"}>
                    • {a.online ? "Online" : "Busy"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
