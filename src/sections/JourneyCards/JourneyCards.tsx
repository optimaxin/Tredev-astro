import React from 'react';
import { motion, type Variants } from 'framer-motion';
import { 
  RashiChakraIcon, 
  AcharyaIcon, 
  ManuscriptIcon, 
  ConstellationIcon, 
  ArrowIcon 
} from '../../components/Icons/Icons';
import styles from './JourneyCards.module.css';

const CARDS = [
  {
    id: 'kundli',
    title: 'Free Kundli',
    desc: 'Discover your birth chart — the celestial map of who you are.',
    cta: 'Generate Now',
    href: '#kundli',
    accent: 'gold',
  },
  {
    id: 'astrologer',
    title: 'Talk to an Astrologer',
    desc: 'Get personalized guidance from a Vedic astrology expert.',
    cta: 'Find Astrologers',
    href: '#astrologers',
    accent: 'cyan',
  },
  {
    id: 'reports',
    title: 'Astrology Reports',
    desc: 'Go deeper — detailed reports for career, love, and life purpose.',
    cta: 'Explore Reports',
    href: '#reports',
    accent: 'gold',
  },
  {
    id: 'ai',
    title: 'Ask TredevAstro',
    desc: 'Get quick chart-based answers using intelligent astrology guidance.',
    cta: 'Ask Now',
    href: '#ai',
    accent: 'cyan',
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};

const item: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export default function JourneyCards() {
  const scrollTo = (href: string) => {
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  };

  const getIcon = (id: string) => {
    switch (id) {
      case 'kundli': return <RashiChakraIcon size={36} />;
      case 'astrologer': return <AcharyaIcon size={36} />;
      case 'reports': return <ManuscriptIcon size={36} />;
      case 'ai': return <ConstellationIcon size={36} />;
      default: return null;
    }
  };

  return (
    <section className={styles.section} id="journey">
      <div className={styles.container}>
        {/* Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">Start Your Journey</span>
          <h2 className={styles.title}>Where would you like to begin?</h2>
        </motion.div>

        {/* Cards Grid */}
        <motion.div
          className={styles.grid}
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
        >
          {CARDS.map(card => (
            <motion.div key={card.id} variants={item}>
              <div
                className={`${styles.card} ${styles[`accent_${card.accent}`]}`}
                onClick={() => scrollTo(card.href)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && scrollTo(card.href)}
                id={`journey-${card.id}`}
              >
                <div className={styles.iconWrap}>
                  <span className={styles.icon}>{getIcon(card.id)}</span>
                </div>
                <h3 className={styles.cardTitle}>{card.title}</h3>
                <p className={styles.cardDesc}>{card.desc}</p>
                <span className={styles.cardCta}>
                  {card.cta}
                  <ArrowIcon size={18} style={{ marginLeft: 6 }} />
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
