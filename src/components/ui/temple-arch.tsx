import { cn } from "@/lib/utils";

export function TempleArch({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden border-2 border-[var(--color-brass)]/40",
        className
      )}
      style={{
        borderRadius: "50% 50% 4% 4% / 34% 34% 4% 4%",
      }}
    >
      {children}
    </div>
  );
}
