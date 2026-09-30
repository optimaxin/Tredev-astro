import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { useAstrologer } from '../../hooks/useAstrologer';
import { astrologerService } from '../../services/astrologerService';
import type { ConsultationSlot, MyConsultationSlot } from '../../services/astrologerService';
import { paymentService, PaymentApiError } from '../../services/paymentService';
import { RAGHAV_ASTROLOGER_ID as RAGHAV_ID } from '../../data/raghav';
import pageStyles from '../PageRenderer.module.css';

// A dedicated page for one specific astrologer's real, pay-up-front
// scheduled slots — distinct from the generic ConsultationBookingPage's
// instant chat/voice queue, which every other astrologer still uses.

const TYPE_LABEL: Record<string, string> = { chat: 'Live Chat', voice: 'Voice Call', video: 'Video Call' };

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
};

// Generic, not fabricated per-person claims — real differences between this
// dedicated page and the instant-queue flow every other astrologer uses.
const WHY_CHOOSE = [
  { title: 'A Real Scheduled Time', body: "Pick a slot and it's yours — no waiting in a live queue for whoever's online." },
  { title: 'Classically Trained', body: 'Reads Dashas, transits, and divisional charts the traditional way, not just a quick sun-sign summary.' },
  { title: 'Direct, Not Vague', body: 'Practical guidance you can act on, in plain language — see his profile above for how he puts it himself.' },
  { title: 'Secure Payment, Confirmed Instantly', body: 'Pay through the same gateway every purchase on this site uses — your slot locks the moment payment clears.' },
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Pick a Slot', body: 'Choose a day and time that works for you from the list below.' },
  { step: '2', title: 'Pay Securely', body: 'Confirm the type and price, then pay — same trusted checkout as the rest of the site.' },
  { step: '3', title: 'Get Confirmed', body: "The slot is yours the moment payment clears — you'll see it under Your Upcoming Sessions." },
  { step: '4', title: 'Join at Your Time', body: 'Be ready for your chat/voice/video session at the scheduled time.' },
];

const FAQ: { q: string; a: string }[] = [
  { q: 'Will Raghav personally take my session?', a: 'Yes — every slot on this page is his own calendar, not a generic queue.' },
  { q: 'What if I need to reschedule?', a: "There's no self-serve reschedule yet — reach out through Consult / Contact and we'll help sort it out." },
  { q: 'Is payment secure?', a: 'Yes — bookings go through the same Cashfree/Razorpay checkout used for every purchase on this site; we never see your card details.' },
  { q: 'Is my birth/chart data private?', a: 'Only Raghav sees what he needs for your session. See our Privacy Policy for exactly what\'s collected and why.' },
  { q: 'Can I book a slot for someone else?', a: "Yes, as long as you're the one paying and can be reached to coordinate the session." },
];

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

