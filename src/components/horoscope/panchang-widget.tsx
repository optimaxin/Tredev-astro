"use client";

import { useEffect, useState } from "react";
import { Loader2, MapPin, Search, Sunrise, Sunset } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PanchangResponse = {
  city: string;
  timeZone: string;
  panchang: {
    tithi: { index: number; name: string; paksha: string };
    nakshatra: { index: number; name: string; pada: number };
    yoga: { index: number; name: string };
    karan: { index: number; name: string };
    sunrise: string | null;
    sunset: string | null;
    rahuKaal: { start: string; end: string } | null;
    abhijitMuhurat: { start: string; end: string } | null;
  };
};

function formatTime(iso: string | null, timeZone: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone });
}

export function PanchangWidget() {
  const [city, setCity] = useState("New Delhi, India");
  const [inputCity, setInputCity] = useState(city);
  const [data, setData] = useState<PanchangResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- kicking off a fresh fetch whenever `city` changes, mirrors the mount-flag pattern used elsewhere in this codebase
    setLoading(true);
    setError(null);
    fetch(`/api/panchang?city=${encodeURIComponent(city)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? "Could not load Panchang");
        if (!cancelled) setData(body);
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : "Something went wrong"))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [city]);

  const p = data?.panchang;

  return (
    <div className="rounded-2xl border bg-card p-6 sm:p-8">
      <form
        onSubmit={(e) => { e.preventDefault(); setCity(inputCity); }}
        className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-sindoor)]">Today&rsquo;s Panchang</p>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {data?.city ?? city}
          </p>
        </div>
        <div className="flex gap-2">
          <Input value={inputCity} onChange={(e) => setInputCity(e.target.value)} placeholder="Change city..." className="w-48" />
          <Button type="submit" size="icon" variant="outline" aria-label="Search city"><Search className="size-4" /></Button>
        </div>
      </form>

      {loading && (
        <div className="mt-8 flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" /> Calculating today&rsquo;s Panchang...
        </div>
      )}

      {error && <p className="mt-6 text-center text-sm text-destructive">{error}</p>}

      {data && p && !loading && (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Tithi", `${p.tithi.name} (${p.tithi.paksha})`],
              ["Nakshatra", `${p.nakshatra.name} · Pada ${p.nakshatra.pada}`],
              ["Yoga", p.yoga.name],
              ["Karan", p.karan.name],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border bg-background p-4 text-center">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="mt-1 font-heading text-lg">{value}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 rounded-xl border bg-background p-4">
              <Sunrise className="size-5 text-[var(--color-marigold)]" />
              <div><p className="text-xs text-muted-foreground">Sunrise</p><p className="font-medium">{formatTime(p.sunrise, data.timeZone)}</p></div>
            </div>
            <div className="flex items-center gap-2 rounded-xl border bg-background p-4">
              <Sunset className="size-5 text-[var(--color-violet)]" />
              <div><p className="text-xs text-muted-foreground">Sunset</p><p className="font-medium">{formatTime(p.sunset, data.timeZone)}</p></div>
            </div>
            <div className="rounded-xl border border-[var(--color-error)]/30 bg-[var(--color-error)]/5 p-4">
              <p className="text-xs text-muted-foreground">Rahu Kaal (avoid)</p>
              <p className="font-medium text-[var(--color-error)]">{formatTime(p.rahuKaal?.start ?? null, data.timeZone)} – {formatTime(p.rahuKaal?.end ?? null, data.timeZone)}</p>
            </div>
            <div className="rounded-xl border border-[var(--color-success)]/30 bg-[var(--color-success)]/5 p-4">
              <p className="text-xs text-muted-foreground">Abhijit Muhurat</p>
              <p className="font-medium text-[var(--color-success)]">{formatTime(p.abhijitMuhurat?.start ?? null, data.timeZone)} – {formatTime(p.abhijitMuhurat?.end ?? null, data.timeZone)}</p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
