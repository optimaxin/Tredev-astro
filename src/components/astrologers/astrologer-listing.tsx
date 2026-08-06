"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { AstrologerCard } from "@/components/ui/astrologer-card";
import { Button } from "@/components/ui/button";
import { navLanguages, navSpecializations, type Astrologer } from "@/lib/mock-data";

const tiers = ["Maharishi", "Acharya", "Pandit", "Vidyarthi"] as const;

export function AstrologerListing() {
  const [astrologers, setAstrologers] = useState<Astrologer[]>([]);
  const [loading, setLoading] = useState(true);
  const [language, setLanguage] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState<string | null>(null);
  const [tier, setTier] = useState<string | null>(null);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sort, setSort] = useState<"recommended" | "rating" | "price-low" | "price-high">("recommended");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetching the astrologer roster once on mount
    setLoading(true);
    fetch("/api/astrologers")
      .then((res) => res.json())
      .then((data) => setAstrologers(data.astrologers ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = astrologers.filter((a) => {
      if (language && !a.languages.includes(language)) return false;
      if (specialty && !a.specialties.includes(specialty)) return false;
      if (tier && a.tier !== tier) return false;
      if (onlineOnly && !a.online) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price-low") return a.price - b.price;
      if (sort === "price-high") return b.price - a.price;
      return b.reviews - a.reviews;
    });
    return list;
  }, [astrologers, language, specialty, tier, onlineOnly, sort]);

  function clearAll() {
    setLanguage(null);
    setSpecialty(null);
    setTier(null);
    setOnlineOnly(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Filters</h2>
          <button onClick={clearAll} className="text-xs text-[var(--color-sindoor)] hover:underline">Clear all</button>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} className="size-4 accent-[var(--color-sindoor)]" />
          Available now
        </label>

        <div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">Language</p>
          <div className="flex flex-wrap gap-1.5">
            {navLanguages.slice(0, 8).map((l) => (
              <button key={l} onClick={() => setLanguage(language === l ? null : l)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${language === l ? "border-[var(--color-sindoor)] bg-[var(--color-sindoor)] text-white" : "hover:border-[var(--color-marigold)]"}`}>
                {l}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">Specialization</p>
          <div className="flex flex-wrap gap-1.5">
            {navSpecializations.slice(0, 8).map((s) => (
              <button key={s} onClick={() => setSpecialty(specialty === s ? null : s)} className={`rounded-full border px-3 py-1 text-xs transition-colors ${specialty === s ? "border-[var(--color-sindoor)] bg-[var(--color-sindoor)] text-white" : "hover:border-[var(--color-marigold)]"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-muted-foreground">Guru Tier</p>
          <div className="space-y-1.5">
            {tiers.map((t) => (
              <label key={t} className="flex items-center gap-2 text-sm">
                <input type="radio" name="tier" checked={tier === t} onChange={() => setTier(tier === t ? null : t)} className="size-4 accent-[var(--color-sindoor)]" />
                {t}
              </label>
            ))}
          </div>
        </div>
      </aside>

      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">Showing {filtered.length} astrologers</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border bg-background px-2.5 py-1.5 text-sm">
              <option value="recommended">Recommended</option>
              <option value="rating">Rating: High to Low</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" /> Loading astrologers...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border p-10 text-center text-muted-foreground">
            <p>No astrologers match these filters.</p>
            <Button variant="outline" className="mt-4" onClick={clearAll}>Clear filters</Button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((a) => <AstrologerCard key={a.id} astrologer={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
