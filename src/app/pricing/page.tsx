import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { pricingTiers, faqs } from "@/lib/mock-data";

export default function PricingPage() {
  return (
    <>
      <PageHero
        title="Simple, Transparent Pricing"
        subtitle="Pay only for what you use, or subscribe for priority access and ongoing guidance."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "Pricing" }]}
      />

      <SectionContainer>
        <div className="grid gap-6 lg:grid-cols-3">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-2xl border p-6 sm:p-8 ${tier.popular ? "border-[var(--color-gold)] ring-2 ring-[var(--color-gold)]/30" : ""}`}
            >
              {tier.popular && (
                <span className="rounded-full bg-[var(--color-gold)] px-3 py-1 text-xs font-semibold text-[#2b0b0e]">Most Popular</span>
              )}
              <h2 className="mt-3 text-xl font-bold">{tier.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
              <p className="mt-5">
                {tier.price === null ? (
                  <span className="text-3xl font-bold">Custom</span>
                ) : (
                  <>
                    <span className="text-3xl font-bold">₹{tier.price}</span>
                    <span className="text-sm text-muted-foreground"> {tier.period}</span>
                  </>
                )}
              </p>
              <ul className="mt-6 space-y-2.5 text-sm">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--color-success)]" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                size="lg"
                variant={tier.popular ? "gold" : "outline"}
                className="mt-6 w-full"
                render={<Link href={tier.name === "Enterprise" ? "/contact" : "/talk-to-astrologer"} />}
              >
                {tier.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-16 max-w-3xl">
          <h2 className="mb-5 text-2xl font-bold">Pricing Questions</h2>
          <div className="space-y-4">
            {faqs.slice(0, 3).map((f) => (
              <div key={f.question} className="rounded-xl border p-5">
                <p className="font-semibold">{f.question}</p>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionContainer>
    </>
  );
}
