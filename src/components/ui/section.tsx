import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";

export function Section({
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
  align = "center",
  className,
}: {
  eyebrow?: string;
  heading: string;
  subheading?: string;
  align?: "center" | "left";
  className?: string;
}) {
  return (
    <Reveal
      className={cn(
        "mx-auto mb-12 max-w-2xl",
        align === "center" ? "text-center" : "text-left ml-0",
        className
      )}
    >
      {eyebrow && (
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-sindoor)]">
          {eyebrow}
        </span>
      )}
      <h2 className="mt-2 text-3xl font-bold sm:text-4xl">{heading}</h2>
      {subheading && <p className="mt-3 text-muted-foreground">{subheading}</p>}
    </Reveal>
  );
}
