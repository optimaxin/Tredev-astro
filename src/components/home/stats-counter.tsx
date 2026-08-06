import { Phone, Users, Award, Globe, Calendar } from "lucide-react";
import { AnimatedCounter } from "@/components/ui/animated-counter";
import { stats } from "@/lib/mock-data";

const icons = { phone: Phone, users: Users, award: Award, globe: Globe, calendar: Calendar };

export function StatsCounter() {
  return (
    <section className="ink-bg relative overflow-hidden py-12 text-white">
      <div className="relative mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:grid-cols-3 sm:px-6 lg:grid-cols-5 lg:px-8">
        {stats.map((s) => {
          const Icon = icons[s.icon as keyof typeof icons];
          return (
            <div key={s.label} className="text-center">
              <Icon className="mx-auto size-7 text-[var(--color-marigold)]" />
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
