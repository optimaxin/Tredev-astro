import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import styles from './ConcernSelector.module.css';

const CONCERNS = [
  {
    key: 'career',
    title: 'Career & Business',
    subtitle: 'Vyapaar · Karma',
    description: 'Navigate professional growth, business timing, and dharmic purpose through planetary analysis.',
    icon: '☉',  // Surya — career
    size: 'large',
    accentColor: '#B58A3B',
    animationType: 'orbit',
    page: 'reports',
  },
  {
    key: 'love',
    title: 'Love & Marriage',
    subtitle: 'Prem · Vivah',
    description: 'Understand compatibility, relationship karmas and the timing of love and union.',
    icon: '☽',  // Chandra — emotions
    size: 'medium',
    accentColor: '#A85B2D',
    animationType: 'pulse',
    page: 'reports',
  },
  {
    key: 'money',
    title: 'Money & Prosperity',
    subtitle: 'Dhan · Artha',
    description: 'Reveal your financial destiny, prosperity windows and dharmic relationship with wealth.',
    icon: '♃',  // Guru — expansion
    size: 'medium',
    accentColor: '#8F6A22',
    animationType: 'orbit',
    page: 'reports',
  },
  {
    key: 'family',
    title: 'Family',
    subtitle: 'Parivaar · Sukha',
    description: 'Harmony, family karma and the astrological bonds that shape your household.',
    icon: '♀',  // Shukra — nurturing
    size: 'small',
    accentColor: '#6B8EA8',
    animationType: 'float',
    page: 'astrologers',
  },
  {
    key: 'growth',
    title: 'Personal Growth',
    subtitle: 'Swasthya · Unnati',
    description: 'Mind, body and soul development through your Lagna, nakshatra and planetary strengths.',
    icon: '♂',  // Mangala — drive
    size: 'small',
    accentColor: '#A85B2D',
    animationType: 'float',
    page: 'astrologers',
  },
  {
    key: 'spirituality',
    title: 'Spirituality',
    subtitle: 'Adhyatma · Moksha',
    description: 'Past karma, moksha indicators, Ketu and the spiritual thread woven through your chart.',
    icon: '☿',  // Ketu — liberation
    size: 'small',
    accentColor: '#68717A',
    animationType: 'pulse',
    page: 'astrologers',
  },
  {
    key: 'vastu',
    title: 'Vastu Shastra',
    subtitle: 'Vastu · Griha',
    description: 'Align your living space with cosmic directions, planetary zones and Vedic principles.',
    icon: '⊕',  // Earth
    size: 'small',
    accentColor: '#6B8464',
    animationType: 'float',
    page: 'astrologers',
  },
];

function OrbitalAnimation({ color, active }: { color: string; active: boolean }) {
  return (
    <svg
      className={`${styles.orbitalSvg} ${active ? styles.orbitalActive : ''}`}
      width="100"
      height="100"
      viewBox="0 0 100 100"
      aria-hidden="true"
    >
      <ellipse
        cx="50" cy="50"
        rx="44" ry="20"
        fill="none"
        stroke={`${color}40`}
        strokeWidth="1"
        className={styles.orbitalRing}
      />
      <ellipse
        cx="50" cy="50"
        rx="36" ry="16"
        fill="none"
        stroke={`${color}25`}
        strokeWidth="0.75"
        className={styles.orbitalRing2}
      />
      <circle
        cx="94" cy="50"
        r="3"
        fill={color}
        opacity="0.7"
        className={styles.orbitalDot}
      />
    </svg>
  );
}

function ConcernCard({ concern, featured = false }: { concern: typeof CONCERNS[0]; featured?: boolean }) {
  const { setPage } = useAppContext();
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      className={`${styles.card} ${styles[`card_${concern.size}`]} ${featured ? styles.cardFeatured : ''}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={() => { setPage(concern.page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
      style={{ '--card-accent': concern.accentColor } as React.CSSProperties}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && setPage(concern.page)}
    >
      {/* Background motif — subtle celestial pattern */}
      <div className={styles.cardBg} aria-hidden="true">
        <OrbitalAnimation color={concern.accentColor} active={hovered} />
      </div>

      {/* Gold line accent — expands on hover */}
      <div className={`${styles.goldLine} ${hovered ? styles.goldLineExpanded : ''}`}
        style={{ background: concern.accentColor }} 
      />

      {/* Icon */}
      <div className={`${styles.iconWrap} ${hovered ? styles.iconWrapHovered : ''}`}>
        <span className={styles.icon} style={{ color: concern.accentColor }}>
          {concern.icon}
        </span>
      </div>

      {/* Content */}
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{concern.title}</h3>
        <span className={styles.cardSubtitle}>{concern.subtitle}</span>

        {/* Description — reveals on hover */}
        <AnimatePresence>
          {(hovered || concern.size === 'large') && (
            <motion.p
              className={styles.cardDesc}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
            >
              {concern.description}
            </motion.p>
          )}
        </AnimatePresence>

        <div className={`${styles.cardArrow} ${hovered ? styles.cardArrowVisible : ''}`}>
          Seek guidance →
        </div>
      </div>
    </motion.div>
  );
}

export default function ConcernSelector() {
  const large = CONCERNS.filter(c => c.size === 'large');
  const medium = CONCERNS.filter(c => c.size === 'medium');
  const small = CONCERNS.filter(c => c.size === 'small');

  return (
    <section className={styles.section} id="concerns" aria-label="Guidance areas">
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">Kis Vishay Mein Margdarshan Chahte Hain?</span>
          <h2 className={styles.title}>Where Does Your Question Begin?</h2>
          <p className={styles.subtitle}>
            Choose what matters most to you. Every question has a celestial answer.
          </p>
        </motion.div>

        {/* Editorial mixed-size grid */}
        <div className={styles.grid}>
          {/* Large feature card */}
          <div className={styles.gridLarge}>
            {large.map(c => <ConcernCard key={c.key} concern={c} featured />)}
          </div>

          {/* Medium cards */}
          <div className={styles.gridMedium}>
            {medium.map(c => <ConcernCard key={c.key} concern={c} />)}
          </div>

          {/* Small cards */}
          <div className={styles.gridSmall}>
            {small.map(c => <ConcernCard key={c.key} concern={c} />)}
          </div>
        </div>
      </div>
    </section>
  );
}
