import React from 'react';
import { motion } from 'framer-motion';
import { useAppContext, type Concern } from '../../context/AppContext';
import styles from './SeekGuidance.module.css';

interface CategoryCard {
  id: string;
  titleKey: string;
  sanskrit: string;
  descKey: string;
  size: 'large' | 'small';
  iconSvg: React.ReactNode;
  concern: Concern;
}

export default function SeekGuidance() {
  const { setPage, setConcern, t } = useAppContext();

  const handleCardClick = (concern: Concern) => {
    setConcern(concern);
    setPage('free-kundli');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const CARDS: CategoryCard[] = [
    {
      id: 'marriage',
      titleKey: 'seek_card_marriage_title',
      sanskrit: 'विवाह',
      descKey: 'seek_card_marriage_desc',
      size: 'small',
      concern: 'Marriage',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
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
      titleKey: 'seek_card_career_title',
      sanskrit: 'जीविका',
      descKey: 'seek_card_career_desc',
      size: 'small',
      concern: 'Career & Business',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="34" stroke="currentColor" strokeWidth="0.75" />
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
      titleKey: 'seek_card_money_title',
      sanskrit: 'लक्ष्मी',
      descKey: 'seek_card_money_desc',
      size: 'small',
      concern: 'Money & Finance',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
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
      titleKey: 'seek_card_family_title',
      sanskrit: 'कुटुंब',
      descKey: 'seek_card_family_desc',
      size: 'small',
      concern: 'Family',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="50" cy="50" r="18" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" />
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
      titleKey: 'seek_card_growth_title',
      sanskrit: 'विकास',
      descKey: 'seek_card_growth_desc',
      size: 'small',
      concern: 'Personal Growth',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
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
      titleKey: 'seek_card_spirituality_title',
      sanskrit: 'मोक्ष',
      descKey: 'seek_card_spirituality_desc',
      size: 'small',
      concern: 'Spirituality',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
          <polygon points="50,24 68,60 32,60" stroke="var(--gold-primary)" strokeWidth="1.25" />
          <polygon points="50,76 32,40 68,40" stroke="var(--gold-primary)" strokeWidth="1.25" />
          <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="50" cy="50" r="10" stroke="var(--gold-primary)" strokeWidth="0.75" />
        </svg>
      )
    },
    {
      id: 'vastu',
      titleKey: 'seek_card_vastu_title',
      sanskrit: 'वास्तु',
      descKey: 'seek_card_vastu_desc',
      size: 'large',
      concern: 'Vastu',
      iconSvg: (
        <svg className={styles.icon} viewBox="0 0 100 100" fill="none">
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
            <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
            <h2 className="section-title-serif">{t('seek_title')}</h2>
            <p className="section-desc-sans">
              {t('seek_desc')}
            </p>
          </div>
        </div>

        {/* Asymmetrical grid layout - 3 balanced columns */}
        <div className={styles.cardsGrid}>
          {CARDS.map(card => (
            <div 
              key={card.id} 
              className={`${styles.card} ${styles[card.size]}`}
              onClick={() => handleCardClick(card.concern)}
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
                  <h3 className={styles.cardTitle}>{t(card.titleKey)}</h3>
                </div>
              </div>
              <p className={styles.cardDesc}>{t(card.descKey)}</p>
              
              <span className={styles.cardCta}>{t('seek_card_cta')}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
