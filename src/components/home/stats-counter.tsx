import { Phone, Users, Award, Globe, Calendar } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { CosmicBackground } from "@/components/ui/cosmic-background";
import { RangoliPattern } from "@/components/ui/rangoli-pattern";
import { stats } from "@/lib/mock-data";

const icons = { phone: Phone, users: Users, award: Award, globe: Globe, calendar: Calendar };

export function StatsCounter() {
  return (
    <section className="relative overflow-hidden py-16 text-white">
      <CosmicBackground />
      <RangoliPattern className="pointer-events-none absolute -right-16 -top-16 size-72 text-[var(--color-gold)]/10 sm:size-96" />
      <RangoliPattern className="pointer-events-none absolute -bottom-20 -left-16 size-72 text-[var(--color-gold)]/10 sm:size-96" />
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
        {stats.map((s) => {
          const Icon = icons[s.icon as keyof typeof icons];
          return (
            <div key={s.label} className="text-center">
              <Icon className="mx-auto size-8 text-[var(--color-gold)]" />
              <p className="mt-2 text-2xl font-bold sm:text-3xl">
                <AnimatedCounter value={s.value} suffix={s.suffix} />
              </p>
              <p className="mt-1 text-sm text-white/70">{s.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
