import React, { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './Hero.module.css';

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches
  );
  const { t } = useAppContext();

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handleChange = () => setIsMobile(mq.matches);
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, []);

  const scrollToKundli = () => {
    document.querySelector('#kundli')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToAstrologers = () => {
    document.querySelector('#astrologers')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={heroRef} className={styles.hero} id="hero" aria-label="Hero">
      {/* Background: video loop on desktop, a static poster on mobile — no
          point paying video decode/bandwidth cost on a phone screen where the
          motion barely reads anyway. */}
      {isMobile ? (
        <img
          src="/hero-mobile-poster.jpg"
          alt=""
          className={styles.bgVideo}
        />
      ) : (
        <video
          src="/Hero3.mp4"
          className={styles.bgVideo}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Atmospheric dark vignette overlay */}
      <div className={styles.overlay} />

      {/* Celestial atmosphere — desktop only. On mobile the video crop makes
          this collide visually with the poster's own art, so it's hidden via
          CSS below rather than kept as clutter. */}
      <CelestialBackdrop variant="orbit" intensity="high" className={styles.heroBackdrop} />

      {/* Main Content Layout */}
      <div className={styles.content}>
        {/* Left Column: Hero Text & CTAs */}
        <motion.div
          className={styles.leftColumn}
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Eyebrow Category */}
          <motion.span
            className={styles.eyebrow}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
          >
            ✦ JYOTISH · DHARMA · GRAHAS · NAKSHATRAS
          </motion.span>

          {/* Main Headline */}
          <motion.h1
            className={styles.headline}
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {t('hero_headline')}<br />
            <em className={styles.goldItalic}>{t('hero_headline_italic')}</em>
          </motion.h1>

          {/* Hindi Tagline */}
          <motion.div
            className={styles.tagline}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
          >
            {t('hero_hindi_eyebrow')}
          </motion.div>

          {/* Subheadline Description */}
          <motion.p
            className={styles.subhead}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.8 }}
          >
            {t('hero_subhead')}
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            className={styles.ctas}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95, duration: 0.8 }}
          >
            <button
              className={styles.btnPrimary}
              onClick={scrollToKundli}
              id="hero-create-kundli"
            >
              {t('hero_cta_kundli')}
            </button>
            <button
              className={styles.btnSecondary}
              onClick={scrollToAstrologers}
              id="hero-talk-astrologer"
            >
              {t('hero_cta_consult')}
            </button>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            className={styles.trustLine}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.9 }}
          >
            <span className={styles.greenDot} />
            <span className={styles.trustItem}>{t('hero_trust_acharyas')}</span>
            <span className={styles.trustSep}>·</span>
            <span className={styles.trustItem}>{t('hero_trust_jyotish')}</span>
            <span className={styles.trustSep}>·</span>
            <span className={styles.trustItem}>{t('hero_trust_secure')}</span>
          </motion.div>
        </motion.div>
      </div>

      {/* Translucent Glass Wave Layer at Hero Bottom */}
      <div className={styles.bottomWaveContainer}>
        <svg
          className={styles.waveSvg}
          viewBox="0 0 1440 240"
          preserveAspectRatio="none"
        >
          {/* Back Wave */}
          <path
            d="M0,130 C320,190 640,70 1000,150 C1200,190 1360,110 1440,130 L1440,240 L0,240 Z"
            fill="rgba(58, 23, 8, 0.15)"
            stroke="rgba(231, 165, 26, 0.15)"
            strokeWidth="1.2"
          />
          {/* Middle Wave */}
          <path
            d="M0,160 C240,110 520,200 860,120 C1140,60 1320,170 1440,150 L1440,240 L0,240 Z"
            fill="rgba(74, 30, 9, 0.22)"
            stroke="rgba(245, 183, 42, 0.25)"
            strokeWidth="1.2"
          />
          {/* Foreground Wave */}
          <path
            d="M0,190 C360,140 720,210 1080,160 C1280,130 1380,185 1440,180 L1440,240 L0,240 Z"
            fill="#120704"
            stroke="rgba(231, 165, 26, 0.35)"
            strokeWidth="1.5"
          />
        </svg>

        {/* Scroll Indicator */}
        <motion.div
          className={styles.scrollIndicator}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <div className={styles.scrollLine} />
          <div className={styles.scrollMouse}>
            <div className={styles.scrollDot} />
          </div>
          <span className={styles.scrollText}>SCROLL TO EXPLORE</span>
          <span className={styles.scrollChevron}>⌄</span>
        </motion.div>
      </div>
    </section>
  );
}
