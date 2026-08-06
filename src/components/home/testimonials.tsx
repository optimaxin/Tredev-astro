import { Star } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Section, SectionHeading } from "@/components/ui/section";
import { testimonials } from "@/lib/mock-data";

export function Testimonials() {
  return (
    <Section>
      <SectionHeading heading="Real Stories, Real Transformations" subheading="See how our astrologers changed lives" />
      <div className="grid gap-5 sm:grid-cols-3">
        {testimonials.map((t) => (
          <div key={t.name} className="rounded-xl border bg-card p-6">
            <div className="flex text-[var(--color-marigold)]">
              {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="size-4 fill-current" />)}
            </div>
            <p className="mt-3 text-sm italic text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar><AvatarFallback>{t.name.charAt(0)}</AvatarFallback></Avatar>
              <div>
                <p className="text-sm font-semibold">{t.name}, {t.city}</p>
                <p className="text-xs text-muted-foreground">{t.consultationType}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
