import { createPortal } from 'react-dom';
import styles from './PdfLoader.module.css';

const RING_R = 88;
const RING_C = 2 * Math.PI * RING_R;

// Full-screen "your Kundli is being written" overlay shown while the PDF
// generates. Portalled to <body> so a transformed ancestor (framer-motion)
// can't break position:fixed — and so the PDF capture never clones it.
export default function PdfLoader({ message, progress }: { message: string; progress: number | null }) {
  const pct = progress == null ? null : Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return createPortal(
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.stage}>
        <svg className={styles.zodiac} viewBox="0 0 220 220" aria-hidden="true">
          <circle cx="110" cy="110" r="104" className={styles.zodiacRing} />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} x1="110" y1="4" x2="110" y2="14" className={styles.tick} transform={`rotate(${i * 30} 110 110)`} />
          ))}
        </svg>
        <svg className={styles.progress} viewBox="0 0 200 200" aria-hidden="true">
          <circle cx="100" cy="100" r={RING_R} className={styles.track} />
          <circle
            cx="100" cy="100" r={RING_R}
            className={pct == null ? `${styles.bar} ${styles.indeterminate}` : styles.bar}
            strokeDasharray={RING_C}
            strokeDashoffset={pct == null ? RING_C * 0.75 : RING_C * (1 - pct / 100)}
          />
        </svg>
        <div className={styles.orbit} aria-hidden="true"><span className={styles.planet} /></div>
        <div className={styles.glow} aria-hidden="true" />
        <img src="/logo.png" alt="" className={styles.logo} />
      </div>
      <p className={styles.title}>Preparing your Kundli</p>
      <p className={styles.message}>{message}</p>
      {pct != null && <p className={styles.pct}>{pct}%</p>}
    </div>,
    document.body,
  );
}
