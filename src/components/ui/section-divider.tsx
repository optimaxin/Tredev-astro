export function SectionDivider() {
  return (
    <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-10 sm:px-6 lg:px-8" aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[var(--color-brass)]/60 to-[var(--color-brass)]/60" />
      <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 text-[var(--color-brass)]">
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse
            key={i}
            cx="14"
            cy="8"
            rx="3"
            ry="6"
            fill="currentColor"
            fillOpacity="0.85"
            transform={`rotate(${i * 45} 14 14)`}
          />
        ))}
        <circle cx="14" cy="14" r="2" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[var(--color-brass)]/60 to-[var(--color-brass)]/60" />
    </div>
  );
}
