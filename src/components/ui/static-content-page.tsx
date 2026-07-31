import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer } from "@/components/ui/section-container";

export function StaticContentPage({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle?: string;
  sections: { heading: string; body: string[] }[];
}) {
  return (
    <>
      <PageHero title={title} subtitle={subtitle} breadcrumb={[{ label: "Home", href: "/" }, { label: title }]} />
      <SectionContainer className="max-w-3xl">
        <div className="space-y-8">
          {sections.map((s) => (
            <div key={s.heading}>
              <h2 className="text-xl font-semibold">{s.heading}</h2>
              <div className="mt-2 space-y-2 text-sm text-muted-foreground">
                {s.body.map((p, i) => <p key={i}>{p}</p>)}
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
