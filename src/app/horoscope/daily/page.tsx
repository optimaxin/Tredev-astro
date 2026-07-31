"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { zodiacSigns, horoscopeSections } from "@/lib/mock-data";

const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

export default function DailyHoroscopePage() {
  const [selected, setSelected] = useState(zodiacSigns[4]);

  return (
    <>
      <PageHero
        eyebrow="Divine Tools"
        title="Daily Horoscope"
        subtitle={today}
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Daily Horoscope" }]}
      />

      <SectionContainer>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {zodiacSigns.map((z) => (
            <button
              key={z.sign}
              onClick={() => setSelected(z)}
              className={`rounded-xl border p-4 text-center transition-colors ${
                selected.sign === z.sign ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10" : "hover:border-[var(--color-gold)]/50"
              }`}
            >
              <span className="text-2xl">{z.symbol}</span>
              <p className="mt-1 text-sm font-medium">{z.sign}</p>
              <p className="text-[0.65rem] text-muted-foreground">{z.dates}</p>
            </button>
          ))}
        </div>

        <div className="mt-10 rounded-2xl border p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{selected.symbol}</span>
            <div>
              <h2 className="text-2xl font-bold">{selected.sign} Daily Horoscope</h2>
              <p className="text-sm text-muted-foreground">{today}</p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {horoscopeSections.map((s) => (
              <div key={s.title} className="border-t pt-5 first:border-t-0 first:pt-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{s.title}</h3>
                  <div className="flex text-[var(--color-gold)]">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`size-3.5 ${i < s.stars ? "fill-current" : "text-muted-foreground/30"}`} />
                    ))}
                  </div>
                </div>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 rounded-xl border bg-muted/30 p-5 sm:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Lucky Color</p><p className="mt-0.5 text-sm font-semibold">Red</p></div>
            <div><p className="text-xs text-muted-foreground">Lucky Number</p><p className="mt-0.5 text-sm font-semibold">7</p></div>
            <div><p className="text-xs text-muted-foreground">Lucky Stone</p><p className="mt-0.5 text-sm font-semibold">Ruby</p></div>
            <div><p className="text-xs text-muted-foreground">Auspicious Time</p><p className="mt-0.5 text-sm font-semibold">10–11:30 AM</p></div>
          </div>
        </div>
      </SectionContainer>
    </>
  );
}
