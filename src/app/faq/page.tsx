import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";
import { faqs } from "@/lib/mock-data";

export default function FaqPage() {
  return (
    <>
      <PageHero title="Frequently Asked Questions" breadcrumb={[{ label: "Home", href: "/" }, { label: "FAQ" }]} />
      <SectionContainer className="max-w-3xl">
        <div className="space-y-4">
          {faqs.map((f) => (
            <div key={f.question} className="rounded-xl border p-5">
              <p className="font-semibold">{f.question}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.answer}</p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