export default function RaghavBookingPage() {
  const { isLoggedIn, setShowLoginModal, setPendingAction } = useAppContext();
  const { astrologer, loading: profileLoading, notFound } = useAstrologer(RAGHAV_ID);
  const [slots, setSlots] = React.useState<ConsultationSlot[] | null>(null);
  const [mySlots, setMySlots] = React.useState<MyConsultationSlot[] | null>(null);
  const [selected, setSelected] = React.useState<ConsultationSlot | null>(null);
  const [booking, setBooking] = React.useState(false);
  const [bookError, setBookError] = React.useState('');

  const loadSlots = React.useCallback(() => {
    astrologerService.listSlots(RAGHAV_ID).then(setSlots).catch(() => setSlots([]));
  }, []);

  React.useEffect(() => { loadSlots(); }, [loadSlots]);

  React.useEffect(() => {
    if (!isLoggedIn) { setMySlots([]); return; }
    astrologerService.listMySlots().then(setMySlots).catch(() => setMySlots([]));
  }, [isLoggedIn]);

  const myUpcomingWithRaghav = (mySlots ?? []).filter(s => s.astrologerId === RAGHAV_ID);

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

  if (profileLoading) {
    return <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`} style={{ textAlign: 'center', padding: '140px 20px' }}>Loading…</div>;
  }
  if (notFound || !astrologer) {
    return <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`} style={{ textAlign: 'center', padding: '140px 20px' }}>This astrologer isn't available right now.</div>;
  }

  const dayGroups = groupByDay((slots ?? []).filter(s => !s.isBooked));

  return (
    <div className={`${pageStyles.pageWrapper} ${pageStyles.darkPage}`}>
      <div className={pageStyles.container} style={{ maxWidth: '960px' }}>
        {/* Hero */}
        <motion.div
          className={pageStyles.pageHeader}
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        >
          <span className="section-eyebrow-gold">1:1 Vedic Consultation</span>
          <h1 className={pageStyles.pageTitle}>Talk Directly with {astrologer.name}</h1>
          <div className={pageStyles.divider}>✦ ❖ ✦</div>
          <p className={pageStyles.pageSubtitle}>A real, scheduled session — pick your slot, pay securely, and it's confirmed. No queue, no waiting for whoever's online.</p>
          <button
            className="btn btn-gold"
            style={{ marginTop: 'var(--space-5)' }}
            onClick={() => document.getElementById('raghav-slots')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          >
            Schedule a Session →
          </button>
        </motion.div>

        {/* Service details */}
        <div style={{ ...card, display: 'flex', gap: 'var(--space-5)', flexWrap: 'wrap', marginBottom: 'var(--space-8)' }}>
          <div style={{ width: '84px', height: '84px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {astrologer.avatar ? (
              <img src={astrologer.avatar} alt={astrologer.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: 'var(--gold-primary)' }}>{astrologer.name.charAt(0)}</span>
            )}
          </div>
          <div style={{ flex: '1 1 260px' }}>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{astrologer.name}</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gold-primary)' }}>{astrologer.title}</div>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', lineHeight: 1.6 }}>{astrologer.about}</p>
            <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap', marginTop: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
              <span>★ {astrologer.rating.toFixed(1)} ({astrologer.reviews} reviews)</span>
              <span>{astrologer.experience}+ yrs experience</span>
              <span>{astrologer.languages.join(', ')}</span>
              <span>₹{astrologer.price}/min</span>
            </div>
            {astrologer.specialization.length > 0 && (
              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-3)' }}>
                {astrologer.specialization.map(s => (
                  <span key={s} style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '999px', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>{s}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Why choose */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h3 className={pageStyles.contentSectionTitle}>Why Book Through This Page</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
            {WHY_CHOOSE.map(w => (
              <div key={w.title} style={card}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{w.title}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>{w.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* What you can ask about — his real categories */}
        {astrologer.category.length > 0 && (
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h3 className={pageStyles.contentSectionTitle}>What You Can Ask About</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
              {astrologer.category.map(c => (
                <div key={c} style={{ ...card, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--gold-primary)' }}>{c}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* My upcoming bookings with Raghav */}
        {myUpcomingWithRaghav.length > 0 && (
          <div style={{ marginBottom: 'var(--space-8)' }}>
            <h3 className={pageStyles.contentSectionTitle}>Your Upcoming Sessions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
              {myUpcomingWithRaghav.map(s => {
                const { day, time } = formatSlotTime(s.scheduledAt);
                return (
                  <div key={s.id} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                    <div>
                      <div style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-serif)' }}>{day} · {time}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{TYPE_LABEL[s.type]} · {s.durationMinutes} min</div>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gold-primary)' }}>✓ Confirmed</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available slots */}
        <div id="raghav-slots" style={{ scrollMarginTop: 'calc(var(--nav-height) + var(--space-6))' }}>
        <h3 className={pageStyles.contentSectionTitle}>Available Slots</h3>
        {slots === null ? (
          <p className={pageStyles.contentText}>Loading available slots…</p>
        ) : dayGroups.length === 0 ? (
          <p className={pageStyles.contentText}>No open slots right now — check back soon.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', marginTop: 'var(--space-4)' }}>
            {dayGroups.map(group => (
              <div key={group.day}>
                <div style={{ fontSize: 'var(--text-xs)', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-3)' }}>{group.day}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                  {group.slots.map(s => {
                    const { time } = formatSlotTime(s.scheduledAt);
                    return (
                      <button
                        key={s.id}
                        onClick={() => openBooking(s)}
                        style={{ ...card, textAlign: 'left', cursor: 'pointer', padding: 'var(--space-4)' }}
                      >
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{time}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{TYPE_LABEL[s.type]} · {s.durationMinutes} min</div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gold-primary)', marginTop: 'var(--space-2)' }}>₹{s.price}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        </div>

        {/* How it works */}
        <div style={{ margin: 'var(--space-10) 0 var(--space-8)' }}>
          <h3 className={pageStyles.contentSectionTitle}>How Booking Works</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--space-4)', marginTop: 'var(--space-3)' }}>
            {HOW_IT_WORKS.map(s => (
              <div key={s.step} style={card}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', color: 'var(--gold-primary)' }}>{s.step}</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)', marginTop: 'var(--space-1)' }}>{s.title}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <h3 className={pageStyles.contentSectionTitle}>Frequently Asked Questions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginTop: 'var(--space-3)' }}>
            {FAQ.map(f => (
              <div key={f.q} style={card}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{f.q}</div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reviews — honest empty state rather than fabricated testimonials */}
        <div>
          <h3 className={pageStyles.contentSectionTitle}>Reviews</h3>
          {astrologer.reviews > 0 ? (
            <p className={pageStyles.contentText} style={{ marginTop: 'var(--space-3)' }}>★ {astrologer.rating.toFixed(1)} average from {astrologer.reviews} sessions.</p>
          ) : (
            <p className={pageStyles.contentText} style={{ marginTop: 'var(--space-3)' }}>No reviews yet — book a session and be the first to share how it went.</p>
          )}
        </div>
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
                <div>{TYPE_LABEL[selected.type]} · {selected.durationMinutes} minutes</div>
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
