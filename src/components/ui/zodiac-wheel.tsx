const signs = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export function ZodiacWheel({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} aria-hidden fill="none">
      <circle cx="200" cy="200" r="192" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="200" cy="200" r="160" stroke="currentColor" strokeWidth="1" strokeDasharray="2 6" opacity="0.6" />
      <circle cx="200" cy="200" r="128" stroke="currentColor" strokeWidth="1" opacity="0.4" />

      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = (200 + 128 * Math.cos(angle)).toFixed(2);
        const y1 = (200 + 128 * Math.sin(angle)).toFixed(2);
        const x2 = (200 + 192 * Math.cos(angle)).toFixed(2);
        const y2 = (200 + 192 * Math.sin(angle)).toFixed(2);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="0.75" opacity="0.35" />;
      })}

      {signs.map((sign, i) => {
        const angle = (i * 30 - 90) * (Math.PI / 180);
        const x = (200 + 176 * Math.cos(angle)).toFixed(2);
        const y = (200 + 176 * Math.sin(angle)).toFixed(2);
        return (
          <text key={sign} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fill="currentColor" fontSize="14" opacity="0.75">
            {sign}
          </text>
        );
      })}

      <circle cx="200" cy="200" r="4" fill="currentColor" opacity="0.6" />
    </svg>
  );
}
