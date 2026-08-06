import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { InkBackground } from "@/components/ui/ink-background";

export function PageHero({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  breadcrumb?: { label: string; href?: string }[];
}) {
  return (
    <section className="relative overflow-hidden py-14 text-white sm:py-20">
      <InkBackground />
      <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
        {breadcrumb && (
          <nav className="mb-4 flex items-center justify-center gap-1.5 text-xs text-white/60">
            {breadcrumb.map((b, i) => (
              <span key={b.label} className="flex items-center gap-1.5">
                {i > 0 && <ChevronRight className="size-3" />}
                {b.href ? <Link href={b.href} className="hover:text-white">{b.label}</Link> : <span className="text-white/90">{b.label}</span>}
              </span>
            ))}
          </nav>
        )}
        {eyebrow && <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-marigold)]">{eyebrow}</span>}
        <h1 className="mt-2 font-heading text-4xl font-semibold sm:text-5xl">{title}</h1>
        {subtitle && <p className="mx-auto mt-3 max-w-2xl text-white/75">{subtitle}</p>}
      </div>
    </section>
  );
}
