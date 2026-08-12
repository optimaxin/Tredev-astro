import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CONCERN_CONTENT } from '../../data/mockData';
import { 
  MarriageIcon, 
  CareerIcon, 
  WealthIcon, 
  VastuIcon, 
  RashiChakraIcon, 
  AcharyaIcon, 
  ConstellationIcon, 
  ProfileIcon 
} from '../../components/Icons/Icons';
import styles from './ConcernSelector.module.css';

type Concern = keyof typeof CONCERN_CONTENT;

const CONCERNS: Concern[] = [
  'Love & Relationships',
  'Marriage',
  'Career & Business',
  'Money & Finance',
  'Family',
  'Personal Growth',
  'Spirituality',
  'Vastu',
];

const CONCERN_LABELS: Record<Concern, string> = {
  'Love & Relationships': 'Prem & Sambandh',
  'Marriage': 'Vivah (Marriage)',
  'Career & Business': 'Vyapaar & Career',
  'Money & Finance': 'Dhan (Wealth & Finance)',
  'Family': 'Parivaar (Family)',
  'Personal Growth': 'Swasthya & Unnati',
  'Spirituality': 'Adhyatma (Spirit)',
  'Vastu': 'Vastu Shastra',
};

export default function ConcernSelector() {
  const [selected, setSelected] = useState<Concern | null>(null);

  const getConcernIcon = (concern: Concern) => {
    switch (concern) {
      case 'Love & Relationships': return <RashiChakraIcon size={14} />;
      case 'Marriage': return <MarriageIcon size={14} />;
      case 'Career & Business': return <CareerIcon size={14} />;
      case 'Money & Finance': return <WealthIcon size={14} />;
      case 'Family': return <AcharyaIcon size={14} />;
      case 'Personal Growth': return <ConstellationIcon size={14} />;
      case 'Spirituality': return <ProfileIcon size={14} />;
      case 'Vastu': return <VastuIcon size={14} />;
      default: return null;
    }
  };

  return (
    <section className={styles.section} id="concerns">
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">Kis Vishay Mein Margdarshan Chahte Hain?</span>
          <h2 className={styles.title}>What Guidance Do You Seek?</h2>
          <p className={styles.subtitle}>Select an astrological focus area to reveal traditional Vedic remedies, charts and expert Acharyas.</p>
        </motion.div>

        {/* Concern Pills */}
        <motion.div
          className={styles.pills}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2, duration: 0.6 }}
        >
          {CONCERNS.map(c => (
            <button
              key={c}
              className={`${styles.pill} ${selected === c ? styles.pillActive : ''}`}
              onClick={() => setSelected(prev => prev === c ? null : c)}
              id={`concern-${c.replace(/[^a-z]/gi, '-').toLowerCase()}`}
            >
              {renderConstellation(c)}
              <span className={styles.pillText} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <span className={styles.pillIcon}>{getConcernIcon(c)}</span>
                {CONCERN_LABELS[c]}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Dynamic Content */}
        <AnimatePresence mode="wait">
          {selected && (
            <motion.div
              key={selected}
              className={styles.results}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
            >
              <div className={styles.resultsGrid}>
                {/* Free */}
                <div className={styles.resultsCol}>
                  <div className={styles.colHeader}>
                    <span className={styles.colBadge}>Free</span>
                    <span className={styles.colTitle}>Available for you right now</span>
                  </div>
                  <div className={styles.colItems}>
                    {CONCERN_CONTENT[selected].free.map(item => (
                      <button key={item} className={styles.freeItem}>
                        <span className={styles.freeIcon}>→</span>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Paid */}
                <div className={styles.resultsCol}>
                  <div className={styles.colHeader}>
                    <span className={`${styles.colBadge} ${styles.colBadgePremium}`}>Premium</span>
                    <span className={styles.colTitle}>Go deeper with expert guidance</span>
                  </div>
                  <div className={styles.colItems}>
                    {CONCERN_CONTENT[selected].paid.map(item => (
                      <button key={item} className={`${styles.paidItem}`}>
                        <span className={styles.paidIcon}>✦</span>
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <p className={styles.disclaimer}>
                Tap any option to explore. Premium services require an account.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!selected && (
          <div className={styles.placeholder}>
            <span className={styles.placeholderText}>Select an area above to see personalized recommendations</span>
          </div>
        )}
      </div>
    </section>
  );
}

function renderConstellation(concern: Concern) {
  let path = '';
  let stars: [number, number][] = [];

  switch (concern) {
    case 'Love & Relationships':
      path = 'M 20 24 L 45 10 L 60 24 L 75 10 L 100 24 L 60 38 Z';
      stars = [[20, 24], [45, 10], [60, 24], [75, 10], [100, 24], [60, 38]];
      break;
    case 'Marriage':
      path = 'M 30 24 L 50 12 L 70 24 L 90 36 L 50 36 Z M 50 12 L 50 36';
      stars = [[30, 24], [50, 12], [70, 24], [90, 36], [50, 36]];
      break;
    case 'Career & Business':
      path = 'M 20 36 L 45 28 L 70 20 L 95 12 M 80 12 L 95 12 L 95 27';
      stars = [[20, 36], [45, 28], [70, 20], [95, 12], [80, 12], [95, 27]];
      break;
    case 'Money & Finance':
      path = 'M 30 36 L 45 16 L 60 32 L 75 16 L 90 36 Z';
      stars = [[30, 36], [45, 16], [60, 32], [75, 16], [90, 36]];
      break;
    case 'Family':
      path = 'M 25 36 L 25 20 L 60 10 L 95 20 L 95 36 Z M 25 20 L 95 20';
      stars = [[25, 36], [25, 20], [60, 10], [95, 20], [95, 36]];
      break;
    case 'Personal Growth':
      path = 'M 60 8 L 60 40 M 25 24 L 95 24 M 45 14 L 75 34 M 75 14 L 45 34';
      stars = [[60, 8], [60, 40], [25, 24], [95, 24]];
      break;
    case 'Spirituality':
      path = 'M 30 12 L 55 10 L 75 24 L 55 38 L 30 36 Q 50 24 30 12';
      stars = [[30, 12], [55, 10], [75, 24], [55, 38], [30, 36]];
      break;
    case 'Vastu':
      path = 'M 30 12 L 90 12 L 90 36 L 30 36 Z M 30 24 L 90 24 M 60 12 L 60 36';
      stars = [[30, 12], [90, 12], [90, 36], [30, 36], [60, 24]];
      break;
    default:
      return null;
  }

  return (
    <svg viewBox="0 0 120 48" className={styles.constellationSvg}>
      <path
        d={path}
        fill="none"
        stroke="rgba(199, 161, 90, 0.35)"
        strokeWidth="0.75"
        className={styles.constellationPath}
      />
      {stars.map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r="1.8"
          fill="#E8DFCF"
          className={styles.constellationStar}
        />
      ))}
    </svg>
  );
}
