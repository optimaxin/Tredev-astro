"use client";

import { useState } from "react";
import { Heart, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PersonState = { name: string; dob: string; timeOfBirth: string; place: string };
type Koota = { name: string; points: number; maxPoints: number; note: string };
type MatchResult = {
  boy: { name: string; moonSign: string; nakshatra: string };
  girl: { name: string; moonSign: string; nakshatra: string };
  result: { koota: Koota[]; totalPoints: number; maxPoints: number; verdict: string; nadiDosha: boolean; bhakootDosha: boolean };
};

const empty: PersonState = { name: "", dob: "", timeOfBirth: "", place: "" };

function PersonFields({ label, value, onChange }: { label: string; value: PersonState; onChange: (v: PersonState) => void }) {
  return (
    <div className="space-y-3 rounded-xl border bg-card p-5">
      <h3 className="font-heading text-lg">{label}</h3>
      <div>
        <Label className="mb-1.5">Name</Label>
        <Input required value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Full name" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="mb-1.5">Date of Birth</Label>
          <Input type="date" required value={value.dob} onChange={(e) => onChange({ ...value, dob: e.target.value })} />
        </div>
        <div>
          <Label className="mb-1.5">Time of Birth</Label>
          <Input type="time" required value={value.timeOfBirth} onChange={(e) => onChange({ ...value, timeOfBirth: e.target.value })} />
        </div>
      </div>
      <div>
        <Label className="mb-1.5">Place of Birth</Label>
        <Input required value={value.place} onChange={(e) => onChange({ ...value, place: e.target.value })} placeholder="e.g. Mumbai, India" />
      </div>
    </div>
  );
}

export function MatchForm() {
  const [boy, setBoy] = useState<PersonState>(empty);
  const [girl, setGirl] = useState<PersonState>(empty);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boy, girl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not calculate compatibility");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid gap-5 sm:grid-cols-2">
        <PersonFields label="Partner 1" value={boy} onChange={setBoy} />
        <PersonFields label="Partner 2" value={girl} onChange={setGirl} />
        <Button type="submit" size="lg" disabled={loading} className="gap-2 sm:col-span-2">
          {loading ? <Loader2 className="size-4 animate-spin" /> : <Heart className="size-4" />}
          {loading ? "Calculating Guna Milan..." : "Check Compatibility"}
        </Button>
      </form>

      {error && <p className="mt-4 text-center text-sm text-destructive">{error}</p>}

      {result && (
        <div className="mt-10 space-y-6">
          <div className="rounded-2xl border bg-card p-8 text-center">
            <Sparkles className="mx-auto size-6 text-[var(--color-marigold)]" />
            <p className="mt-3 font-heading text-4xl font-semibold text-[var(--color-marigold)]">
              {result.result.totalPoints} <span className="text-xl text-muted-foreground">/ {result.result.maxPoints}</span>
            </p>
            <p className="mt-1 text-lg font-medium">{result.result.verdict}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {result.boy.name || "Partner 1"} ({result.boy.moonSign}, {result.boy.nakshatra}) &amp; {result.girl.name || "Partner 2"} ({result.girl.moonSign}, {result.girl.nakshatra})
            </p>
            {(result.result.nadiDosha || result.result.bhakootDosha) && (
              <p className="mt-3 text-sm text-[var(--color-error)]">
                {result.result.nadiDosha && "Nadi Dosha present. "}
                {result.result.bhakootDosha && "Bhakoot Dosha present."}
              </p>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Koota</th>
                  <th className="px-4 py-2.5 font-semibold">Meaning</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Points</th>
                </tr>
              </thead>
              <tbody>
                {result.result.koota.map((k) => (
                  <tr key={k.name} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{k.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{k.note}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{k.points} / {k.maxPoints}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
