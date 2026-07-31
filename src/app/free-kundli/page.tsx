"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Lock, Loader2, Download, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";

const planets = [
  { planet: "☀ Surya (Sun)", sign: "Pisces", house: 10, degree: "24°32'", nakshatra: "Revati", retro: false },
  { planet: "🌙 Chandra (Moon)", sign: "Leo", house: 3, degree: "12°15'", nakshatra: "Magha", retro: false },
  { planet: "♂ Mangal (Mars)", sign: "Aries", house: 11, degree: "05°48'", nakshatra: "Ashwini", retro: false },
  { planet: "☿ Budha (Mercury)", sign: "Aquarius", house: 9, degree: "18°20'", nakshatra: "Shatabhisha", retro: false },
  { planet: "♃ Guru (Jupiter)", sign: "Scorpio", house: 6, degree: "01°05'", nakshatra: "Vishakha", retro: true },
  { planet: "♀ Shukra (Venus)", sign: "Capricorn", house: 8, degree: "27°45'", nakshatra: "Dhanishta", retro: false },
  { planet: "♄ Shani (Saturn)", sign: "Sagittarius", house: 7, degree: "15°30'", nakshatra: "Purva Ashadha", retro: false },
  { planet: "☊ Rahu", sign: "Gemini", house: 1, degree: "22°10'", nakshatra: "Punarvasu", retro: true },
  { planet: "☋ Ketu", sign: "Sagittarius", house: 7, degree: "22°10'", nakshatra: "Purva Ashadha", retro: true },
];

export default function FreeKundliPage() {
  const [form, setForm] = useState({ name: "", gender: "male", dob: "", tob: "", pob: "" });
  const [isGenerating, setIsGenerating] = useState(false);
  const [showResult, setShowResult] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setShowResult(true);
    }, 1000);
  }

  return (
    <>
      <PageHero
        eyebrow="Divine Tools"
        title="Your Free Janam Kundli"
        subtitle="Your cosmic blueprint, decoded in seconds — planetary positions, Dasha, Yogas & Doshas."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Free Kundli" }]}
      />

      <SectionContainer className="max-w-3xl">
        <form onSubmit={handleSubmit} className="rounded-2xl border p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Enter Birth Details</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="name" className="mb-1.5">Full Name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter your full name"
              />
            </div>
            <div>
              <Label className="mb-1.5">Gender</Label>
              <div className="flex gap-4 pt-1.5">
                {["male", "female", "other"].map((g) => (
                  <label key={g} className="flex items-center gap-1.5 text-sm capitalize">
                    <input
                      type="radio"
                      name="gender"
                      checked={form.gender === g}
                      onChange={() => setForm({ ...form, gender: g })}
                      className="size-4 accent-[var(--color-cta)]"
                    />
                    {g}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label htmlFor="dob" className="mb-1.5">Date of Birth</Label>
              <Input id="dob" type="date" required value={form.dob} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="tob" className="mb-1.5">Time of Birth (optional)</Label>
              <Input id="tob" type="time" value={form.tob} onChange={(e) => setForm({ ...form, tob: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="pob" className="mb-1.5">Place of Birth</Label>
              <Input id="pob" required placeholder="City, Country" value={form.pob} onChange={(e) => setForm({ ...form, pob: e.target.value })} />
            </div>
          </div>
          <Button type="submit" size="lg" className="mt-6 w-full gap-2" disabled={isGenerating}>
            {isGenerating ? <><Loader2 className="size-4 animate-spin" /> Calculating planetary positions...</> : <><Sparkles className="size-4" /> Generate My Free Kundli</>}
          </Button>
          <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5" /> Your birth details are encrypted and never shared
          </p>
        </form>
      </SectionContainer>

      {showResult && (
        <SectionContainer className="max-w-5xl">
          <div className="rounded-2xl border p-6 sm:p-8">
            <h2 className="text-xl font-semibold">Birth Details</h2>
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div><p className="text-muted-foreground">Name</p><p className="font-medium">{form.name || "—"}</p></div>
              <div><p className="text-muted-foreground">Date of Birth</p><p className="font-medium">{form.dob || "—"}</p></div>
              <div><p className="text-muted-foreground">Place of Birth</p><p className="font-medium">{form.pob || "—"}</p></div>
            </div>

            <h2 className="mt-8 text-xl font-semibold">Quick Summary</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[["Sun Sign", "♓ Pisces"], ["Moon Sign", "♌ Leo"], ["Ascendant", "♊ Gemini"], ["Nakshatra", "Purva Phalguni"]].map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-[var(--color-gold)]/5 p-3 text-center">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>

            <h2 className="mt-8 text-xl font-semibold">Planetary Positions</h2>
            <div className="mt-3 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Planet</th>
                    <th className="px-4 py-2.5">Sign</th>
                    <th className="px-4 py-2.5">House</th>
                    <th className="px-4 py-2.5">Degree</th>
                    <th className="px-4 py-2.5">Nakshatra</th>
                  </tr>
                </thead>
                <tbody>
                  {planets.map((p) => (
                    <tr key={p.planet} className="border-t">
                      <td className="px-4 py-2.5">{p.planet}{p.retro && <span className="ml-1 text-xs text-[var(--color-error)]">(R)</span>}</td>
                      <td className="px-4 py-2.5">{p.sign}</td>
                      <td className="px-4 py-2.5">{p.house}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{p.degree}</td>
                      <td className="px-4 py-2.5">{p.nakshatra}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h2 className="mt-8 text-xl font-semibold">Current Dasha Period</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Mahadasha</p><p className="mt-1 font-semibold">Guru (Jupiter) — 2022–2038</p></div>
              <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Antardasha</p><p className="mt-1 font-semibold">Shani (Saturn) — 2025–2028</p></div>
              <div className="rounded-xl border p-4"><p className="text-xs text-muted-foreground">Pratyantar</p><p className="mt-1 font-semibold">Shukra (Venus) — Jul–Dec 2026</p></div>
            </div>

            <h2 className="mt-8 text-xl font-semibold">Yogas & Doshas</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="text-[var(--color-success)]">✓ Gajakesari Yoga — Jupiter-Moon conjunction brings wisdom and prosperity</li>
              <li className="text-[var(--color-success)]">✓ Budhaditya Yoga — Sun-Mercury conjunction favors career and education</li>
              <li className="text-[var(--color-warning)]">⚠ Partial Kaal Sarp Yoga detected — consult for detailed remedies</li>
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="gap-2" render={<Link href="/talk-to-astrologer" />}>Talk to a Guru About This Kundli</Button>
              <Button variant="gold" render={<Link href="/premium-kundli/order" />}>Get 25+ Page Divine Blueprint @ ₹499</Button>
              <Button variant="outline" className="gap-2"><Download className="size-4" /> Download PDF</Button>
              <Button variant="outline" className="gap-2"><Share2 className="size-4" /> Share</Button>
            </div>
          </div>
        </SectionContainer>
      )}
    </>
  );
}
