import Link from "next/link";
import { Star, BadgeCheck } from "lucide-react";
import type { Product } from "@/lib/mock-data";

export function ProductCard({ product }: { product: Product }) {
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <Link href={`/product/${product.slug}`} className="group rounded-xl border p-4 transition-colors hover:border-[var(--color-gold)]">
      <div
        className="flex aspect-square items-center justify-center rounded-lg text-4xl"
        style={{ background: `linear-gradient(160deg, ${product.color}33, transparent)` }}
      >
        <span style={{ color: product.color }}>◆</span>
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {product.energized && (
          <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[0.65rem] font-medium text-[var(--color-gold)]">Energized</span>
        )}
        {product.certified && (
          <span className="flex items-center gap-0.5 rounded-full bg-[var(--color-success)]/15 px-2 py-0.5 text-[0.65rem] font-medium text-[var(--color-success)]">
            <BadgeCheck className="size-3" /> Certified
          </span>
        )}
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-snug group-hover:text-[var(--color-gold)]">{product.name}</h3>
      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="size-3 fill-[var(--color-gold)] text-[var(--color-gold)]" /> {product.rating} ({product.reviews})
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-lg font-bold text-[var(--color-gold)]">₹{product.price.toLocaleString("en-IN")}</span>
        <span className="text-xs text-muted-foreground line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span>
        <span className="text-xs font-medium text-[var(--color-success)]">{discount}% off</span>
      </div>
    </Link>
  );
}
