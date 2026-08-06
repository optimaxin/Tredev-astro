"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Lock, Gift, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Section } from "@/components/ui/section";

type KundliPoint = { name: string; rashi: string; nakshatra: string; pada: number };
type KundliResult = {
  place: string;
  chart: { ascendant: KundliPoint; planets: KundliPoint[]; mangalDosha: boolean };
};

export function FreeKundliForm() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [timeOfBirth, setTimeOfBirth] = useState("");
  const [place, setPlace] = useState("");
  const [result, setResult] = useState<KundliResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/kundli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, dob, timeOfBirth, place }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not generate your Kundli");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const sun = result?.chart.planets.find((p) => p.name === "Sun");
  const moon = result?.chart.planets.find((p) => p.name === "Moon");

  return (
    <Section>
      <div className="ink-bg relative overflow-hidden rounded-2xl px-6 py-12 text-white sm:px-12">
        <div className="relative mx-auto max-w-xl text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-white/10 text-[var(--color-marigold)]">
            <Gift className="size-6" />
          </div>
          <h2 className="mt-4 text-3xl font-bold">Generate Your FREE Kundli Now</h2>
          <p className="mt-3 text-white/80">Real planetary positions computed from your exact birth details — Moon sign, Nakshatra, Ascendant &amp; more</p>
        </div>

        <form onSubmit={handleSubmit} className="relative mx-auto mt-8 grid max-w-xl gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="kundli-name" className="mb-1.5 text-white/90">Full Name</Label>
            <Input id="kundli-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" className="bg-white/10 text-white placeholder:text-white/50" />
          </div>
          <div>
            <Label htmlFor="kundli-dob" className="mb-1.5 text-white/90">Date of Birth</Label>
            <Input id="kundli-dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="bg-white/10 text-white [color-scheme:dark]" />
          </div>
          <div>
            <Label htmlFor="kundli-time" className="mb-1.5 text-white/90">Time of Birth</Label>
            <Input id="kundli-time" type="time" required value={timeOfBirth} onChange={(e) => setTimeOfBirth(e.target.value)} className="bg-white/10 text-white [color-scheme:dark]" />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="kundli-pob" className="mb-1.5 text-white/90">Place of Birth</Label>
            <Input id="kundli-pob" required value={place} onChange={(e) => setPlace(e.target.value)} placeholder="e.g. Jaipur, India" className="bg-white/10 text-white placeholder:text-white/50" />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="sm:col-span-2 gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {loading ? "Calculating..." : "Generate My Kundli"}
          </Button>
          <p className="flex items-center justify-center gap-1.5 text-xs text-white/60 sm:col-span-2"><Lock className="size-3.5" /> Your data is 100% secure and never shared</p>
        </form>

        {error && <p className="relative mx-auto mt-4 max-w-xl text-center text-sm text-[var(--color-error)]">{error}</p>}

        {result && sun && moon && (
          <div className="relative mx-auto mt-8 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Sun Sign", sun.rashi],
              ["Moon Sign", moon.rashi],
              ["Ascendant", result.chart.ascendant.rashi],
              ["Nakshatra", `${moon.nakshatra} (Pada ${moon.pada})`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg glass p-3 text-center">
                <p className="text-xs text-white/60">{label}</p>
                <p className="mt-1 text-sm font-semibold">{value}</p>
              </div>
            ))}
            {result.chart.mangalDosha && (
              <p className="col-span-2 rounded-lg bg-[var(--color-error)]/15 p-2.5 text-center text-xs text-[var(--color-error)] sm:col-span-4">
                Mars is in a Mangal Dosha house in your chart — talk to an astrologer for remedies.
              </p>
            )}
            <Button variant="secondary" className="col-span-2 mt-2 sm:col-span-4" render={<Link href="/premium-kundli/order" />}>
              Get Complete 25+ Page Divine Blueprint @ ₹499
            </Button>
          </div>
        )}
      </div>
    </Section>
  );
}
