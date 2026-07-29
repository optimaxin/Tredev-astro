import { UserSearch, PhoneCall, Sparkles } from "lucide-react";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";

const steps = [
  {
    number: "01",
    icon: UserSearch,
    title: "Choose Your Guide",
    description:
      "Browse 5000+ verified astrologers. Filter by language, expertise, rating & budget.",
    color: "text-[var(--color-cta)]",
  },
  {
    number: "02",
    icon: PhoneCall,
    title: "Connect Instantly",
    description:
      "First 3 minutes FREE. Talk via voice, video, or chat. Share your birth details.",
    color: "text-purple-500",
  },
  {
    number: "03",
    icon: Sparkles,
    title: "Get Solutions",
    description:
      "Receive personalized remedies, gemstone suggestions & actionable guidance.",
    color: "text-[var(--color-gold)]",
  },
];

export function HowItWorks() {
  return (
    <SectionContainer>
      <SectionHeading
        heading="Your Journey to Clarity in 3 Simple Steps"
        subheading="Getting answers has never been easier"
      />
      <div className="grid gap-8 sm:grid-cols-3">
        {steps.map((step) => (
          <div key={step.number} className="relative rounded-xl border bg-card p-6 text-center">
            <span className="text-5xl font-bold text-muted-foreground/20">{step.number}</span>
            <step.icon className={`mx-auto -mt-8 size-10 ${step.color}`} />
            <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </SectionContainer>
  );
}
