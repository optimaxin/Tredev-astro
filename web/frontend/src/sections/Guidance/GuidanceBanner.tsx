import React, { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './GuidanceBanner.module.css';

export default function GuidanceBanner() {
  const { setPage, t } = useAppContext();
  const [reducedMotion, setReducedMotion] = useState(false);
  // Same safety net as Hero.tsx's homepage video, for the same reason: a
  // saveData/slow-connection visitor shouldn't pay for this either, and the
  // Network Information API check alone isn't enough (Chromium-only) — the
  // canplaythrough timeout below is what actually protects Firefox/Safari.
  const [useVideo, setUseVideo] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  useEffect(() => {
    const conn = (navigator as any).connection;
    if (conn && (conn.saveData || /^(slow-2g|2g|3g)$/.test(conn.effectiveType))) {
      setUseVideo(false);
    }
  }, []);

  useEffect(() => {
    if (reducedMotion || !useVideo) return;
    const el = videoRef.current;
    if (!el) return;
    const timer = window.setTimeout(() => setUseVideo(false), 4000);
    const markReady = () => clearTimeout(timer);
    el.addEventListener('canplaythrough', markReady, { once: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener('canplaythrough', markReady);
    };
  }, [reducedMotion, useVideo]);

  return (
    <section className={styles.section}>
      <div className={styles.splitGrid}>
        
        {/* Left Side: Clean Editorial Content */}
        <div className={styles.leftSide}>
          {/* Faint Rashi Chakra behind the text */}
          <CelestialOrnament type="rashi" className={styles.leftOrnament} />
          
          <div className={styles.contentArea}>
            <span className={styles.eyebrow}>{t('guidance_eyebrow')}</span>
            <h2 className={styles.headline}>
              {t('guidance_headline')}<br />
              <span className={styles.goldText}>{t('guidance_headline_italic')}</span>
            </h2>
            <p className={styles.description}>
              {t('guidance_desc')}
            </p>
            <div className={styles.actions}>
              <button 
                className={styles.btnGoldBanner}
                onClick={() => { setPage('free-kundli'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {t('guidance_cta_kundli')}
              </button>
              <button 
                className={styles.btnWhiteBanner}
                onClick={() => { setPage('astrologers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              >
                {t('guidance_cta_consult')}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Large Cinematic Visual */}
        <div className={styles.rightSide}>
          <div className={styles.canvasContainer}>
            {reducedMotion || !useVideo ? (
              <img
                src="/sea-storm.jpg"
                alt="Celestial atmosphere"
                className={styles.backdropVideo}
              />
            ) : (
              <video
                ref={videoRef}
                src="/sea-storm.mp4"
                className={styles.backdropVideo}
                autoPlay
                loop
                muted
                playsInline
                preload="none"
              />
            )}
            {/* Clean cinematic atmospheric background video */}
          </div>
        </div>

      </div>
    </section>
  );
}
