import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import styles from './CampaignBanner.module.css';

const SLIDES = [
  {
    id: 0,
    category: 'VEDIC JYOTISH',
    title: 'Discover the Map\nWritten at Your Birth.',
    description: 'Explore your Rashis, Grahas and Nakshatras through an authentic Vedic Kundli — free, instantly.',
    cta: 'Generate Free Kundli',
    ctaAction: 'free-kundli',
    accentColor: '#C7A15A',
    bgColor: 'linear-gradient(135deg, #080C1C 0%, #0C1830 40%, #17253A 100%)',
    artColor: '#B58A3B',
    symbol: '☉',
    symbolLabel: 'Surya',
    decorSvg: 'kundli',
  },
  {
    id: 1,
    category: 'ACHARYA CONSULTATION',
    title: 'Speak to an Acharya\nWho Understands.',
    description: 'Connect with verified Vedic astrologers for personalized guidance on your life\'s most important questions.',
    cta: 'Consult an Acharya',
    ctaAction: 'astrologers',
    accentColor: '#A85B2D',
    bgColor: 'linear-gradient(135deg, #17101F 0%, #24131A 40%, #1C0F22 100%)',
    artColor: '#A85B2D',
    symbol: '☽',
    symbolLabel: 'Chandra',
    decorSvg: 'acharya',
  },
  {
    id: 2,
    category: 'JYOTISH REPORTS',
    title: 'Go Deeper into\nYour Planetary Patterns.',
    description: 'Detailed Jyotish analysis across career, marriage, health and destiny by classical Vedic methods.',
    cta: 'Explore Reports',
    ctaAction: 'reports',
    accentColor: '#9A5428',
    bgColor: 'linear-gradient(135deg, #0C1230 0%, #111A34 40%, #0A1628 100%)',
    artColor: '#9A5428',
    symbol: '♃',
    symbolLabel: 'Guru',
    decorSvg: 'report',
  },
  {
    id: 3,
    category: 'TREDEVSTORE',
    title: 'Sacred Objects Chosen\nfor Your Journey.',
    description: 'Authentic gemstones, Rudraksha, Yantras and sacred objects — energized for your Kundli.',
    cta: 'Explore TredevStore',
    ctaAction: 'store',
    accentColor: '#C7A15A',
    bgColor: 'linear-gradient(135deg, #1A1008 0%, #241810 40%, #1A1508 100%)',
    artColor: '#C7A15A',
    symbol: '◉',
    symbolLabel: 'Yantra',
    decorSvg: 'store',
  },
  {
    id: 4,
    category: 'TREDEVASTRO GURUKUL',
    title: 'Learn the Language\nof Jyotish.',
    description: 'Study Vedic astrology from foundation to mastery through structured courses taught by expert Acharyas.',
    cta: 'Explore Gurukul',
    ctaAction: 'academy',
    accentColor: '#B58A3B',
    bgColor: 'linear-gradient(135deg, #0A1020 0%, #101828 40%, #0C1420 100%)',
    artColor: '#B58A3B',
    symbol: '✦',
    symbolLabel: 'Nakshatra',
    decorSvg: 'academy',
  },
];

function SlideArtwork({ slide, isActive }: { slide: typeof SLIDES[0]; isActive: boolean }) {
  const size = isActive ? 320 : 220;
  return (
    <div className={styles.artwork} style={{ '--art-color': slide.artColor } as React.CSSProperties}>
      {/* Outer glow ring */}
      <div className={styles.artGlow} style={{ background: `radial-gradient(circle, ${slide.artColor}22 0%, transparent 70%)` }} />
      
      {/* Main SVG artwork */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 320 320"
        className={`${styles.artSvg} ${isActive ? styles.artSvgActive : ''}`}
      >
        {/* Outer decorative ring */}
        <circle cx="160" cy="160" r="148" fill="none" stroke={`${slide.artColor}30`} strokeWidth="1"/>
        <circle cx="160" cy="160" r="130" fill="none" stroke={`${slide.artColor}25`} strokeWidth="0.75"/>
        
        {/* 12-spoke Rashi wheel */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x1 = 160 + Math.cos(angle) * 80;
          const y1 = 160 + Math.sin(angle) * 80;
          const x2 = 160 + Math.cos(angle) * 130;
          const y2 = 160 + Math.sin(angle) * 130;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${slide.artColor}20`} strokeWidth="0.75"/>;
        })}
        
        {/* Inner concentric circles */}
        <circle cx="160" cy="160" r="80" fill="none" stroke={`${slide.artColor}35`} strokeWidth="1"/>
        <circle cx="160" cy="160" r="50" fill="none" stroke={`${slide.artColor}40`} strokeWidth="0.75"/>
        <circle cx="160" cy="160" r="24" fill="none" stroke={`${slide.artColor}50`} strokeWidth="1"/>
        
        {/* Orbital dots — Navagrahas */}
        {[
          { r: 100, angle: 0.5, size: 4 },
          { r: 110, angle: 1.8, size: 3 },
          { r: 90, angle: 3.2, size: 5 },
          { r: 115, angle: 4.5, size: 3.5 },
          { r: 95, angle: 5.8, size: 4 },
        ].map((orb, i) => (
          <circle
            key={i}
            cx={160 + Math.cos(orb.angle) * orb.r}
            cy={160 + Math.sin(orb.angle) * orb.r}
            r={orb.size}
            fill={slide.artColor}
            opacity="0.65"
          />
        ))}
        
        {/* Center symbol */}
        <text
          x="160"
          y="168"
          textAnchor="middle"
          fontSize="32"
          fill={slide.artColor}
          opacity="0.85"
          fontFamily="Georgia, serif"
        >
          {slide.symbol}
        </text>
        
        {/* Symbol label */}
        <text
          x="160"
          y="192"
          textAnchor="middle"
          fontSize="10"
          fill={slide.artColor}
          opacity="0.45"
          fontFamily="DM Sans, sans-serif"
          letterSpacing="3"
        >
          {slide.symbolLabel.toUpperCase()}
        </text>
        
        {/* 12 rashi segment tick marks */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x1 = 160 + Math.cos(angle) * 128;
          const y1 = 160 + Math.sin(angle) * 128;
          const x2 = 160 + Math.cos(angle) * 148;
          const y2 = 160 + Math.sin(angle) * 148;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${slide.artColor}60`} strokeWidth="2"/>;
        })}
      </svg>
    </div>
  );
}

