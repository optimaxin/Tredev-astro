import { cn } from "@/lib/utils";

export function OmMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("font-devanagari leading-none text-[var(--color-gold)]", className)}
    >
      ॐ
    </span>
  );
}
