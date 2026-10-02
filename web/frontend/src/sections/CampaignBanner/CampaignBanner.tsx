import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { API_URL } from '../../services/apiUrl';
import styles from './CampaignBanner.module.css';

interface ApiBanner {
  id: string;
  mediaType: 'image' | 'video';
  mediaData: string;
  linkUrl: string | null;
}

// Non-text data only — the actual copy (category/title/description/cta)
// comes from AppContext's TRANSLATIONS (banner_<id>_*) at render time instead
// of living here, since this carousel's own Google Translate pass is
// unreliable (each slide fully unmounts/remounts every 6s via framer-motion,
// racing faster than Google can keep up — verified live, text stayed
// English indefinitely) — see buildSlides below.
const SLIDE_META = [
  {
    id: 0,
    ctaAction: 'free-kundli',
    accentColor: '#C7A15A',
    bgColor: 'linear-gradient(135deg, #080C1C 0%, #0C1830 40%, #17253A 100%)',
    artColor: '#B58A3B',
    symbol: '☉',
    symbolLabel: 'Surya',
    decorSvg: 'kundli',
    image: '/Astrologist/A1.png',
  },
  {
    id: 1,
    ctaAction: 'astrologers',
    accentColor: '#A85B2D',
    bgColor: 'linear-gradient(135deg, #17101F 0%, #24131A 40%, #1C0F22 100%)',
    artColor: '#A85B2D',
    symbol: '☽',
    symbolLabel: 'Chandra',
    decorSvg: 'Astrologist',
    image: '/Astrologist/A2.png',
  },
  {
    id: 2,
    ctaAction: 'reports',
    accentColor: '#9A5428',
    bgColor: 'linear-gradient(135deg, #0C1230 0%, #111A34 40%, #0A1628 100%)',
    artColor: '#9A5428',
    symbol: '♃',
    symbolLabel: 'Guru',
    decorSvg: 'report',
    image: '/Astrologist/A3.png',
  },
  {
    id: 3,
    ctaAction: 'store',
    accentColor: '#C7A15A',
    bgColor: 'linear-gradient(135deg, #1A1008 0%, #241810 40%, #1A1508 100%)',
    artColor: '#C7A15A',
    symbol: '◉',
    symbolLabel: 'Yantra',
    decorSvg: 'store',
    image: '/Astrologist/A4.png',
  },
  {
    id: 4,
    ctaAction: 'academy',
    accentColor: '#B58A3B',
    bgColor: 'linear-gradient(135deg, #0A1020 0%, #101828 40%, #0C1420 100%)',
    artColor: '#B58A3B',
    symbol: '✦',
    symbolLabel: 'Nakshatra',
    decorSvg: 'academy',
    image: '/Astrologist/A1.png',
  },
];

function buildSlides(t: (key: string) => string) {
  return SLIDE_META.map(m => ({
    ...m,
    category: t(`banner_${m.id}_category`),
    title: t(`banner_${m.id}_title`),
    description: t(`banner_${m.id}_desc`),
    cta: t(`banner_${m.id}_cta`),
  }));
}

function SlideArtwork({ slide, isActive }: { slide: ReturnType<typeof buildSlides>[0]; isActive: boolean }) {
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
        <circle cx="160" cy="160" r="148" fill="none" stroke={`${slide.artColor}30`} strokeWidth="1" />
        <circle cx="160" cy="160" r="130" fill="none" stroke={`${slide.artColor}25`} strokeWidth="0.75" />

        {/* 12-spoke Rashi wheel */}
        {Array.from({ length: 12 }, (_, i) => {
          const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
          const x1 = 160 + Math.cos(angle) * 80;
          const y1 = 160 + Math.sin(angle) * 80;
          const x2 = 160 + Math.cos(angle) * 130;
          const y2 = 160 + Math.sin(angle) * 130;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${slide.artColor}20`} strokeWidth="0.75" />;
        })}

        {/* Inner concentric circles */}
        <circle cx="160" cy="160" r="80" fill="none" stroke={`${slide.artColor}35`} strokeWidth="1" />
        <circle cx="160" cy="160" r="50" fill="none" stroke={`${slide.artColor}40`} strokeWidth="0.75" />
        <circle cx="160" cy="160" r="24" fill="none" stroke={`${slide.artColor}50`} strokeWidth="1" />

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
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${slide.artColor}60`} strokeWidth="2" />;
        })}
      </svg>
    </div>
  );
}

