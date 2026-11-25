import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { useAstrologer, useFeaturedAstrologerId } from '../../hooks/useAstrologer';
import { astrologerService } from '../../services/astrologerService';
import type { ConsultationSlot, MyConsultationSlot } from '../../services/astrologerService';
import { paymentService, PaymentApiError } from '../../services/paymentService';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import {
  ClockIcon, AcharyaIcon, CheckCircleIcon, LockIcon, ChatBubbleIcon, PhoneCallIcon, VideoCameraIcon,
  CareerIcon, HeartIcon, WealthIcon, LotusIcon,
} from '../../components/Icons/Icons';
import type { IconProps } from '../../components/Icons/Icons';
import pageStyles from '../PageRenderer.module.css';

// A dedicated page for one specific astrologer's real, pay-up-front
// scheduled slots — distinct from the generic ConsultationBookingPage's
// instant chat/voice queue, which every other astrologer still uses.

const TYPE_META: Record<string, { label: string; Icon: React.ComponentType<IconProps> }> = {
  chat: { label: 'Live Chat', Icon: ChatBubbleIcon },
  voice: { label: 'Voice Call', Icon: PhoneCallIcon },
  video: { label: 'Video Call', Icon: VideoCameraIcon },
};

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
};

// Generic, not fabricated per-person claims — real differences between this
// dedicated page and the instant-queue flow every other astrologer uses.
const WHY_CHOOSE = [
  { Icon: ClockIcon, title: 'A Real Scheduled Time', body: "Pick a slot and it's yours — no waiting in a live queue for whoever's online." },
  { Icon: AcharyaIcon, title: 'Classically Trained', body: 'Reads Dashas, transits, and divisional charts the traditional way, not just a quick sun-sign summary.' },
  { Icon: CheckCircleIcon, title: 'Direct, Not Vague', body: 'Practical guidance you can act on, in plain language.' },
  { Icon: LockIcon, title: 'Secure, Confirmed Instantly', body: 'Pay through the same trusted checkout as the rest of the site — your slot locks the moment payment clears.' },
];

const HOW_IT_WORKS = [
  { title: 'Pick a Slot', body: 'Choose a day and time that works for you from the list below.' },
  { title: 'Pay Securely', body: 'Confirm the type and price, then pay — same trusted checkout as the rest of the site.' },
  { title: 'Get Confirmed', body: "The slot is yours the moment payment clears — you'll see it under Your Upcoming Sessions." },
  { title: 'Join at Your Time', body: 'Be ready for your chat/voice/video session at the scheduled time.' },
];

// Generic "what are you looking for guidance on" prompts — same honest,
// not-fabricated-claims rule as WHY_CHOOSE above; just a professional
// framing section, not specific promises tied to any one session.
const PROBLEM_CATEGORIES = [
  { Icon: CareerIcon, gradient: 'linear-gradient(135deg, #2b4c6f, #5b8fb9)', title: 'Career', body: 'Should I change jobs now? Is this the right time to start my own venture? Will this promotion come through?' },
  { Icon: HeartIcon, gradient: 'linear-gradient(135deg, #6b2b4f, #b95b8f)', title: 'Love & Relationships', body: 'Is this relationship right for me? Why does marriage keep getting delayed? How do I fix a strained relationship?' },
  { Icon: WealthIcon, gradient: 'linear-gradient(135deg, #4c3a1e, #c8a15a)', title: 'Money & Growth', body: 'When will my finances stabilize? Is this investment the right move? How do I plan for long-term wealth?' },
  { Icon: LotusIcon, gradient: 'linear-gradient(135deg, #1e4c3a, #5ab98a)', title: 'Health & Inner Peace', body: 'Why do I feel stuck or anxious lately? What remedies can bring more balance? How do I plan around a health concern?' },
];

function buildFaq(name: string): { q: string; a: string }[] {
  return [
    { q: `Will ${name} personally take my session?`, a: 'Yes — every slot on this page is their own calendar, not a generic queue.' },
    { q: 'What if I need to reschedule?', a: "There's no self-serve reschedule yet — reach out through Consult / Contact and we'll help sort it out." },
    { q: 'Is payment secure?', a: 'Yes — bookings go through the same Cashfree/Razorpay checkout used for every purchase on this site; we never see your card details.' },
    { q: 'Is my birth/chart data private?', a: `Only ${name} sees what they need for your session. See our Privacy Policy for exactly what's collected and why.` },
    { q: 'Can I book a slot for someone else?', a: "Yes, as long as you're the one paying and can be reached to coordinate the session." },
  ];
}

function formatSlotTime(ms: number): { day: string; time: string } {
  const d = new Date(ms);
  return {
    day: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
  };
}

