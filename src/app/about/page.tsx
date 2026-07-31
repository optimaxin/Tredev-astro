import { PageHero } from "@/components/ui/page-hero";
import { SectionContainer, SectionHeading } from "@/components/ui/section-container";
import { OmMark } from "@/components/ui/om-mark";
import { companyValues, teamMembers, stats } from "@/lib/mock-data";

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="Our Story"
        title="Ancient Wisdom, Built for the Modern Seeker"
        subtitle="AstroTredev exists to make authentic Vedic guidance accessible, verified, and genuinely useful — without losing what makes it sacred."
        breadcrumb={[{ label: "Home", href: "/" }, { label: "About" }]}
      />

      <SectionContainer className="max-w-3xl">
        <OmMark className="text-4xl" />
        <h2 className="mt-4 text-2xl font-bold">Vasudhaiva Kutumbakam — The World is One Family</h2>
        <p className="mt-3 text-muted-foreground">
          We started AstroTredev because we saw two broken extremes: astrology platforms that treated
          Jyotish as a call-center product, and traditional practitioners who were nearly impossible to
          reach outside their own city. Our founders — one technologist, one Vedic scholar — set out to
          build something in between: technology in service of tradition, not a replacement for it.
        </p>
        <p className="mt-3 text-muted-foreground">
          Every Guru on our platform is verified for lineage and training before they take their first
          consultation. Every birth detail is encrypted. And every prediction is delivered by a real
          person, not a generated script.
        </p>
      </SectionContainer>

      <SectionContainer className="border-t">
        <SectionHeading heading="Our Values" />
        <div className="grid gap-5 sm:grid-cols-2">
          {companyValues.map((v) => (
            <div key={v.title} className="rounded-xl border p-5">
              <h3 className="font-semibold">{v.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{v.description}</p>
            </div>
          ))}
        </div>
      </SectionContainer>

      <section className="cosmic-bg py-16 text-white">
        <SectionContainer className="py-0">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-5">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-heading text-2xl font-bold sm:text-3xl">{s.value.toLocaleString("en-IN")}{s.suffix}</p>
                <p className="mt-1 text-sm text-white/70">{s.label}</p>
              </div>
            ))}
          </div>
        </SectionContainer>
      </section>

      <SectionContainer>
        <SectionHeading heading="Meet the Team" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {teamMembers.map((m) => (
            <div key={m.name} className="rounded-xl border p-5 text-center">
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-[var(--color-cosmic)] text-lg font-semibold text-white">
                {m.initials}
              </div>
              <p className="mt-3 font-semibold">{m.name}</p>
              <p className="text-sm text-muted-foreground">{m.role}</p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </>
  );
}