// Falls back to this hardcoded carousel whenever staff haven't uploaded any
// banners yet (see the default export below) — keeps the homepage looking
// finished out of the box instead of showing an empty section.
function StaticCampaignBanner() {
  const { setPage, t } = useAppContext();
  const [current, setCurrent] = useState(0);
  const [edgeHover, setEdgeHover] = useState<'left' | 'right' | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const autoRef = useRef<number | null>(null);

  const SLIDES = buildSlides(t);
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

  const handleClick = () => {
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
                  <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

            {/* Right: Artwork — chakra SVG behind, Astrologist image on top */}
            <div className={styles.slideArtwork}>
              <SlideArtwork slide={slide} isActive={true} />
              {/* Astrologist image layer — absolutely over the chakra region */}
              <img
                key={slide.id}
                src={slide.image}
                alt=""
                aria-hidden="true"
                className={styles.slideAstrologistImg}
                draggable={false}
              />
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
                <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
                <path d="M8 4l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// Staff-uploaded banners (see admin/pages/BannersPage.tsx) — plain
// clickable media, no title/description copy since staff only supply an
// image/video and an optional link, unlike the static carousel's SLIDES.
function DynamicBannerCarousel({ banners }: { banners: ApiBanner[] }) {
  const { setPage } = useAppContext();
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const total = banners.length;

  useEffect(() => {
    if (isHovered || total <= 1) return;
    const id = window.setInterval(() => setCurrent(c => (c + 1) % total), 6000);
    return () => clearInterval(id);
  }, [isHovered, total]);

  const banner = banners[current];

  const handleClick = () => {
    if (!banner.linkUrl) return;
    // External links navigate the whole browser away; anything that looks
    // like one of this app's own page keys (no scheme/slash) goes through
    // setPage instead, same as the static carousel's slideCta buttons do.
    if (/^https?:\/\//.test(banner.linkUrl)) {
      window.location.href = banner.linkUrl;
    } else {
      setPage(banner.linkUrl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <section className={styles.section} id="campaign-banner" aria-label="Featured campaigns">
      <div
        className={styles.carousel}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={banner.id}
            className={styles.mainCard}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{ cursor: banner.linkUrl ? 'pointer' : 'default', width: '100%' }}
            onClick={handleClick}
          >
            {banner.mediaType === 'video' ? (
              <video src={banner.mediaData} style={{ width: '100%', height: '100%', objectFit: 'cover' }} autoPlay loop muted playsInline />
            ) : (
              <img src={banner.mediaData} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
            )}

            {total > 1 && (
              <div className={styles.slideCounter} style={{ position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)' }}>
                {banners.map((b, i) => (
                  <button
                    key={b.id}
                    className={`${styles.counterDot} ${i === current ? styles.counterDotActive : ''}`}
                    onClick={e => { e.stopPropagation(); setCurrent(i); }}
                    aria-label={`Go to banner ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

export default function CampaignBanner() {
  const [banners, setBanners] = useState<ApiBanner[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/banners/active`)
      .then(res => res.json())
      .then((data: ApiBanner[]) => { if (!cancelled) setBanners(data); })
      .catch(() => { if (!cancelled) setBanners([]); });
    return () => { cancelled = true; };
  }, []);

  if (banners && banners.length > 0) return <DynamicBannerCarousel banners={banners} />;
  return <StaticCampaignBanner />;
}
