import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ASTROLOGERS } from '../../data/mockData';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './Astrologers.module.css';

const FILTERS = ['All', 'Love', 'Marriage', 'Career', 'Finance', 'Vastu', 'Spirituality'];

const FILTER_LABELS: Record<string, string> = {
  All: 'All Acharyas',
  Love: 'Prem',
  Marriage: 'Vivah',
  Career: 'Career',
  Finance: 'Dhan',
  Vastu: 'Vastu',
  Spirituality: 'Adhyatma',
};

export default function Astrologers({ featured = false }: { featured?: boolean }) {
  const { setPage, t } = useAppContext();
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = featured
    ? ASTROLOGERS.filter(a => a.online).slice(0, 3)
    : ASTROLOGERS.filter(a => activeFilter === 'All' || a.category.includes(activeFilter));

  const recommended = ASTROLOGERS.filter(a =>
    a.category.includes('Career') || a.category.includes('Finance')
  ).slice(0, 2);

  return (
    <section className={styles.section} id="astrologers">
      <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="section-header-split">
          <div className="header-left">
            <span className="section-eyebrow-gold">{t('seek_eyebrow')}</span>
            <h2 className="section-title-serif">{t('section_astrologers_title')}</h2>
            <p className="section-desc-sans">
              {t('section_astrologers_desc')}
            </p>
          </div>
          {featured && (
            <button
              className="section-explore-link"
              onClick={() => { setPage('astrologers'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              Explore All Acharyas →
            </button>
          )}
        </div>

        {featured ? (
          /* Featured mode: show 3 Acharyas in grid */
          <div className={styles.grid}>
            {filtered.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <AstrologerCard astrologer={a} />
              </motion.div>
            ))}
          </div>
        ) : (
          <>
            {/* Recommended Block */}
            <div className={styles.recommendedBlock}>
              <div className={styles.recommendedHeader}>
                <span className={styles.recommendedLabel}>✦ Guided For You</span>
                <span className={styles.recommendedDesc}>Recommended based on your Kundli positions</span>
              </div>
              <div className={styles.recommendedCards}>
                {recommended.map(a => (
                  <AstrologerCard key={a.id} astrologer={a} compact />
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className={styles.filters}>
              {FILTERS.map(f => (
                <button
                  key={f}
                  className={`${styles.filter} ${activeFilter === f ? styles.filterActive : ''}`}
                  onClick={() => setActiveFilter(f)}
                  id={`astrologer-filter-${f.toLowerCase()}`}
                >
                  {t('cat_' + f.toLowerCase()) || FILTER_LABELS[f] || f}
                </button>
              ))}
            </div>

            {/* Astrologer Grid */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeFilter}
                className={styles.grid}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                {filtered.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                  >
                    <AstrologerCard astrologer={a} />
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>

            <p className={styles.demoNote}>* Demo data for illustration. All names and statistics are placeholder content.</p>
          </>
        )}
      </div>
    </section>

  );
}

function AstrologerCard({ astrologer: a, compact = false }: { astrologer: typeof ASTROLOGERS[0]; compact?: boolean }) {
  const { setPage, setSelectedId, t } = useAppContext();

  const handleCardClick = () => {
    setSelectedId(a.id);
    setPage('astrologer-profile');
  };

  return (
    <div className={`${styles.card} ${compact ? styles.cardCompact : ''}`} onClick={handleCardClick} style={{ cursor: 'pointer' }}>
      {/* Avatar */}
      <div className={styles.avatarWrap}>
        <div className={styles.avatar}>
          {a.avatar ? (
            <img src={a.avatar} alt={a.name} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarInitial}>{a.name.charAt(0)}</span>
          )}
        </div>
        {a.online && (
          <span className={styles.onlineDot} aria-label="Online" />
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.topRow}>
          <div>
            <h3 className={styles.name}>{a.name}</h3>
            <p className={styles.specialization}>{a.title}</p>
          </div>
          {a.badge && (
            <span className={styles.badge}>{a.badge}</span>
          )}
        </div>

        {/* Rating + Stats */}
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.stars}>★ {a.rating}</span>
            <span className={styles.statLabel}>({a.reviews.toLocaleString()})</span>
          </div>
          <div className={styles.statDot} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{a.experience} {t('lbl_yrs')}</span>
          </div>
          <div className={styles.statDot} />
          <div className={styles.stat}>
            <span className={styles.statValue}>{a.consultations.toLocaleString()}</span>
            <span className={styles.statLabel}>{t('lbl_consults')}</span>
          </div>
        </div>

        {/* Languages */}
        <div className={styles.languages}>
          {a.languages.map(l => (
            <span key={l} className={styles.lang}>{l}</span>
          ))}
        </div>

        {/* Price + CTAs */}
        <div className={styles.bottom}>
          <div className={styles.priceWrap}>
            <span className={styles.price}>₹{a.price}<span className={styles.perMin}>{t('lbl_per_min')}</span></span>
            {a.online ? (
              <span className={styles.onlineStatus}>● {t('lbl_online')}</span>
            ) : (
              <span className={styles.offlineStatus}>◯ {t('lbl_offline')}</span>
            )}
          </div>
          <div className={styles.ctaBtns}>
            <button className={`${styles.chatBtn} btn btn-outline-gold btn-sm`} id={`astrologer-chat-${a.id}`}>
              {t('btn_chat')}
            </button>
            <button className={`${styles.callBtn} btn btn-gold btn-sm`} id={`astrologer-call-${a.id}`}>
              {t('btn_call')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
