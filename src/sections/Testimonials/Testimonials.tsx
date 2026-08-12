import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { TESTIMONIALS } from '../../data/mockData';
import styles from './Testimonials.module.css';

export default function Testimonials() {
  const [active, setActive] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const handleNav = (i: number) => {
    setActive(i);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActive(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);
  };

  return (
    <section className={styles.section} id="testimonials">
      <div className={styles.container}>
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="section-eyebrow">What Our Users Say</span>
          <h2 className={styles.title}>Stories of Insight</h2>
          <p className={styles.demoNote}>The following are illustrative demo testimonials.</p>
        </motion.div>

        {/* Featured */}
        <div className={styles.featured}>
          <div className={styles.quoteIcon}>"</div>
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <p className={styles.quote}>{TESTIMONIALS[active].text}</p>
            <div className={styles.author}>
              <div className={styles.authorAvatar}>{TESTIMONIALS[active].avatar}</div>
              <div>
                <div className={styles.authorName}>{TESTIMONIALS[active].name}</div>
                <div className={styles.authorLocation}>{TESTIMONIALS[active].location}</div>
                <div className={styles.authorService}>{TESTIMONIALS[active].service}</div>
              </div>
              <div className={styles.rating}>
                {'★'.repeat(TESTIMONIALS[active].rating)}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Navigation Dots */}
        <div className={styles.dots}>
          {TESTIMONIALS.map((_, i) => (
            <button
              key={i}
              className={`${styles.dot} ${i === active ? styles.dotActive : ''}`}
              onClick={() => handleNav(i)}
              aria-label={`Testimonial ${i + 1}`}
            />
          ))}
        </div>

        {/* Mini Cards */}
        <div className={styles.minisGrid}>
          {TESTIMONIALS.filter((_, i) => i !== active).slice(0, 3).map(t => (
            <div key={t.id} className={styles.miniCard}>
              <div className={styles.miniRating}>{'★'.repeat(t.rating)}</div>
              <p className={styles.miniText}>{t.text.slice(0, 100)}...</p>
              <div className={styles.miniAuthor}>{t.name} · {t.service}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
