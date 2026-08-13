import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import HeroCanvas from './HeroCanvas';
import CornerFlames from './CornerFlames';
import { useAppContext } from '../../context/AppContext';
import styles from './Hero.module.css';

function getNarrativePrompt(progress: number): string {
  if (progress < 0.05) return 'ENTER TREDEVASTRO';
  if (progress < 0.18) return 'DISCOVER YOUR SKY';
  if (progress < 0.35) return 'UNDERSTAND YOUR CHART';
  if (progress < 0.52) return 'ASK';
  if (progress < 0.68) return 'CONNECT';
  if (progress < 0.82) return 'GO DEEPER';
  if (progress < 0.95) return 'EXPLORE';
  return 'YOUR JOURNEY CONTINUES';
}

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<{ name: string; type: 'graha' | 'rashi'; details: string } | null>(null);
  const { theme, t } = useAppContext();
  const isLightTheme = theme === 'light';

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
      {/* 3D Canvas with Scroll Progress and Hover States */}
      <div className={styles.canvasWrap}>
        <HeroCanvas 
          className={styles.canvas} 
          scrollProgress={scrollProgress} 
          onHoverItem={setHoveredItem}
          isLightTheme={isLightTheme}
        />
        {/* Procedural diya corner flames */}
        <CornerFlames />
      </div>

      {/* Gradient overlay */}
      <div className={styles.overlay} />
      <div className={styles.overlayBottom} />

      {/* Content */}
      <div className={styles.content}>
        <motion.div
          className={styles.contentInner}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* Eyebrow */}
          <motion.span
            className={styles.eyebrow}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
          >
            ✦ Jyotish · Dharma · Grahas · Nakshatras
          </motion.span>

          {/* Main Headline */}
          <motion.h1
            className={styles.headline}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            {t('hero_headline')}<br />
            <em className={styles.headlineItalic}>{t('hero_headline_italic')}</em>
          </motion.h1>

          <span className={styles.hindiEyebrow}>{t('hero_hindi_eyebrow')}</span>

          {/* Subheadline */}
          <motion.p
            className={styles.subhead}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            {t('hero_subhead')}
          </motion.p>

          {/* CTAs */}
          <motion.div
            className={styles.ctas}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.8 }}
          >
            <button
              className={`${styles.ctaPrimary} btn btn-gold btn-lg`}
              onClick={scrollToKundli}
              id="hero-create-kundli"
            >
              {t('hero_cta_kundli')}
            </button>
            <button
              className={`${styles.ctaSecondary} btn btn-outline-light btn-lg`}
              onClick={scrollToAstrologers}
              id="hero-talk-astrologer"
            >
              {t('hero_cta_consult')}
            </button>
          </motion.div>

          {/* Trust Line */}
          <motion.div
            className={styles.trustLine}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
          >
            <TrustDot />
            {t('hero_trust_acharyas')}
            <span className={styles.trustSep}>·</span>
            {t('hero_trust_jyotish')}
            <span className={styles.trustSep}>·</span>
            {t('hero_trust_secure')}
          </motion.div>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          className={styles.scrollIndicator}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2, duration: 1 }}
        >
          <div className={styles.scrollLine} />
          <span className={styles.scrollText}>{t('hero_scroll_text')}</span>
        </motion.div>
      </div>

      {/* Floating Interactive Tooltip Box for Rashi Chakra hover */}
      <AnimatePresence>
        {hoveredItem && scrollProgress < 0.12 && (
          <motion.div
            className={styles.tooltipBox}
            initial={{ opacity: 0, x: -20, y: -20 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.3 }}
          >
            <span className={styles.tooltipType}>
              {hoveredItem.type === 'graha' ? 'Graha · planetary deity' : 'Rashi · zodiac sign'}
            </span>
            <h3 className={styles.tooltipName}>{hoveredItem.name}</h3>
            <p className={styles.tooltipDetails}>{hoveredItem.details}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Cinematic Narrative HUD */}
      <div 
        className={styles.hudContainer}
        style={{
          opacity: scrollProgress > 0.01 ? 1 : 0,
        }}
      >
        <div className={styles.hudCircle}>
          <svg width="40" height="40" viewBox="0 0 40 40" className={styles.hudSvg}>
            <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(184, 138, 59, 0.15)" strokeWidth="1" />
            <circle 
              cx="20" 
              cy="20" 
              r="18" 
              fill="none" 
              stroke="var(--color-gold)" 
              strokeWidth="1.5"
              strokeDasharray={2 * Math.PI * 18}
              strokeDashoffset={2 * Math.PI * 18 * (1 - scrollProgress)}
              style={{ transition: 'stroke-dashoffset 0.1s ease-out' }}
            />
          </svg>
          <span className={styles.hudPointer}>✦</span>
        </div>
        <div className={styles.hudTextWrapper}>
          <span className={styles.hudLabel}>Celestial Phase</span>
          <span className={styles.hudValue}>{getNarrativePrompt(scrollProgress)}</span>
        </div>
      </div>
    </section>
  );
}

function TrustDot() {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        background: '#50C878',
        marginRight: 6,
        flexShrink: 0,
      }}
    />
  );
}

