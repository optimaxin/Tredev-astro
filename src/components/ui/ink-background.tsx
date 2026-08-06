import { SmokeCanvas } from "@/components/ui/smoke-canvas";

export function InkBackground({ className = "", animated = false }: { className?: string; animated?: boolean }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0 ink-bg" />
      <div className="absolute inset-0 starfield" />
      {animated ? (
        <SmokeCanvas className="opacity-90" />
      ) : (
        <>
          <div className="absolute -bottom-24 -left-20 size-96 rounded-full bg-[var(--color-violet)]/20 blur-3xl" />
          <div className="absolute -bottom-16 right-0 size-80 rounded-full bg-[var(--color-sindoor)]/15 blur-3xl" />
          <div className="absolute -top-20 right-1/4 size-64 rounded-full bg-[var(--color-marigold)]/10 blur-3xl" />
        </>
      )}
    </div>
  );
}
