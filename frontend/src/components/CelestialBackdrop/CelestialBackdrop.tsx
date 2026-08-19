import React, { useEffect, useRef } from 'react';
import CelestialOrnament, { type OrnamentType } from '../CelestialOrnament/CelestialOrnament';
import styles from './CelestialBackdrop.module.css';

type Intensity = 'high' | 'medium' | 'low' | 'subtle';

interface CelestialBackdropProps {
  /** Which CelestialOrnament linework to feature as the primary motif. */
  variant?: OrnamentType;
  intensity?: Intensity;
  /** Very subtle cursor-driven drift. Disabled automatically under prefers-reduced-motion. */
  parallax?: boolean;
  className?: string;
}

const STAR_POSITIONS = [
  { top: '12%', left: '8%', size: 2, delay: 0 },
  { top: '22%', left: '85%', size: 1.5, delay: 1.2 },
  { top: '68%', left: '92%', size: 2, delay: 2.4 },
  { top: '78%', left: '6%', size: 1.5, delay: 0.6 },
  { top: '40%', left: '48%', size: 1, delay: 3 },
  { top: '55%', left: '20%', size: 1.5, delay: 1.8 },
];

export default function CelestialBackdrop({
  variant = 'orbit',
  intensity = 'medium',
  parallax = false,
  className = '',
}: CelestialBackdropProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!parallax) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    const handleMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = wrapRef.current;
        if (!el) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 10;
        const y = (e.clientY / window.innerHeight - 0.5) * 10;
        el.style.setProperty('--parallax-x', `${x}px`);
        el.style.setProperty('--parallax-y', `${y}px`);
      });
    };

    window.addEventListener('mousemove', handleMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMove);
      cancelAnimationFrame(raf);
    };
  }, [parallax]);

  return (
    <div
      ref={wrapRef}
      className={`${styles.backdrop} ${styles[intensity]} ${className}`}
      aria-hidden="true"
    >
      <div className={styles.glow} />
      <CelestialOrnament type={variant} className={styles.primaryOrnament} animate />
      <CelestialOrnament type="nakshatra" className={styles.secondaryOrnament} />
      <div className={styles.stars}>
        {STAR_POSITIONS.map((s, i) => (
          <span
            key={i}
            className={styles.star}
            style={{
              top: s.top,
              left: s.left,
              width: s.size,
              height: s.size,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
