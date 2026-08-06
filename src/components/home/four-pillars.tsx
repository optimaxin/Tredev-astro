import { Section, SectionHeading } from "@/components/ui/section";
import { Reveal } from "@/components/ui/reveal";

const chartBars = [22, 34, 28, 45, 38, 52, 47, 60, 55, 68, 63, 78];

const slots = [
  { time: "9:00", state: "booked" },
  { time: "9:15", state: "open" },
  { time: "9:30", state: "open" },
  { time: "9:45", state: "booked" },
  { time: "10:00", state: "open" },
  { time: "10:15", state: "booked" },
];

const payouts = [
  { id: "CNS-4821", amount: "₹2,340.00" },
  { id: "CNS-4820", amount: "₹1,890.50" },
  { id: "CNS-4822", amount: "₹5,511.50" },
];

const screenings = [
  { name: "Acharya Rakesh", state: "PASS" },
  { name: "Pandit Meera S.", state: "PASS" },
  { name: "New Applicant #92", state: "REVIEW" },
];

export function FourPillars() {
  return (
    <Section className="border-t">
      <SectionHeading eyebrow="The Platform" heading="Built for consultation, not bolted on" subheading="Every tool an astrologer or seeker needs ships with AstroTredev — no third-party plugins required." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <FeatureCard eyebrow="Consultation" title="Live Voice, Video & Chat" color="var(--color-sindoor)" description="Connect instantly across three channels. First 3 minutes free on every session.">
          <div className="flex items-center justify-between rounded-lg bg-foreground/[0.04] border border-foreground/5 px-4 py-3 font-mono text-xs">
            <span className="flex items-center gap-2 text-[var(--color-success)]"><span className="size-1.5 animate-breathing rounded-full bg-[var(--color-success)]" /> LIVE</span>
            <span className="text-muted-foreground">04:32</span>
            <span className="flex gap-0.5">
              {[3, 6, 4, 8, 5, 7, 3].map((h, i) => <span key={i} className="w-0.5 rounded-full bg-[var(--color-sindoor)]" style={{ height: `${h * 2}px` }} />)}
            </span>
          </div>
        </FeatureCard>

        <FeatureCard eyebrow="Intelligence" title="Kundli Engine" color="var(--color-violet)" description="Planetary strength, dashas & yogas computed the moment a birth chart is generated.">
          <div className="flex h-16 items-end gap-1 rounded-lg bg-foreground/[0.04] border border-foreground/5 px-3 py-2">
            {chartBars.map((h, i) => (
              <span key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: `linear-gradient(to top, var(--color-violet), var(--color-sindoor))` }} />
            ))}
          </div>
        </FeatureCard>

        <FeatureCard eyebrow="Scheduling" title="Live Availability & Booking" color="var(--color-marigold)" description="Seekers book real open slots. Astrologers control their calendar down to the minute.">
          <div className="grid grid-cols-3 gap-1.5 font-mono text-[0.65rem]">
            {slots.map((s) => (
              <span key={s.time} className={`rounded-md px-2 py-1.5 text-center ${s.state === "open" ? "bg-[var(--color-marigold)]/15 text-[var(--color-marigold)]" : "bg-foreground/5 text-muted-foreground line-through"}`}>
                {s.time}
              </span>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard eyebrow="Payments" title="Astrologer Payouts" color="var(--color-sindoor)" description="Direct, transparent payouts after every session. No hidden commission tiers.">
          <div className="space-y-1.5 font-mono text-xs">
            {payouts.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-md bg-foreground/[0.04] border border-foreground/5 px-3 py-1.5">
                <span className="text-muted-foreground">{p.id}</span>
                <span className="text-[var(--color-success)]">{p.amount}</span>
              </div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard eyebrow="Quality" title="Verified Profile Screening" color="var(--color-violet)" description="Every astrologer is background-checked and credential-verified before going live.">
          <div className="space-y-1.5 font-mono text-[0.65rem]">
            {screenings.map((s) => (
              <div key={s.name} className="flex items-center justify-between rounded-md bg-foreground/[0.04] border border-foreground/5 px-3 py-1.5">
                <span className="truncate text-muted-foreground">{s.name}</span>
                <span className={s.state === "PASS" ? "text-[var(--color-success)]" : "text-[var(--color-marigold)]"}>{s.state}</span>
              </div>
            ))}
          </div>
        </FeatureCard>

        <FeatureCard eyebrow="Protection" title="Session Guarantee" color="var(--color-marigold)" description="Not satisfied with a reading? Automated resolution protects every rupee spent.">
          <div className="flex items-center justify-around rounded-lg bg-foreground/[0.04] border border-foreground/5 py-3 text-center font-mono">
            <div>
              <p className="text-lg font-semibold text-[var(--color-success)]">98%</p>
              <p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">Satisfaction</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-[var(--color-marigold)]">24h</p>
              <p className="text-[0.6rem] uppercase tracking-wide text-muted-foreground">Refund Window</p>
            </div>
          </div>
        </FeatureCard>
      </div>
    </Section>
  );
}

function FeatureCard({
  eyebrow,
  title,
  description,
  color,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal className="flex flex-col gap-4 rounded-xl border bg-card p-6 transition-colors hover:border-foreground/20">
      <div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color }}>{eyebrow}</span>
        <h3 className="mt-1.5 font-heading text-xl">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </Reveal>
  );
}
