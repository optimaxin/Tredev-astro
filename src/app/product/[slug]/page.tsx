import Link from "next/link";
import { notFound } from "next/navigation";
import { Star, BadgeCheck, ShoppingCart, Zap, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionContainer } from "@/components/ui/section-container";
import { ProductCard } from "@/components/ui/product-card";
import { products } from "@/lib/mock-data";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = products.find((p) => p.slug === slug);
  if (!product) notFound();

  const related = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <SectionContainer>
      <nav className="mb-6 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link> {" / "}
        <Link href="/shop" className="hover:text-foreground">Shop</Link> {" / "}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div
          className="flex aspect-square items-center justify-center rounded-2xl text-8xl"
          style={{ background: `linear-gradient(160deg, ${product.color}33, transparent)` }}
        >
          <span style={{ color: product.color }}>◆</span>
        </div>

        <div>
          <div className="flex items-center gap-1.5">
            {product.energized && <span className="rounded-full bg-[var(--color-gold)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-gold)]">Energized</span>}
            {product.certified && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--color-success)]/15 px-2.5 py-1 text-xs font-medium text-[var(--color-success)]">
                <BadgeCheck className="size-3.5" /> Certified
              </span>
            )}
          </div>
          <h1 className="mt-3 text-3xl font-bold">{product.name}</h1>
          <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Star className="size-4 fill-[var(--color-gold)] text-[var(--color-gold)]" /> {product.rating} ({product.reviews} verified reviews)
          </div>
          <div className="mt-4 flex items-center gap-3">
            <span className="text-3xl font-bold text-[var(--color-gold)]">₹{product.price.toLocaleString("en-IN")}</span>
            <span className="text-muted-foreground line-through">₹{product.originalPrice.toLocaleString("en-IN")}</span>
            <span className="rounded-full bg-[var(--color-error)]/15 px-2 py-0.5 text-sm font-semibold text-[var(--color-error)]">{discount}% OFF</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>

          <div className="mt-6 flex gap-3">
            <Button size="lg" className="flex-1 gap-2"><ShoppingCart className="size-4" /> Add to Cart</Button>
            <Button size="lg" variant="gold" className="flex-1 gap-2"><Zap className="size-4" /> Buy Now</Button>
            <Button size="icon" variant="outline" aria-label="Wishlist"><Heart className="size-4" /></Button>
          </div>

          <ul className="mt-6 space-y-1.5 text-sm text-muted-foreground">
            <li>✅ 100% Natural &amp; Certified</li>
            <li>✅ Free Shipping across India</li>
            <li>✅ 7-Day Easy Return</li>
            <li>✅ Lifetime Authenticity Guarantee</li>
          </ul>
        </div>
      </div>

      <div className="mt-14">
        <Tabs defaultValue="description">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="wear">How to Wear</TabsTrigger>
            <TabsTrigger value="shipping">Shipping &amp; Returns</TabsTrigger>
          </TabsList>
          <TabsContent value="description" className="mt-6 max-w-2xl space-y-3 text-sm text-muted-foreground">
            <p>{product.description}</p>
            <div>
              <h3 className="font-semibold text-foreground">Benefits</h3>
              <ul className="mt-2 space-y-1">{product.benefits.map((b) => <li key={b}>• {b}</li>)}</ul>
            </div>
          </TabsContent>
          <TabsContent value="wear" className="mt-6 max-w-2xl space-y-3 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">Procedure: </span>{product.howToWear}</p>
            <p><span className="font-semibold text-foreground">Mantra: </span><span className="font-devanagari">{product.mantra}</span></p>
          </TabsContent>
          <TabsContent value="shipping" className="mt-6 max-w-2xl text-sm text-muted-foreground">
            Free shipping across India, delivered in 5–7 business days. 7-day easy return if the product arrives in its original, unused condition.
          </TabsContent>
        </Tabs>
      </div>

      {related.length > 0 && (
        <div className="mt-14 border-t pt-10">
          <h2 className="mb-5 text-2xl font-bold">Related Products</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </div>
      )}
    </SectionContainer>
  );
}
