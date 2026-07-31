import { cn } from "@/lib/utils";

export function SectionContainer({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn("mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8", className)}>
      {children}
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  heading,
  subheading,
  className,
}: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto mb-12 max-w-2xl text-center", className)}>
      {eyebrow && (
        <span className="text-sm font-semibold uppercase tracking-wide text-[var(--color-cta)]">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{heading}</h2>
      {subheading && <p className="mt-3 text-muted-foreground">{subheading}</p>}
    </div>
  );
}
