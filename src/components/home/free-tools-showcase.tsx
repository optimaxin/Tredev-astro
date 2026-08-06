import Link from "next/link";
import { BarChart3, Heart, Sun, Moon, Calculator, Layers, CalendarDays, AlertTriangle, Wrench } from "lucide-react";
import { Section, SectionHeading } from "@/components/ui/section";
import { freeTools } from "@/lib/mock-data";

const icons = { chart: BarChart3, heart: Heart, sun: Sun, moon: Moon, calculator: Calculator, cards: Layers, calendar: CalendarDays, alert: AlertTriangle };

export function FreeToolsShowcase() {
  return (
    <Section>
      <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-full bg-[var(--color-sindoor)]/10 text-[var(--color-sindoor)]">
        <Wrench className="size-5" />
      </div>
      <SectionHeading eyebrow="Divine Tools" heading="Free Astrology Tools" subheading="Explore our suite of powerful, accurate, and completely free tools" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {freeTools.map((tool) => {
          const Icon = icons[tool.icon as keyof typeof icons];
          return (
            <Link key={tool.name} href={tool.href} className="group rounded-xl border bg-card p-5 transition-all hover:-translate-y-1 hover:border-[var(--color-marigold)]">
              <Icon className="size-7 text-[var(--color-sindoor)]" />
              <h3 className="mt-3 font-semibold">{tool.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
            </Link>
          );
        })}
      </div>
    </Section>
  );
}
