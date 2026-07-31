"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { gunMilanCategories } from "@/lib/mock-data";

export default function KundliMatchingPage() {
  const [boy, setBoy] = useState({ name: "", dob: "" });
  const [girl, setGirl] = useState({ name: "", dob: "" });
  const [isMatching, setIsMatching] = useState(false);
  const [showResult, setShowResult] = useState(false);

  const totalEarned = gunMilanCategories.reduce((sum, c) => sum + c.earned, 0);
  const totalMax = gunMilanCategories.reduce((sum, c) => sum + c.max, 0);
  const percentage = Math.round((totalEarned / totalMax) * 100);
  const nadiDosha = gunMilanCategories.find((c) => c.category.startsWith("Nadi"))!.earned === 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsMatching(true);
    setTimeout(() => {
      setIsMatching(false);
      setShowResult(true);
    }, 1200);
  }

  return (
    <>
      <PageHero
        eyebrow="Divine Tools"
        title="Kundli Matching (Gun Milan)"
        subtitle="Enter both partners' birth details for a detailed 36-point compatibility analysis."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Kundli Matching" }]}
      />

      <SectionContainer className="max-w-4xl">
        <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-blue-500/30 p-6">
            <h2 className="font-semibold text-blue-500">Groom&apos;s Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="boy-name" className="mb-1.5">Name</Label>
                <Input id="boy-name" required value={boy.name} onChange={(e) => setBoy({ ...boy, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="boy-dob" className="mb-1.5">Date of Birth</Label>
                <Input id="boy-dob" type="date" required value={boy.dob} onChange={(e) => setBoy({ ...boy, dob: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-pink-500/30 p-6">
            <h2 className="font-semibold text-pink-500">Bride&apos;s Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <Label htmlFor="girl-name" className="mb-1.5">Name</Label>
                <Input id="girl-name" required value={girl.name} onChange={(e) => setGirl({ ...girl, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="girl-dob" className="mb-1.5">Date of Birth</Label>
                <Input id="girl-dob" type="date" required value={girl.dob} onChange={(e) => setGirl({ ...girl, dob: e.target.value })} />
              </div>
            </div>
          </div>

          <Button type="submit" size="lg" className="gap-2 sm:col-span-2" disabled={isMatching}>
            {isMatching ? <><Loader2 className="size-4 animate-spin" /> Matching charts...</> : <><Heart className="size-4" /> Match Kundlis</>}
          </Button>
        </form>
      </SectionContainer>

      {showResult && (
        <SectionContainer className="max-w-4xl">
          <div className="rounded-2xl border p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="relative flex size-36 items-center justify-center rounded-full border-8 border-[var(--color-gold)]/20">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(var(--color-gold) ${percentage * 3.6}deg, transparent 0deg)`,
                    mask: "radial-gradient(farthest-side, transparent calc(100% - 8px), black calc(100% - 8px))",
                    WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 8px), black calc(100% - 8px))",
                  }}
                />
                <div className="text-center">
                  <p className="font-heading text-3xl font-bold">{totalEarned}/{totalMax}</p>
                  <p className="text-xs text-muted-foreground">{percentage}%</p>
                </div>
              </div>
              <p className="mt-4 flex items-center gap-1.5 text-lg font-semibold text-[var(--color-success)]">
                <CheckCircle2 className="size-5" /> {percentage >= 60 ? "Good Match" : "Needs Review"}
              </p>
              <p className="mt-1 max-w-md text-sm text-muted-foreground">
                {totalEarned} out of {totalMax} Gunas match — {percentage >= 60 ? "this pairing is generally considered favorable for marriage." : "we recommend a full consultation before proceeding."}
              </p>
            </div>

            <h3 className="mt-8 font-semibold">Guna Milan Breakdown</h3>
            <div className="mt-3 overflow-x-auto rounded-xl border">
              <table className="w-full min-w-[500px] text-left text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr><th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Max</th><th className="px-4 py-2.5">Earned</th><th className="px-4 py-2.5">Status</th></tr>
                </thead>
                <tbody>
                  {gunMilanCategories.map((c) => (
                    <tr key={c.category} className="border-t">
                      <td className="px-4 py-2.5">{c.category}</td>
                      <td className="px-4 py-2.5">{c.max}</td>
                      <td className="px-4 py-2.5">{c.earned}</td>
                      <td className="px-4 py-2.5">{c.earned === c.max ? "✅" : c.earned === 0 ? "❌" : "⚠️"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {nadiDosha && (
              <div className="mt-6 rounded-xl border border-[var(--color-error)]/40 bg-[var(--color-error)]/5 p-5">
                <p className="flex items-center gap-2 font-semibold text-[var(--color-error)]">
                  <AlertTriangle className="size-4" /> Nadi Dosha Detected
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Both partners share the same Nadi, which traditionally warrants a closer look. This can often be cancelled by other chart factors — a full consultation is recommended before drawing conclusions.
                </p>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="gap-2" render={<Link href="/talk-to-astrologer" />}>Consult a Guru for Remedies</Button>
              <Button variant="gold" render={<Link href="/premium-kundli/order" />}>Get Detailed Compatibility Report</Button>
            </div>
          </div>
        </SectionContainer>
      )}
    </>
  );
}
