import { cn } from "@/lib/utils";

export function BrassSeal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-gold)] bg-gradient-to-br from-[var(--color-gold)]/15 to-transparent text-[var(--color-gold)]",
        className
      )}
    >
      <div className="absolute inset-1 rounded-full border border-dashed border-[var(--color-gold)]/40" />
      {children}
    </div>
  );
}
