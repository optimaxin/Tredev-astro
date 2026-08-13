import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import styles from './SeekGuidance.module.css';

interface CategoryCard {
  id: string;
  title: string;
  sanskrit: string;
  desc: string;
  size: 'large' | 'medium' | 'small';
  iconSvg: React.ReactNode;
}

export default function SeekGuidance() {
  const { setPage, setConcern } = useAppContext();

  const handleCardClick = (title: any) => {
    setConcern(title);
    setPage('free-kundli');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const CARDS: CategoryCard[] = [
    {
      id: 'marriage',
      title: 'Love & Marriage',
      sanskrit: 'विवाह',
      desc: 'Understand relationship compatibility, Mars dosha, and marriage timing.',
      size: 'medium',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
          {/* Animated intersecting orbits */}
          <motion.ellipse 
            cx="42" cy="50" rx="20" ry="10" 
            stroke="var(--gold-primary)" strokeWidth="1.5" 
            animate={{ rotate: 360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          <motion.ellipse 
            cx="58" cy="50" rx="20" ry="10" 
            stroke="var(--gold-primary)" strokeWidth="1.5" 
            animate={{ rotate: -360 }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          />
          <circle cx="42" cy="50" r="3" fill="var(--gold-primary)" />
          <circle cx="58" cy="50" r="3" fill="var(--gold-primary)" />
        </svg>
      )
    },
    {
      id: 'career',
      title: 'Career & Business',
      sanskrit: 'जीविका',
      desc: 'Auspicious professions, leadership prospects, and timing of success.',
      size: 'medium',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="0.75" />
          {/* Surya glowing sun rays */}
          <motion.circle 
            cx="50" cy="50" r="16" 
            stroke="var(--gold-primary)" strokeWidth="2" 
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />
          {Array.from({ length: 12 }, (_, i) => {
            const angle = (i / 12) * Math.PI * 2;
            const x1 = 50 + Math.cos(angle) * 19;
            const y1 = 50 + Math.sin(angle) * 19;
            const x2 = 50 + Math.cos(angle) * 27;
            const y2 = 50 + Math.sin(angle) * 27;
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="var(--gold-primary)" strokeWidth="1.25" />;
          })}
        </svg>
      )
    },
    {
      id: 'money',
      title: 'Money & Prosperity',
      sanskrit: 'लक्ष्मी',
      desc: 'Financial yogas, wealth accumulation periods, and remedial path.',
      size: 'small',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          {/* Lotus geometry */}
          <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.75" strokeDasharray="2 2" />
          <g stroke="var(--gold-primary)" strokeWidth="1.25">
            {Array.from({ length: 8 }, (_, i) => {
              const rotate = i * 45;
              return (
                <path 
                  key={i}
                  d="M 50,22 C 45,36 45,44 50,50 C 55,44 55,36 50,22 Z"
                  transform={`rotate(${rotate} 50 50)`}
                />
              );
            })}
          </g>
          <circle cx="50" cy="50" r="6" fill="var(--gold-primary)" opacity="0.3" />
        </svg>
      )
    },
    {
      id: 'family',
      title: 'Family & Heritage',
      sanskrit: 'कुटुंब',
      desc: 'Ancestral karma, domestic harmony, and lineage progeny charts.',
      size: 'small',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" />
          {/* Nested constellation dots */}
          <circle cx="50" cy="50" r="5" fill="var(--gold-primary)" />
          <circle cx="50" cy="22" r="3.5" fill="var(--gold-primary)" />
          <circle cx="50" cy="78" r="3.5" fill="var(--gold-primary)" />
          <circle cx="22" cy="50" r="3.5" fill="var(--gold-primary)" />
          <circle cx="78" cy="50" r="3.5" fill="var(--gold-primary)" />
        </svg>
      )
    },
    {
      id: 'growth',
      title: 'Personal Growth',
      sanskrit: 'विकास',
      desc: 'Identify character strengths, obstacles, and spiritual path.',
      size: 'medium',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          {/* Moon phases */}
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="0.75" strokeDasharray="4 2" />
          <motion.path 
            d="M50 25 A 25 25 0 0 1 50 75 A 15 25 0 0 1 50 25 Z" 
            fill="var(--gold-primary)" 
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          />
          <circle cx="50" cy="50" r="25" stroke="var(--gold-primary)" strokeWidth="1" />
        </svg>
      )
    },
    {
      id: 'spirituality',
      title: 'Spirituality',
      sanskrit: 'मोक्ष',
      desc: 'Moksha timings, meditation affinity, and spiritual alignments.',
      size: 'small',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          {/* Sri Yantra-inspired central triangles */}
          <polygon points="50,24 68,60 32,60" stroke="var(--gold-primary)" strokeWidth="1.25" />
          <polygon points="50,76 32,40 68,40" stroke="var(--gold-primary)" strokeWidth="1.25" />
          <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="50" cy="50" r="10" stroke="var(--gold-primary)" strokeWidth="0.75" />
        </svg>
      )
    },
    {
      id: 'vastu',
      title: 'Vastu Shastra',
      sanskrit: 'वास्तु',
      desc: 'Directional energies, element placement, and home architecture harmony.',
      size: 'large',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          {/* Square Vastu mandala grid */}
          <rect x="20" y="20" width="60" height="60" stroke="var(--gold-primary)" strokeWidth="1.5" />
          <line x1="20" y1="20" x2="80" y2="80" stroke="currentColor" strokeWidth="0.75" />
          <line x1="80" y1="20" x2="20" y2="80" stroke="currentColor" strokeWidth="0.75" />
          <line x1="50" y1="20" x2="50" y2="80" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
          <line x1="20" y1="50" x2="80" y2="50" stroke="currentColor" strokeWidth="0.5" strokeDasharray="3 3" />
          <motion.circle 
            cx="50" cy="50" r="18" 
            stroke="var(--gold-primary)" strokeWidth="1" 
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
          <circle cx="50" cy="50" r="4" fill="var(--gold-primary)" />
        </svg>
      )
    }
  ];

  return (
    <section className={styles.section} id="seek-guidance">
      <div className="section-container">
        {/* Section Header */}
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">Jyotish Margdarshan</span>
            <h2 className="section-title-serif">Where does your question begin?</h2>
            <p className="section-desc-sans">
              Select a life area to generate your Janma Kundli and explore planetary alignments.
            </p>
          </div>
        </div>

        {/* Asymmetrical grid layout */}
        <div className={styles.cardsGrid}>
          {CARDS.map(card => (
            <div 
              key={card.id} 
              className={`${styles.card} ${styles[card.size]}`}
              onClick={() => handleCardClick(card.title)}
            >
              {/* Background Sacred Geometry Mandala */}
              <div className={styles.cardBgPattern}>
                <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" opacity="0.06">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.5" />
                  <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.5" />
                  <line x1="10" y1="50" x2="90" y2="50" stroke="currentColor" strokeWidth="0.5" />
                  <line x1="50" y1="10" x2="50" y2="90" stroke="currentColor" strokeWidth="0.5" />
                </svg>
              </div>

              <div className={styles.cardHeader}>
                {card.iconSvg}
                <div>
                  <span className={styles.sanskritLabel}>{card.sanskrit}</span>
                  <h3 className={styles.cardTitle}>{card.title}</h3>
                </div>
              </div>
              <p className={styles.cardDesc}>{card.desc}</p>
              
              <span className={styles.cardCta}>Analyze Placement →</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
