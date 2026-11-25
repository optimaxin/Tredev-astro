import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { astrologerService } from '../../services/astrologerService';
import type { UiAstrologer } from '../../services/astrologerService';
import { useAppContext } from '../../context/AppContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useFeaturedAstrologerId } from '../../hooks/useAstrologer';
import styles from './Astrologers.module.css';

const FILTERS = ['All', 'Love', 'Marriage', 'Career', 'Finance', 'Family', 'Vastu', 'Spirituality', 'Pooja'];

export default function Astrologers({ featured = false }: { featured?: boolean }) {
  const { setPage, t, astrologerFilter, setAstrologerFilter } = useAppContext();
  // Bumps whenever staff suspends/restores/removes/deletes an astrologer —
  // see RealtimeContext's own comment. Depending on it below re-fetches the
  // roster live instead of making a user refresh the page to stop seeing a
  // suspended/deleted astrologer (or to see a restored one again).
  const { catalogVersion } = useRealtime();
  const featuredAstrologerId = useFeaturedAstrologerId();
  // Seeded from SeekGuidance's category cards (e.g. "Career & Business" ->
  // 'Career') via the shared `astrologerFilter` context field — consumed
  // once here as the initial tab, then reset so a later, unrelated visit to
  // this page (nav bar, footer link, etc.) doesn't stay stuck on it.
  const [activeFilter, setActiveFilter] = useState(astrologerFilter);
  useEffect(() => {
    if (featured) return; // only the full listing page's tabs use this
    if (astrologerFilter !== 'All') setAstrologerFilter('All');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [filtered, setFiltered] = useState<UiAstrologer[]>([]);
  const [recommended, setRecommended] = useState<UiAstrologer[]>([]);
  const [loadError, setLoadError] = useState(false);

  // Featured (homepage) mode shows the top-rated Acharyas; the full listing
  // is filtered/sorted server-side by the selected category tab.
  useEffect(() => {
    if (!featured && featuredAstrologerId === undefined) return; // wait for the id before deciding pin order
    let cancelled = false;
    const params = featured ? { sort: 'rating' as const, limit: 3 } : { category: activeFilter, limit: 50 };
    astrologerService.list(params)
      .then(async ({ data }) => {
        if (cancelled || featured) { if (!cancelled) setFiltered(data); return; }
        // The site's current Featured/Celebrity Astrologer (admin-set, see
        // FeaturedAstrologerPage.tsx) is pinned to the top of the full
        // directory — he has his own dedicated booking page (real scheduled
        // slots), not just another row sorted by rating, where a brand-new
        // profile (0 reviews yet) would otherwise sink to the bottom. Only
        // forced into an unrelated category filter's results on 'All'; a
        // specific filter (e.g. Vastu) still only shows him if he genuinely
        // matches it.
        const fid = featuredAstrologerId;
        if (fid === null || fid === undefined) { setFiltered(data); return; }
        const already = data.find(a => a.id === fid);
        if (already) {
          setFiltered([already, ...data.filter(a => a.id !== fid)]);
        } else if (activeFilter === 'All') {
          const featuredAstro = await astrologerService.get(fid).catch(() => null);
          if (!cancelled) setFiltered(featuredAstro ? [featuredAstro, ...data] : data);
        } else {
          setFiltered(data);
        }
      })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [featured, activeFilter, catalogVersion, featuredAstrologerId]);

  useEffect(() => {
    if (featured) return;
    let cancelled = false;
    astrologerService.list({ sort: 'relevance', limit: 2 })
      .then(({ data }) => { if (!cancelled) setRecommended(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [featured, catalogVersion]);

  return (
    <section className={styles.section} id="astrologers">
      <div className={styles.container} style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <motion.div
          className="section-header-split"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
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
              {t('cta_explore_acharyas')} →
            </button>
          )}
        </motion.div>

        {loadError ? (
          <p className={styles.demoNote}>{t('astrologers_load_error')}</p>
        ) : featured ? (
          /* Featured mode: show 3 Acharyas in grid */
          <div className={styles.grid}>
            {filtered.map((a, i) => (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
              >
                <AstrologerCard astrologer={a} featuredAstrologerId={featuredAstrologerId} />
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
                  <AstrologerCard key={a.id} astrologer={a} compact featuredAstrologerId={featuredAstrologerId} />
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
                  {f === 'All' ? t('cat_all_astrologers') : t('cat_' + f.toLowerCase())}
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
                    <AstrologerCard astrologer={a} featuredAstrologerId={featuredAstrologerId} />
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

function AstrologerCard({ astrologer: a, compact = false, featuredAstrologerId }: { astrologer: UiAstrologer; compact?: boolean; featuredAstrologerId?: number | null }) {
  const { setPage, setSelectedId, t } = useAppContext();
  const { publicStates } = useRealtime();
  const live = publicStates[a.id];
  // Availability is authoritative-backend-only now — until the realtime
  // service reports in, assume offline rather than guessing.
  const isOnline = live ? live.status === 'ONLINE_AVAILABLE' || live.status === 'ONLINE_BUSY' : false;
  const isBusy = live?.status === 'ONLINE_BUSY';

  // The site's current Featured/Celebrity Astrologer (admin-set, see
  // FeaturedAstrologerPage.tsx) has his own dedicated page (real scheduled
  // 1:1 slots, paid up front) instead of the generic profile/instant-queue
  // flow every other astrologer here still uses — see pages/RaghavBookingPage.
  // Passed down from the parent's single fetch rather than each card
  // fetching it independently.
  const isFeatured = featuredAstrologerId != null && a.id === featuredAstrologerId;

  const handleCardClick = () => {
    if (isFeatured) { setPage('raghav-booking'); return; }
    setSelectedId(a.id);
    setPage('astrologer-profile');
  };

  // Chat/Call go straight to the booking page (skips the profile page) —
  // stopPropagation so the click doesn't also bubble to handleCardClick above.
  const handleBookNow = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFeatured) { setPage('raghav-booking'); return; }
    setSelectedId(a.id);
    setPage('consultation-booking');
  };

  return (
    <div className={`${styles.card} ${compact ? styles.cardCompact : ''}`} onClick={handleCardClick} style={{ cursor: 'pointer', position: 'relative' }}>
      {isFeatured && (
        <span style={{
          position: 'absolute', top: '12px', right: '12px', zIndex: 1,
          background: 'linear-gradient(135deg, var(--gold-primary, #c7a15a), #8a6a22)', color: '#1c0f0c',
          fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
          padding: '4px 10px', borderRadius: '999px',
        }}>
          Our Celebrity Astrologer
        </span>
      )}
      {/* Avatar */}
      <div className={styles.avatarWrap}>
        <div className={styles.avatar}>
          {a.avatar ? (
            <img src={a.avatar} alt={a.name} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarInitial}>{a.name.charAt(0)}</span>
          )}
        </div>
        {isOnline && (
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
            {a.activeOfferPercent > 0 ? (
              <span className={styles.price}>
                <span style={{ textDecoration: 'line-through', opacity: 0.55, fontSize: '0.85em', marginRight: 4 }}>₹{a.price}</span>
                ₹{Math.round(a.price * (1 - a.activeOfferPercent / 100))}<span className={styles.perMin}>{t('lbl_per_min')}</span>
                <span style={{ marginLeft: 6, fontSize: '0.7em', color: 'var(--gold-primary, #b58a3b)', fontWeight: 700 }}>{a.activeOfferPercent}% OFF</span>
              </span>
            ) : (
              <span className={styles.price}>₹{a.price}<span className={styles.perMin}>{t('lbl_per_min')}</span></span>
            )}
            {isOnline ? (
              <span className={styles.onlineStatus}>● {isBusy ? 'Busy' : t('lbl_online')}</span>
            ) : (
              <span className={styles.offlineStatus}>◯ {t('lbl_offline')}</span>
            )}
          </div>
          <div className={styles.ctaBtns}>
            <button className={`${styles.chatBtn} btn btn-outline-gold btn-sm`} id={`astrologer-chat-${a.id}`} onClick={handleBookNow}>
              {t('btn_chat')}
            </button>
            <button className={`${styles.callBtn} btn btn-gold btn-sm`} id={`astrologer-call-${a.id}`} onClick={handleBookNow}>
              {t('btn_call')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
