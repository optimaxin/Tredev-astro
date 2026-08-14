import React from 'react';
import { motion } from 'framer-motion';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import { AcharyaIcon, LockIcon, RashiChakraIcon, ManuscriptIcon } from '../../components/Icons/Icons';
import styles from './WhyTredevAstro.module.css';

const PILLARS = [
  {
    icon: <AcharyaIcon size={26} />,
    title: 'Verified Experts',
    desc: 'Every astrologer on TredevAstro is manually reviewed, assessed and verified for their knowledge, accuracy and approach.',
    accent: 'gold',
  },
  {
    icon: <LockIcon size={26} />,
    title: 'Private & Secure',
    desc: 'Your birth data, consultations and reports are private. We never share, sell or expose your personal information.',
    accent: 'cyan',
  },
  {
    icon: <RashiChakraIcon size={26} />,
    title: 'Personalized Astrology',
    desc: 'One birth profile powers your entire experience — Kundli, horoscope, AI insights, recommendations and more.',
    accent: 'gold',
  },
  {
    icon: <ManuscriptIcon size={26} />,
    title: 'Traditional Wisdom, Modern Experience',
    desc: 'Rooted in classical Vedic astrology, delivered through a thoughtfully designed modern platform.',
    accent: 'cyan',
  },
];

export default function WhyTredevAstro() {
  return (
    <section className={styles.section} id="why">
      <CelestialOrnament type="orbit" className={styles.bgOrnament} />
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">Our Promise</span>
          <h2 className={styles.title}>Why TredevAstro</h2>
        </motion.div>

        <div className={styles.grid}>
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              className={`${styles.pillar} ${styles[`accent_${p.accent}`]}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
            >
              <div className={styles.iconWrap}>
                <span className={styles.icon}>{p.icon}</span>
              </div>
              <h3 className={styles.pillarTitle}>{p.title}</h3>
              <p className={styles.pillarDesc}>{p.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
