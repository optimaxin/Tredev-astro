import { Section, SectionHeading } from "@/components/ui/section";

const steps = [
  {
    numeral: "I",
    glyph: "☾",
    color: "var(--color-sindoor)",
    title: "Seeking",
    description: "Browse 5000+ verified astrologers. Filter by language, expertise, rating and budget until one feels right.",
  },
  {
    numeral: "II",
    glyph: "☉",
    color: "var(--color-violet)",
    title: "Connecting",
    description: "First 3 minutes free. Talk by voice, video, or chat, and share your birth details in your own words.",
  },
  {
    numeral: "III",
    glyph: "✦",
    color: "var(--color-marigold)",
    title: "Revelation",
    description: "Walk away with personalized remedies, gemstone guidance, and a clear next step — not vague generalities.",
  },
];

export function HowItWorks() {
  return (
    <Section className="border-t">
      <SectionHeading
        eyebrow="The Consultation"
        heading="Three steps from question to clarity"
        subheading="Connecting with your astrologer takes minutes, not days."
      />
      <div className="mx-auto flex max-w-lg flex-col items-center gap-14">
        {steps.map((step) => (
          <div key={step.numeral} className="flex flex-col items-center text-center">
            <span
              className="flex size-16 items-center justify-center rounded-full border text-lg font-medium"
              style={{ borderColor: `color-mix(in srgb, ${step.color} 50%, transparent)`, color: step.color }}
            >
              {step.numeral}
            </span>
            <span className="mt-4 text-2xl" style={{ color: step.color }} aria-hidden>{step.glyph}</span>
            <h3 className="mt-3 font-heading text-2xl">{step.title}</h3>
            <p className="mt-2 max-w-xs text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}
