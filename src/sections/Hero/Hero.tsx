import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import styles from './Hero.module.css';

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const { t } = useAppContext();

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) return;
      const progress = Math.min(Math.max(window.scrollY / totalHeight, 0), 1);
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToKundli = () => {
    document.querySelector('#kundli')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const scrollToAstrologers = () => {
    document.querySelector('#astrologers')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section ref={heroRef} className={styles.hero} id="hero" aria-label="Hero">
      {/* Background pre-rendered Video Loop */}
      <video
        src="/Hero.mp4"
        className={styles.bgVideo}
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Atmospheric dark vignette overlay */}
      <div className={styles.overlay} />

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
            Your Stars. Your<br />
            Dharma.<br />
            <em className={styles.goldItalic}>Your Journey.</em>
          </motion.h1>

          {/* Hindi Tagline */}
          <motion.div
            className={styles.tagline}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
          >
            "Apne Aakash Ko Samjhiye"
          </motion.div>

          {/* Subheadline Description */}
          <motion.p
            className={styles.subhead}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.8 }}
          >
            Personalized Vedic astrology, expert guidance, intelligent insights and timeless Jyotish wisdom.
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
              Generate Free Kundli
            </button>
            <button
              className={styles.btnSecondary}
              onClick={scrollToAstrologers}
              id="hero-talk-astrologer"
            >
              Consult an Acharya
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
            Verified Acharyas <span className={styles.trustSep}>·</span> Personalized Jyotish <span className={styles.trustSep}>·</span> Private &amp; Secure
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