export default function CampaignBanner() {
  const { setPage } = useAppContext();
  const [current, setCurrent] = useState(0);
  const [edgeHover, setEdgeHover] = useState<'left' | 'right' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const autoRef = useRef<number | null>(null);

  const total = SLIDES.length;

  const prev = useCallback(() => {
    setCurrent(c => (c - 1 + total) % total);
  }, [total]);

  const next = useCallback(() => {
    setCurrent(c => (c + 1) % total);
  }, [total]);

  // Auto-advance every 6 seconds, pauses on hover
  useEffect(() => {
    if (isHovered) return;
    autoRef.current = window.setInterval(next, 6000);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [isHovered, next]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const w = rect.width;
    if (x < w * 0.15) setEdgeHover('left');
    else if (x > w * 0.85) setEdgeHover('right');
    else setEdgeHover(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (edgeHover === 'left') prev();
    else if (edgeHover === 'right') next();
  };

  const slide = SLIDES[current];
  const prevSlide = SLIDES[(current - 1 + total) % total];
  const nextSlide = SLIDES[(current + 1) % total];

  return (
    <section className={styles.section} id="campaign-banner" aria-label="Featured campaigns">
      <div
        className={styles.carousel}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setEdgeHover(null); setIsHovered(false); }}
        onMouseEnter={() => setIsHovered(true)}
        onClick={handleClick}
      >
        {/* Left peek slide */}
        <motion.div
          className={`${styles.peekCard} ${styles.peekLeft}`}
          animate={{ opacity: 0.4, scale: 0.88, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ background: prevSlide.bgColor }}
          aria-hidden="true"
        >
          <div className={styles.peekContent}>
            <SlideArtwork slide={prevSlide} isActive={false} />
          </div>
        </motion.div>

        {/* Main active slide */}
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className={styles.mainCard}
            initial={{ opacity: 0, scale: 0.96, x: 40 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.96, x: -40 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ background: slide.bgColor }}
          >
            {/* Subtle atmospheric overlay */}
            <div className={styles.slideAtmosphere} />

            {/* Left: Text Content */}
            <div className={styles.slideContent}>
              <motion.span
                className={styles.slideCategory}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                style={{ color: slide.accentColor }}
              >
                {slide.category}
              </motion.span>

              <motion.h2
                className={styles.slideTitle}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {slide.title.split('\n').map((line, i) => (
                  <React.Fragment key={i}>{line}{i === 0 && <br />}</React.Fragment>
                ))}
              </motion.h2>

              <motion.p
                className={styles.slideDesc}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 }}
              >
                {slide.description}
              </motion.p>

              <motion.button
                className={styles.slideCta}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.36 }}
                onClick={e => {
                  e.stopPropagation();
                  setPage(slide.ctaAction);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                style={{ background: slide.accentColor }}
              >
                {slide.cta}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </motion.button>

              {/* Slide counter */}
              <div className={styles.slideCounter}>
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    className={`${styles.counterDot} ${i === current ? styles.counterDotActive : ''}`}
                    onClick={e => { e.stopPropagation(); setCurrent(i); }}
                    aria-label={`Go to slide ${i + 1}`}
                    style={{ background: i === current ? slide.accentColor : undefined }}
                  />
                ))}
              </div>
            </div>

            {/* Right: Artwork */}
            <div className={styles.slideArtwork}>
              <SlideArtwork slide={slide} isActive={true} />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right peek slide */}
        <motion.div
          className={`${styles.peekCard} ${styles.peekRight}`}
          animate={{ opacity: 0.4, scale: 0.88, x: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ background: nextSlide.bgColor }}
          aria-hidden="true"
        >
          <div className={styles.peekContent}>
            <SlideArtwork slide={nextSlide} isActive={false} />
          </div>
        </motion.div>

        {/* Edge hover indicators */}
        <AnimatePresence>
          {edgeHover === 'left' && (
            <motion.div
              className={`${styles.edgeIndicator} ${styles.edgeLeft}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              PREVIOUS
            </motion.div>
          )}
          {edgeHover === 'right' && (
            <motion.div
              className={`${styles.edgeIndicator} ${styles.edgeRight}`}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
            >
              NEXT
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
