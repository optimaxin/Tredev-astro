"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateNumerology, NUMEROLOGY_MEANINGS, type NumerologyResult } from "@/lib/numerology";

const LABELS: { key: keyof NumerologyResult; title: string; subtitle: string }[] = [
  { key: "lifePath", title: "Life Path", subtitle: "Your core life journey" },
  { key: "destiny", title: "Destiny", subtitle: "What you're here to achieve" },
  { key: "soulUrge", title: "Soul Urge", subtitle: "Your inner motivation" },
  { key: "personality", title: "Personality", subtitle: "How others perceive you" },
];

export function NumerologyForm() {
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [result, setResult] = useState<NumerologyResult | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(calculateNumerology(name, dob));
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <div>
          <Label htmlFor="num-name" className="mb-1.5">Full Name (as on birth certificate)</Label>
          <Input id="num-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" />
        </div>
        <div>
          <Label htmlFor="num-dob" className="mb-1.5">Date of Birth</Label>
          <Input id="num-dob" type="date" required value={dob} onChange={(e) => setDob(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="gap-2 sm:col-span-2">
          <Sparkles className="size-4" /> Calculate My Numbers
        </Button>
      </form>

      {result && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {LABELS.map(({ key, title, subtitle }) => (
            <div key={key} className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--color-marigold)]/15 font-heading text-2xl text-[var(--color-marigold)]">
                  {result[key]}
                </span>
                <div>
                  <p className="font-semibold">{title} Number</p>
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{NUMEROLOGY_MEANINGS[result[key]]}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
