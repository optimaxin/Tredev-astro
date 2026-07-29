"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SectionContainer } from "@/components/ui/section-container";

const moonSigns = ["♈ Aries", "♌ Leo", "♊ Gemini", "♎ Libra", "♓ Pisces", "♑ Capricorn"];
const sunSigns = ["♓ Pisces", "♉ Taurus", "♋ Cancer", "♐ Sagittarius"];
const nakshatras = ["Purva Phalguni", "Ashwini", "Rohini", "Hasta", "Revati"];

type Result = { moonSign: string; sunSign: string; nakshatra: string; ascendant: string };

export function FreeKundliForm() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const seed = dob.split("-").reduce((acc, n) => acc + Number(n), 0) || name.length;
    setResult({
      moonSign: moonSigns[seed % moonSigns.length],
      sunSign: sunSigns[seed % sunSigns.length],
      nakshatra: nakshatras[seed % nakshatras.length],
      ascendant: moonSigns[(seed + 2) % moonSigns.length],
    });
  }

  return (
    <SectionContainer>
      <div className="cosmic-bg relative overflow-hidden rounded-2xl px-6 py-12 text-white sm:px-12">
        <div className="relative mx-auto max-w-xl text-center">
          <h2 className="text-3xl font-bold">🎁 Generate Your FREE Kundli Now</h2>
          <p className="mt-3 text-white/80">
            Discover your Moon sign, Nakshatra, planetary positions &amp; more in 10 seconds
          </p>
        </div>

        <form onSubmit={handleSubmit} className="relative mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="kundli-name" className="mb-1.5 text-white/90">Full Name</Label>
            <Input
              id="kundli-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              className="bg-white/10 text-white placeholder:text-white/50"
            />
          </div>
          <div>
            <Label htmlFor="kundli-dob" className="mb-1.5 text-white/90">Date of Birth</Label>
            <Input
              id="kundli-dob"
              type="date"
              required
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="bg-white/10 text-white [color-scheme:dark]"
            />
          </div>
          <div>
            <Label htmlFor="kundli-pob" className="mb-1.5 text-white/90">Place of Birth</Label>
            <Input
              id="kundli-pob"
              placeholder="Start typing city..."
              className="bg-white/10 text-white placeholder:text-white/50"
            />
          </div>
          <Button type="submit" size="lg" className="sm:col-span-2 gap-2">
            <Sparkles className="size-4" /> Generate My Kundli
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-white/60 sm:col-span-2">
            <Lock className="size-3.5" /> Your data is 100% secure and never shared
          </p>
        </form>

        {result && (
          <div className="relative mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Sun Sign", result.sunSign],
              ["Moon Sign", result.moonSign],
              ["Ascendant", result.ascendant],
              ["Nakshatra", result.nakshatra],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg glass p-3 text-center">
                <p className="text-xs text-white/60">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
            <Button
              variant="gold"
              className="col-span-2 mt-2 sm:col-span-4"
              render={<Link href="/premium-kundli/order" />}
            >
              Get Complete 25+ Page Premium Kundli @ ₹299
            </Button>
          </div>
        )}
      </div>
    </SectionContainer>
  );
}
