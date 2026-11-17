import React from 'react';
import { motion } from 'framer-motion';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import { AcharyaIcon, LockIcon, RashiChakraIcon, ManuscriptIcon } from '../../components/Icons/Icons';
import { useAppContext } from '../../context/AppContext';
import styles from './WhyTredevAstro.module.css';

const PILLARS = [
  { icon: <AcharyaIcon size={26} />, key: 'pillar1', accent: 'gold' },
  { icon: <LockIcon size={26} />, key: 'pillar2', accent: 'cyan' },
  { icon: <RashiChakraIcon size={26} />, key: 'pillar3', accent: 'gold' },
  { icon: <ManuscriptIcon size={26} />, key: 'pillar4', accent: 'cyan' },
] as const;

export default function WhyTredevAstro() {
  const { t } = useAppContext();
  return (
    <section className={styles.section} id="why">
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">{t('section_why_eyebrow')}</span>
          <h2 className={styles.title}>{t('section_why_title')}</h2>
        </motion.div>

        <div className={styles.grid}>
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.key}
              className={`${styles.pillar} ${styles[`accent_${p.accent}`]}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.55 }}
            >
              <div className={styles.iconWrap}>
                <span className={styles.icon}>{p.icon}</span>
              </div>
              <h3 className={styles.pillarTitle}>{t(`why_${p.key}_title`)}</h3>
              <p className={styles.pillarDesc}>{t(`why_${p.key}_desc`)}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
