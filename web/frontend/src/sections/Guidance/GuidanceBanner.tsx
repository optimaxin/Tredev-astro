import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './GuidanceBanner.module.css';

export default function GuidanceBanner() {
  const { setPage, t } = useAppContext();
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Detect prefers-reduced-motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

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
            {reducedMotion ? (
              <img
                src="/sea-storm.jpg"
                alt="Celestial atmosphere"
                className={styles.backdropVideo}
              />
            ) : (
              <video
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
