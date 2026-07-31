import { ScrollText, Cpu, HeartHandshake, Globe2 } from "lucide-react";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { fourPillars } from "@/lib/mock-data";

const icons = {
  "scroll-text": ScrollText,
  cpu: Cpu,
  "heart-handshake": HeartHandshake,
  "globe-2": Globe2,
};

export function FourPillars() {
  return (
    <SectionContainer>
      <SectionHeading
        eyebrow="Our Foundation"
        heading="The Four Pillars of AstroTredev"
        subheading="Ancient discipline, modern delivery — neither one without the other."
      />
      <div className="grid gap-5 sm:grid-cols-2">
        {fourPillars.map((pillar) => {
          const Icon = icons[pillar.icon as keyof typeof icons];
          return (
            <div
              key={pillar.title}
              className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-gold)]"
            >
              <div
                className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${pillar.gradient}`}
                aria-hidden
              />
              <div className={`flex size-11 items-center justify-center rounded-lg bg-gradient-to-br ${pillar.gradient} text-white`}>
                <Icon className="size-5" />
              </div>
              <h3 className="mt-3 text-lg font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{pillar.description}</p>
            </div>
          );
        })}
      </div>
    </SectionContainer>
  );
}
