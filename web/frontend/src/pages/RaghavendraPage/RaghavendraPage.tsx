import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import {
  ClockIcon, AcharyaIcon, CheckCircleIcon, LockIcon,
  CareerIcon, HeartIcon, WealthIcon, LotusIcon,
} from '../../components/Icons/Icons';
import type { IconProps } from '../../components/Icons/Icons';
import pageStyles from '../PageRenderer.module.css';

// A dedicated, professional one-on-one consultation landing page for a named
// astrologer — every piece of copy/photo below reads through t(), so it's
// fully editable from Admin → Content without a code change, same pattern as
// the rest of the site's content-override system (see ContentPage.tsx). No
// numeric experience/review stats are hardcoded here — those are real-world
// claims about a specific person and belong in the admin-entered copy, not a
// code default (see Reviews section below, same honesty rule as
// RaghavBookingPage's "no fabricated testimonials").
const WHY_CHOOSE_ICONS = [ClockIcon, AcharyaIcon, CheckCircleIcon, LockIcon];
const PROBLEM_ICONS = [CareerIcon, HeartIcon, WealthIcon, LotusIcon];

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
};

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <div style={card}>
      <button
        onClick={onToggle}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}
      >
        <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{q}</span>
        <motion.span animate={{ rotate: open ? 45 : 0 }} style={{ fontSize: 'var(--text-lg)', color: 'var(--gold-primary)', flexShrink: 0, marginLeft: 'var(--space-3)' }}>+</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-3)', lineHeight: 1.6 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function RaghavendraPage() {
  const { t, setPage } = useAppContext();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const photo = t('raghavendra_photo');
  const hasPhoto = photo && photo !== 'raghavendra_photo';

  const goBookConsultation = () => {
    setPage('astrologers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const whyChoose = [1, 2, 3, 4].map(i => ({
    Icon: WHY_CHOOSE_ICONS[i - 1],
    title: t(`raghavendra_why_${i}_title`),
    body: t(`raghavendra_why_${i}_body`),
  }));

  const problems = [1, 2, 3, 4].map(i => ({
    Icon: PROBLEM_ICONS[i - 1],
    title: t(`raghavendra_problem_${i}_title`),
    body: t(`raghavendra_problem_${i}_body`),
  }));

  const pricing = [1, 2].map(i => ({
    title: t(`raghavendra_price_${i}_title`),
    duration: t(`raghavendra_price_${i}_duration`),
    price: t(`raghavendra_price_${i}_price`),
    features: [1, 2, 3].map(n => t(`raghavendra_price_${i}_feature${n}`)),
  }));

  const faq = [1, 2, 3, 4].map(i => ({ q: t(`raghavendra_faq_${i}_q`), a: t(`raghavendra_faq_${i}_a`) }));

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Hero */}
      <div style={{
        paddingTop: 'calc(var(--nav-height) + var(--space-10))', paddingBottom: 'var(--space-10)',
        background: 'radial-gradient(circle at 20% 20%, rgba(181,138,59,0.18), transparent 55%), linear-gradient(160deg, #1c0f0c, #3a1a12)',
        position: 'relative', overflow: 'hidden',
      }}>
        <CelestialBackdrop variant="surya" intensity="medium" />
        <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--space-8)' }}>
            <motion.div
              style={{ flex: '1 1 420px' }}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
            >
              <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-primary)' }}>{t('raghavendra_eyebrow')}</span>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, color: '#fff', marginTop: 'var(--space-2)' }}>
                {t('raghavendra_headline')}
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', marginTop: 'var(--space-3)', maxWidth: '480px', lineHeight: 1.6 }}>
                {t('raghavendra_subheadline')}
              </p>
              <button className="btn btn-gold" style={{ marginTop: 'var(--space-6)' }} onClick={goBookConsultation}>
                {t('raghavendra_cta')} →
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ flex: '0 0 auto', width: '176px', height: '176px', borderRadius: '50%', position: 'relative' }}
            >
              <div style={{ position: 'absolute', inset: '-14px', borderRadius: '50%', background: 'conic-gradient(from 0deg, var(--gold-primary), transparent 30%, transparent 70%, var(--gold-primary))', opacity: 0.5 }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', border: '3px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {hasPhoto ? (
                  <img src={photo} alt={t('raghavendra_name')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '4rem', color: 'var(--gold-primary)' }}>{t('raghavendra_name').charAt(0)}</span>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 24px', paddingBottom: 'var(--space-16)' }}>
        {/* Why choose */}
        <div style={{ marginTop: 'var(--space-10)', marginBottom: 'var(--space-10)' }}>
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_why_title')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {whyChoose.map((w, i) => (
              <motion.div key={i} whileHover={{ y: -3 }} style={{ ...card, display: 'flex', gap: 'var(--space-4)' }}>
                <w.Icon size={28} style={{ color: 'var(--gold-primary)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{w.title}</div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>{w.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Problem categories */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_problems_title')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {problems.map((p, i) => (
              <div key={i} style={card}>
                <p.Icon size={30} style={{ color: 'var(--gold-primary)' }} />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginTop: 'var(--space-3)' }}>{p.title}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_pricing_title')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {pricing.map((p, i) => (
              <div key={i} style={{ ...card, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{p.title}</div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>{p.duration}</div>
                <div style={{ fontSize: 'var(--text-xl)', color: 'var(--gold-primary)', fontWeight: 600, marginTop: 'var(--space-3)' }}>{p.price}</div>
                <ul style={{ marginTop: 'var(--space-3)', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {p.features.map((f, fi) => (
                    <li key={fi} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', display: 'flex', gap: 'var(--space-2)' }}>
                      <span style={{ color: 'var(--gold-primary)' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button className="btn btn-gold" style={{ marginTop: 'var(--space-5)' }} onClick={goBookConsultation}>
                  {t('raghavendra_cta')}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 'var(--space-10)' }}>
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_faq_title')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            {faq.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </div>
        </div>

        {/* Reviews — honest empty state rather than fabricated testimonials,
            same rule as RaghavBookingPage. */}
        <div>
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_reviews_title')}</h3>
          <div style={{ ...card, marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>{t('raghavendra_reviews_empty')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
