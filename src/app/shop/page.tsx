"use client";

import { useMemo, useState } from "react";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { ProductCard } from "@/components/ui/product-card";
import { products, productCategories } from "@/lib/mock-data";

export default function ShopPage() {
  const [category, setCategory] = useState("All");

  const filtered = useMemo(
    () => (category === "All" ? products : products.filter((p) => p.category === category)),
    [category]
  );

  return (
    <>
      <PageHero
        eyebrow="Sacred Store"
        title="Gemstones, Rudraksha & Yantras"
        subtitle="Certified, energized products chosen to match your chart — not just your zodiac sign."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Shop" }]}
      />
      <SectionContainer>
        <div className="mb-6 flex flex-wrap gap-2">
          {productCategories.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                category === c ? "border-[var(--color-cta)] bg-[var(--color-cta)] text-white" : "hover:border-[var(--color-gold)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <p className="mb-5 text-sm text-muted-foreground">Showing {filtered.length} products</p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </SectionContainer>
    </>
  );
}
