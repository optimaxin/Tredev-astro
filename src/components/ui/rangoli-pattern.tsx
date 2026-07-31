export function RangoliPattern({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
    >
      <circle cx="100" cy="100" r="90" strokeWidth="0.5" strokeDasharray="1 5" />
      <circle cx="100" cy="100" r="70" strokeWidth="0.5" />
      <circle cx="100" cy="100" r="6" strokeWidth="1" />
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = (100 + 30 * Math.cos(angle)).toFixed(2);
        const y1 = (100 + 30 * Math.sin(angle)).toFixed(2);
        const x2 = (100 + 70 * Math.cos(angle)).toFixed(2);
        const y2 = (100 + 70 * Math.sin(angle)).toFixed(2);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="0.5" />;
      })}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const cx = (100 + 50 * Math.cos(angle)).toFixed(2);
        const cy = (100 + 50 * Math.sin(angle)).toFixed(2);
        return <circle key={i} cx={cx} cy={cy} r="9" strokeWidth="0.75" />;
      })}
    </svg>
  );
}
