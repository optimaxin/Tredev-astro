export function CosmicBackground({ className = "" }: { className?: string }) {
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      <div className="absolute inset-0 cosmic-bg" />
      <div className="absolute inset-0 starfield" />
      <div className="absolute -top-32 -left-32 size-96 rounded-full bg-[var(--color-cta)]/20 blur-3xl" />
      <div className="absolute top-1/3 -right-24 size-80 rounded-full bg-[var(--color-gold)]/10 blur-3xl" />
    </div>
  );
}
