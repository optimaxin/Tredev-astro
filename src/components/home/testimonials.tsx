import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { testimonials } from "@/lib/mock-data";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex text-[var(--color-gold)]">
      {Array.from({ length: rating }).map((_, i) => (
        <Star key={i} className="size-4 fill-current" />
      ))}
    </div>
  );
}

export function Testimonials() {
  const [featured, ...rest] = testimonials;

  return (
    <SectionContainer>
      <SectionHeading heading="Real Stories, Real Transformations" subheading="See how our astrologers changed lives" />
      <div className="grid gap-5 lg:grid-cols-5">
        <div className="rounded-xl border border-[var(--color-gold)]/40 bg-card p-8 lg:col-span-3">
          <span className="font-heading text-5xl leading-none text-[var(--color-gold)]/40">&ldquo;</span>
          <Stars rating={featured.rating} />
          <p className="mt-3 text-lg italic text-foreground">{featured.quote}</p>
          <div className="mt-5 flex items-center gap-3">
            <Avatar className="size-11 border border-[var(--color-gold)]/50">
              <AvatarFallback>{featured.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-semibold">{featured.name}, {featured.city}</p>
              <p className="text-xs text-muted-foreground">{featured.consultationType}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-2">
          {rest.map((t) => (
            <div key={t.name} className="flex-1 rounded-xl border p-5">
              <Stars rating={t.rating} />
              <p className="mt-2 text-sm italic text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-3 flex items-center gap-2.5">
                <Avatar className="size-8">
                  <AvatarFallback className="text-xs">{t.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold">{t.name}, {t.city}</p>
                  <p className="text-[0.65rem] text-muted-foreground">{t.consultationType}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
}
