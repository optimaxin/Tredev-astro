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
// One gradient tile per problem category, standing in for a photo — same
// "no stock photos available" constraint the rest of the catalog solves with
// COVER_PATTERNS (see Reports.tsx), not a missing design decision.
const PROBLEM_GRADIENTS = [
  'linear-gradient(135deg, #2b4c6f, #5b8fb9)',
  'linear-gradient(135deg, #6b2b4f, #b95b8f)',
  'linear-gradient(135deg, #4c3a1e, #c8a15a)',
  'linear-gradient(135deg, #1e4c3a, #5ab98a)',
];

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
};

// Pricing section's own warm cream/brown/orange palette — deliberately
// distinct from the site's gold-on-dark theme, to match the reference
// consultation-package cards (see the user's screenshot).
const PRICING_BROWN = '#5c3a21';
const PRICING_ORANGE = '#e8912c';
const PRICING_TAN = '#e9c99a';

const pricingButtonStyle: React.CSSProperties = {
  background: PRICING_ORANGE, color: '#2a1a0e', fontWeight: 700, border: 'none',
  borderRadius: 'var(--radius-sm)', padding: '10px 20px', cursor: 'pointer', fontSize: 'var(--text-sm)',
};

function AvatarCircle({ photo, name, size }: { photo: string; name: string; size: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: PRICING_TAN, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {photo ? <img src={photo} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <AcharyaIcon size={size * 0.6} style={{ color: PRICING_BROWN }} />}
    </div>
  );
}

function PillGroup({ label, options, active }: { label: string; options: string[]; active: number }) {
  return (
    <div>
      <div style={{ fontSize: '11px', fontWeight: 700, color: PRICING_BROWN, marginBottom: '4px' }}>{label}:</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {options.map((o, i) => (
          <span
            key={o}
            style={{
              fontSize: '11px', padding: '5px 12px', borderRadius: '6px', border: `1px solid ${PRICING_BROWN}`,
              background: i === active ? PRICING_BROWN : 'transparent',
              color: i === active ? '#fff' : PRICING_BROWN,
            }}
          >
            {o}
          </span>
        ))}
      </div>
    </div>
  );
}

function FaqItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  return (
    <motion.div style={card} whileHover={{ y: -2, borderColor: 'var(--gold-primary)' }}>
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
    </motion.div>
  );
}

function PricingButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.05, boxShadow: '0 6px 18px rgba(232,145,44,0.4)' }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      style={pricingButtonStyle}
    >
      {children}
    </motion.button>
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
    gradient: PROBLEM_GRADIENTS[i - 1],
    title: t(`raghavendra_problem_${i}_title`),
    body: t(`raghavendra_problem_${i}_body`),
  }));

  const pricing = [1, 2].map(i => ({
    title: t(`raghavendra_price_${i}_title`),
    subtitle: t(`raghavendra_price_${i}_subtitle`),
    mode: t(`raghavendra_price_${i}_mode`),
    duration: t(`raghavendra_price_${i}_duration`),
    type: t(`raghavendra_price_${i}_type`),
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
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, lineHeight: 1.15, color: '#fff', marginTop: 'var(--space-3)', marginBottom: 0 }}>
                {t('raghavendra_headline')}
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', marginTop: 'var(--space-4)', maxWidth: '480px', lineHeight: 1.6 }}>
                {t('raghavendra_subheadline')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
                {[1, 2, 3].map(n => (
                  <span key={n} style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}>
                    {t(`raghavendra_badge_${n}`)}
                  </span>
                ))}
              </div>
              <motion.button
                className="btn btn-gold" style={{ marginTop: 'var(--space-6)' }} onClick={goBookConsultation}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              >
                {t('raghavendra_cta')} →
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ flex: '0 0 auto', width: '220px', height: '220px', borderRadius: '50%', position: 'relative', margin: '0 auto' }}
            >
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: '-14px', borderRadius: '50%', background: 'conic-gradient(from 0deg, var(--gold-primary), transparent 30%, transparent 70%, var(--gold-primary))', opacity: 0.5 }}
              />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', border: '3px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {hasPhoto ? (
                  <img src={photo} alt={t('raghavendra_name')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <AcharyaIcon size={88} style={{ color: 'var(--gold-primary)' }} />
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
        <motion.div
          style={{ marginBottom: 'var(--space-10)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_problems_title')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {problems.map((p, i) => (
              <motion.div key={i} whileHover={{ y: -4, boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ height: '110px', background: p.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p.Icon size={34} style={{ color: '#fff' }} />
                </div>
                <div style={{ padding: 'var(--space-5)' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{p.title}</div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>{p.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Pricing — warm cream cards, close to the reference's consultation-package layout */}
        <motion.div
          style={{
            marginBottom: 'var(--space-10)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-8) var(--space-6)',
            background: '#fbf3e3',
          }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 400, fontSize: 'clamp(1.6rem, 3.4vw, 2.4rem)', margin: 0, color: PRICING_BROWN }}>
              {t('raghavendra_pricing_title')} <span style={{ color: PRICING_ORANGE }}>{t('raghavendra_pricing_title_accent')}</span>
            </h3>
            <p style={{ color: PRICING_BROWN, opacity: 0.75, marginTop: 'var(--space-2)' }}>{t('raghavendra_pricing_subtitle')}</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-5)', marginTop: 'var(--space-6)', alignItems: 'start' }}>
            {/* Compact package card */}
            <div style={{ background: '#fdf6ec', border: `1px solid ${PRICING_TAN}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', paddingBottom: 'var(--space-3)', borderBottom: `1px solid ${PRICING_TAN}` }}>
                <AvatarCircle photo={hasPhoto ? photo : ''} name={t('raghavendra_name')} size={44} />
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: PRICING_BROWN }}>{pricing[0].title}</div>
              </div>
              <p style={{ fontSize: 'var(--text-sm)', color: PRICING_BROWN, opacity: 0.8, marginTop: 'var(--space-3)' }}>{pricing[0].subtitle}</p>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                <PillGroup label={t('raghavendra_label_mode')} options={[t('raghavendra_label_normal'), t('raghavendra_label_urgent')]} active={0} />
                <PillGroup label={t('raghavendra_label_duration')} options={[pricing[0].duration]} active={0} />
                <PillGroup label={t('raghavendra_label_type')} options={[pricing[0].type]} active={0} />
              </div>

              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: PRICING_BROWN, marginTop: 'var(--space-4)' }}>{t('raghavendra_label_includes')}</div>
              <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {pricing[0].features.map((f, fi) => (
                  <li key={fi} style={{ fontSize: 'var(--text-sm)', color: PRICING_BROWN, opacity: 0.85, display: 'flex', gap: 'var(--space-2)' }}>
                    <span>•</span> {f}
                  </li>
                ))}
              </ul>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-5)' }}>
                <span style={{ fontSize: 'var(--text-base)', color: PRICING_BROWN }}>{t('raghavendra_label_price')}: <strong>{pricing[0].price}</strong></span>
                <PricingButton onClick={goBookConsultation}>{t('raghavendra_cta_short')}</PricingButton>
              </div>
            </div>

            {/* Featured package card, with photo */}
            <div style={{ background: '#fdf6ec', border: `1px solid ${PRICING_TAN}`, borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)' }}>
              <div style={{ borderRadius: 'var(--radius-md)', overflow: 'hidden', height: '220px', background: hasPhoto ? undefined : 'linear-gradient(135deg, #e9c99a, #c8935a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {hasPhoto ? (
                  <img src={photo} alt={t('raghavendra_name')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <AcharyaIcon size={64} style={{ color: '#fff' }} />
                )}
              </div>
              <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: PRICING_BROWN }}>{pricing[1].title}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: PRICING_BROWN, opacity: 0.8, marginTop: 'var(--space-1)' }}>{pricing[1].subtitle}</p>
              </div>

              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: PRICING_BROWN, marginTop: 'var(--space-4)' }}>{t('raghavendra_label_what_you_get')}</div>
              <ul style={{ marginTop: 'var(--space-2)', paddingLeft: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                {pricing[1].features.map((f, fi) => (
                  <li key={fi} style={{ fontSize: 'var(--text-sm)', color: PRICING_BROWN, opacity: 0.85, display: 'flex', gap: 'var(--space-2)' }}>
                    <span style={{ color: PRICING_ORANGE }}>✓</span> {f}
                  </li>
                ))}
              </ul>

              <div style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: PRICING_BROWN, marginTop: 'var(--space-4)' }}>{t('raghavendra_label_details')}</div>
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)', color: PRICING_BROWN, opacity: 0.85 }}>
                <span>⏱ {pricing[1].duration}</span>
                <span>💻 {pricing[1].type}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-5)' }}>
                <span style={{ fontSize: 'var(--text-base)', color: PRICING_BROWN }}>{t('raghavendra_label_price')}: <strong>{pricing[1].price}</strong></span>
                <PricingButton onClick={goBookConsultation}>{t('raghavendra_cta_short')}</PricingButton>
              </div>
            </div>
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          style={{ marginBottom: 'var(--space-10)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_faq_title')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            {faq.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </div>
        </motion.div>

        {/* Reviews — honest empty state rather than fabricated testimonials,
            same rule as RaghavBookingPage. */}
        <motion.div
          style={{ marginBottom: 'var(--space-10)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>{t('raghavendra_reviews_title')}</h3>
          <div style={{ ...card, marginTop: 'var(--space-4)', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-muted)' }}>{t('raghavendra_reviews_empty')}</p>
          </div>
        </motion.div>

        {/* Final CTA band */}
        <motion.div
          style={{
            borderRadius: 'var(--radius-xl)', padding: 'var(--space-10) var(--space-6)', textAlign: 'center',
            background: 'radial-gradient(circle at 50% 0%, rgba(181,138,59,0.16), transparent 60%), linear-gradient(160deg, #1c0f0c, #3a1a12)',
          }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 style={{ fontFamily: 'var(--font-serif)', fontWeight: 300, fontSize: 'clamp(1.4rem, 3vw, 2rem)', color: '#fff', margin: 0 }}>
            {t('raghavendra_final_cta_title')}
          </h3>
          <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: 'var(--space-3)', maxWidth: '520px', marginLeft: 'auto', marginRight: 'auto' }}>
            {t('raghavendra_final_cta_body')}
          </p>
          <motion.button
            className="btn btn-gold" style={{ marginTop: 'var(--space-6)' }} onClick={goBookConsultation}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          >
            {t('raghavendra_cta')} →
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