function groupByDay(slots: ConsultationSlot[]): { day: string; slots: ConsultationSlot[] }[] {
  const groups = new Map<string, ConsultationSlot[]>();
  for (const s of slots) {
    const { day } = formatSlotTime(s.scheduledAt);
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(s);
  }
  return Array.from(groups.entries()).map(([day, slots]) => ({ day, slots }));
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

export default function RaghavBookingPage() {
  const { isLoggedIn, setShowLoginModal, setPendingAction } = useAppContext();
  // The site's current Featured/Celebrity Astrologer — admin-configurable
  // (see FeaturedAstrologerPage.tsx), not a hardcoded id. undefined = still
  // loading which astrologer that is; null = none is currently set.
  const featuredId = useFeaturedAstrologerId();
  const { astrologer, loading: profileLoading, notFound } = useAstrologer(featuredId);
  const [slots, setSlots] = React.useState<ConsultationSlot[] | null>(null);
  const [mySlots, setMySlots] = React.useState<MyConsultationSlot[] | null>(null);
  const [selected, setSelected] = React.useState<ConsultationSlot | null>(null);
  const [booking, setBooking] = React.useState(false);
  const [bookError, setBookError] = React.useState('');
  const [openFaq, setOpenFaq] = React.useState<number | null>(0);

  const loadSlots = React.useCallback(() => {
    if (!featuredId) return;
    astrologerService.listSlots(featuredId).then(setSlots).catch(() => setSlots([]));
  }, [featuredId]);

  React.useEffect(() => { loadSlots(); }, [loadSlots]);

  React.useEffect(() => {
    if (!isLoggedIn) { setMySlots([]); return; }
    astrologerService.listMySlots().then(setMySlots).catch(() => setMySlots([]));
  }, [isLoggedIn]);

  const myUpcomingWithRaghav = (mySlots ?? []).filter(s => s.astrologerId === featuredId);

  const openBooking = (slot: ConsultationSlot) => {
    if (!isLoggedIn) {
      setPendingAction('raghav-booking');
      setShowLoginModal(true);
      return;
    }
    setBookError('');
    setSelected(slot);
  };

  const confirmAndPay = async () => {
    if (!selected) return;
    setBooking(true);
    setBookError('');
    try {
      await paymentService.pay({ purpose: 'SLOT_BOOKING', slotId: selected.id });
      // paymentService.pay redirects the whole tab to the gateway — this
      // line only runs if that redirect itself failed to kick off.
    } catch (e) {
      setBookError(e instanceof PaymentApiError ? e.message : 'Could not start payment. Please try again.');
      setBooking(false);
    }
  };

  if (featuredId === undefined || profileLoading) {
    return <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`} style={{ textAlign: 'center', padding: '140px 20px' }}>Loading…</div>;
  }
  if (notFound || !astrologer) {
    return <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`} style={{ textAlign: 'center', padding: '140px 20px' }}>This astrologer isn't available right now.</div>;
  }

  const dayGroups = groupByDay((slots ?? []).filter(s => !s.isBooked));
  const faq = buildFaq(astrologer.name);
  const tags = Array.from(new Set([...astrologer.specialization, ...astrologer.category]));

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
              <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-primary)' }}>1:1 Vedic Consultation</span>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, color: '#fff', marginTop: 'var(--space-2)' }}>
                Talk Directly with {astrologer.name}
              </h1>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', marginTop: 'var(--space-3)', maxWidth: '480px', lineHeight: 1.6 }}>
                {astrologer.about}
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', marginTop: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.65)' }}>
                <span>★ {astrologer.rating.toFixed(1)} ({astrologer.reviews} reviews)</span>
                <span>{astrologer.experience}+ yrs experience</span>
                <span>{astrologer.languages.join(', ')}</span>
                <span style={{ color: 'var(--gold-primary)' }}>₹{astrologer.price}/min</span>
              </div>
              {tags.length > 0 && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-4)' }}>
                  {tags.map(t => (
                    <span key={t} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.85)' }}>{t}</span>
                  ))}
                </div>
              )}
              <motion.button
                className="btn btn-gold"
                style={{ marginTop: 'var(--space-6)' }}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                onClick={() => document.getElementById('raghav-slots')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Schedule a Session →
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ flex: '0 0 auto', width: '200px', height: '200px', borderRadius: '50%', position: 'relative', margin: '0 auto' }}
            >
              <motion.div
                animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
                style={{ position: 'absolute', inset: '-14px', borderRadius: '50%', background: 'conic-gradient(from 0deg, var(--gold-primary), transparent 30%, transparent 70%, var(--gold-primary))', opacity: 0.5 }}
              />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', border: '3px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {astrologer.avatar ? (
                  <img src={astrologer.avatar} alt={astrologer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '4rem', color: 'var(--gold-primary)' }}>{astrologer.name.charAt(0)}</span>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '0 24px', paddingBottom: 'var(--space-16)' }}>
        {/* Why choose */}
        <div style={{ marginTop: 'var(--space-10)', marginBottom: 'var(--space-10)' }}>
          <h3 className={pageStyles.contentSectionTitle}>Why Book Through This Page</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {WHY_CHOOSE.map(w => (
              <motion.div key={w.title} whileHover={{ y: -3 }} style={{ ...card, display: 'flex', gap: 'var(--space-4)' }}>
                <w.Icon size={28} style={{ color: 'var(--gold-primary)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{w.title}</div>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-1)', lineHeight: 1.5 }}>{w.body}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Problem categories — generic "what are you seeking clarity on" framing */}
        <motion.div
          style={{ marginBottom: 'var(--space-10)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>What Would You Like Clarity On?</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {PROBLEM_CATEGORIES.map(p => (
              <motion.div key={p.title} whileHover={{ y: -4, boxShadow: '0 10px 24px rgba(0,0,0,0.12)' }} style={{ ...card, padding: 0, overflow: 'hidden' }}>
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

        {/* My upcoming bookings with Raghav */}
        {myUpcomingWithRaghav.length > 0 && (
          <motion.div
            style={{ marginBottom: 'var(--space-10)' }}
            initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
          >
            <h3 className={pageStyles.contentSectionTitle}>Your Upcoming Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
              {myUpcomingWithRaghav.map(s => {
                const { day, time } = formatSlotTime(s.scheduledAt);
                const Meta = TYPE_META[s.type];
                return (
                  <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)', borderLeft: '3px solid var(--gold-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      <Meta.Icon size={22} style={{ color: 'var(--gold-primary)' }} />
                      <div>
                        <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>{day} · {time}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{Meta.label} · {s.durationMinutes} min</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gold-primary)' }}>✓ Confirmed</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Available slots */}
        <motion.div
          id="raghav-slots" style={{ scrollMarginTop: 'calc(var(--nav-height) + var(--space-6))', marginBottom: 'var(--space-10)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>Available Slots</h3>
          {slots === null ? (
            <p className={pageStyles.contentText} style={{ marginTop: 'var(--space-4)' }}>Loading available slots…</p>
          ) : dayGroups.length === 0 ? (
            <p className={pageStyles.contentText} style={{ marginTop: 'var(--space-4)' }}>No open slots right now — check back soon.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
              {dayGroups.map(group => (
                <div key={group.day}>
                  <div style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>{group.day}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                    {group.slots.map(s => {
                      const { time } = formatSlotTime(s.scheduledAt);
                      const Meta = TYPE_META[s.type];
                      return (
                        <motion.button
                          key={s.id} whileHover={{ y: -3, borderColor: 'var(--gold-primary)' }}
                          onClick={() => openBooking(s)}
                          style={{ ...card, textAlign: 'left', cursor: 'pointer', padding: 'var(--space-4)' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--gold-primary)' }}>
                            <Meta.Icon size={18} />
                            <span style={{ fontSize: 'var(--text-xs)' }}>{Meta.label}</span>
                          </div>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)', marginTop: 'var(--space-2)' }}>{time}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-2)' }}>
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{s.durationMinutes} min</span>
                            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>₹{s.price}</span>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* How it works */}
        <motion.div
          style={{ marginBottom: 'var(--space-10)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>How Booking Works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.title} style={card}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%', border: '1px solid var(--gold-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--gold-primary)',
                }}>{i + 1}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginTop: 'var(--space-3)' }}>{s.title}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* FAQ */}
        <motion.div
          style={{ marginBottom: 'var(--space-10)' }}
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>Frequently Asked Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
            {faq.map((f, i) => (
              <FaqItem key={f.q} q={f.q} a={f.a} open={openFaq === i} onToggle={() => setOpenFaq(openFaq === i ? null : i)} />
            ))}
          </div>
        </motion.div>

        {/* Reviews — honest empty state rather than fabricated testimonials */}
        <motion.div
          initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
        >
          <h3 className={pageStyles.contentSectionTitle}>Reviews</h3>
          <div style={{ ...card, marginTop: 'var(--space-4)', textAlign: 'center' }}>
            {astrologer.reviews > 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>★ {astrologer.rating.toFixed(1)} average from {astrologer.reviews} sessions.</p>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>No reviews yet — book a session and be the first to share how it went.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Booking confirmation panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}
            onClick={() => !booking && setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', maxWidth: '420px', width: '100%', padding: 'var(--space-6)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', color: 'var(--text-primary)', marginBottom: 'var(--space-4)' }}>Confirm Your Booking</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                <div>With <strong style={{ color: 'var(--text-primary)' }}>{astrologer.name}</strong></div>
                <div>{formatSlotTime(selected.scheduledAt).day} at {formatSlotTime(selected.scheduledAt).time}</div>
                <div>{TYPE_META[selected.type].label} · {selected.durationMinutes} minutes</div>
                <div style={{ fontSize: 'var(--text-lg)', color: 'var(--gold-primary)', marginTop: 'var(--space-2)' }}>₹{selected.price}</div>
              </div>
              {bookError && <p style={{ color: '#c0392b', fontSize: 'var(--text-sm)', marginTop: 'var(--space-3)' }}>{bookError}</p>}
              <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
                <button className="btn btn-gold" style={{ flex: 1 }} disabled={booking} onClick={confirmAndPay}>
                  {booking ? 'Redirecting…' : `Pay ₹${selected.price} & Book`}
                </button>
                <button className="btn" disabled={booking} onClick={() => setSelected(null)}>Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
