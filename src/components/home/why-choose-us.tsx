import { ShieldCheck, Clock, MessageCircle, Lock, RefreshCw, Zap } from "lucide-react";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { whyChooseUs } from "@/lib/mock-data";

const icons = {
  "shield-check": ShieldCheck,
  clock: Clock,
  "message-circle": MessageCircle,
  lock: Lock,
  "refresh-cw": RefreshCw,
  zap: Zap,
};

export function WhyChooseUs() {
  return (
    <SectionContainer>
      <SectionHeading heading="Why CosmicConnect is India's #1 Choice" />
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {whyChooseUs.map((f) => {
          const Icon = icons[f.icon as keyof typeof icons];
          return (
            <div key={f.title} className="flex gap-4 rounded-xl border bg-card p-5">
              <Icon className="size-8 shrink-0 text-[var(--color-cta)]" />
              <div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </SectionContainer>
  );
}
