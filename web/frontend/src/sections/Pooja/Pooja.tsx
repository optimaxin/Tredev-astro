import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { poojaService } from '../../services/poojaService';
import type { PoojaBook, PoojaGroupSession, PoojaVideo } from '../../services/poojaService';
import { AcharyaIcon, BellIcon, FlameIcon, ManuscriptIcon, PlayIcon } from '../../components/Icons/Icons';
import type { IconProps } from '../../components/Icons/Icons';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';

type Tab = 'recorded' | 'group' | 'pandit' | 'library';

const TABS: { key: Tab; label: string; Icon: React.ComponentType<IconProps> }[] = [
  { key: 'recorded', label: 'Recorded Pooja', Icon: PlayIcon },
  { key: 'group', label: 'Group Pooja', Icon: FlameIcon },
  { key: 'pandit', label: 'Book a Pooja', Icon: AcharyaIcon },
  { key: 'library', label: 'Library', Icon: ManuscriptIcon },
];

const POOJA_TYPES = ['Griha Pravesh', 'Satyanarayan', 'Navgraha Shanti', 'Rudrabhishek', 'Vastu Shanti'];

const card: React.CSSProperties = {
  background: 'var(--surface)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
};

function embedUrl(url: string): string {
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return yt ? `https://www.youtube.com/embed/${yt[1]}` : url;
}

// Synthesized temple bell (ghanti) — inharmonic partials (a real bell's
// overtones aren't whole-number multiples of the fundamental, which is what
// makes it sound metallic rather than like a pure tone) each decaying at a
// different rate, so the "clang" shimmers and thins out over ~2.5s. No audio
// file to host — Web Audio API only, works offline.
let sharedAudioCtx: AudioContext | null = null;
function playTempleBell() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = sharedAudioCtx ?? (sharedAudioCtx = new Ctx());
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const fundamental = 285;
    const partials = [1, 1.5, 2.0, 2.4, 3.0, 4.2];
    const master = ctx.createGain();
    master.gain.value = 0.32;
    master.connect(ctx.destination);
    partials.forEach((ratio, i) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = fundamental * ratio;
      const gain = ctx.createGain();
      const decay = 2.2 + i * 0.2;
      gain.gain.setValueAtTime(1 / (i + 1), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + decay);
      osc.connect(gain).connect(master);
      osc.start(now);
      osc.stop(now + decay + 0.1);
    });
  } catch {
    // Web Audio unsupported/blocked — the bell is decorative, never worth surfacing an error for.
  }
}

function TempleBell({ style }: { style?: React.CSSProperties }) {
  const [ringing, setRinging] = React.useState(false);
  return (
    <motion.button
      onClick={() => { playTempleBell(); setRinging(true); }}
      onAnimationComplete={() => setRinging(false)}
      animate={ringing ? { rotate: [0, -18, 14, -10, 6, -3, 0] } : {}}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      aria-label="Ring the temple bell"
      title="Ring the temple bell"
      style={{
        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '999px',
        width: '52px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--gold-primary)', cursor: 'pointer', flexShrink: 0,
        ...style,
      }}
    >
      <BellIcon size={22} />
    </motion.button>
  );
}

function useCountdown(target: number | null) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    if (target === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (target === null) return null;
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86_400_000);
  const h = Math.floor((diff % 86_400_000) / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return { d, h, m, s, isLive: diff === 0 };
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div style={{ textAlign: 'center', minWidth: '52px' }}>
      <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{String(value).padStart(2, '0')}</div>
      <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)' }}>{label}</div>
    </div>
  );
}

function VideoModal({ video, onClose }: { video: PoojaVideo; onClose: () => void }) {
  const isEmbed = /youtu\.?be/.test(video.videoUrl);
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', maxWidth: '860px', width: '100%', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
          {isEmbed ? (
            <iframe src={embedUrl(video.videoUrl)} title={video.title} allow="autoplay; encrypted-media" allowFullScreen
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
          ) : (
            <video src={video.videoUrl} controls autoPlay style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />
          )}
        </div>
        <div style={{ padding: 'var(--space-4) var(--space-5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{video.title}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{video.category}</div>
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function BookModal({ book, onClose }: { book: PoojaBook; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--space-4)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.94 }}
        style={{ background: 'var(--surface)', borderRadius: 'var(--radius-xl)', maxWidth: '640px', width: '100%', maxHeight: '80vh', overflowY: 'auto', padding: 'var(--space-6)' }}
        onClick={e => e.stopPropagation()}
      >
        {book.coverImageUrl && (
          <img src={book.coverImageUrl} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)' }} />
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-xl)', color: 'var(--text-primary)' }}>{book.title}</div>
            {book.author && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{book.author}</div>}
          </div>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
        {book.content && <p style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>{book.content}</p>}
        {book.pdfUrl && <a href={book.pdfUrl} target="_blank" rel="noreferrer" className="btn btn-gold" style={{ display: 'inline-block', marginTop: 'var(--space-3)' }}>Open PDF</a>}
      </motion.div>
    </motion.div>
  );
}

function FilterChips({ options, active, onChange }: { options: string[]; active: string; onChange: (v: string) => void }) {
  if (options.length <= 1) return null;
  return (
    <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginBottom: 'var(--space-5)' }}>
      {['All', ...options].map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          style={{
            padding: '6px 14px', borderRadius: '999px', fontSize: 'var(--text-xs)', cursor: 'pointer',
            background: active === opt ? 'var(--text-primary)' : 'transparent',
            color: active === opt ? '#fff' : 'var(--text-secondary)',
            border: `1px solid ${active === opt ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
          }}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function GroupSessionHero({ session, joining, onJoin }: { session: PoojaGroupSession; joining: boolean; onJoin: () => void }) {
  const cd = useCountdown(session.scheduledAt);
  const seatsLeft = session.capacity != null ? Math.max(0, session.capacity - session.registeredCount) : null;
  const pctFull = session.capacity ? Math.min(100, Math.round((session.registeredCount / session.capacity) * 100)) : null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      style={{
        borderRadius: 'var(--radius-xl)', padding: 'var(--space-8)', marginBottom: 'var(--space-8)',
        background: 'linear-gradient(135deg, #2b1512 0%, #4a1f14 55%, #7a3a1a 100%)', position: 'relative', overflow: 'hidden',
      }}
    >
      <FlameIcon size={220} style={{ position: 'absolute', top: '-40px', right: '-40px', opacity: 0.08, color: '#fff' }} />
      <div style={{ position: 'relative', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-6)', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ maxWidth: '440px' }}>
          <span style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-primary)' }}>
            {cd?.isLive ? '● Live now' : 'Next Group Pooja'}
          </span>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', color: '#fff', marginTop: 'var(--space-2)', fontWeight: 300 }}>{session.title}</h3>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-1)' }}>with {session.panditName}</p>
          {pctFull !== null && (
            <div style={{ marginTop: 'var(--space-4)' }}>
              <div style={{ height: '6px', borderRadius: '999px', background: 'rgba(255,255,255,0.15)', overflow: 'hidden' }}>
                <motion.div initial={{ width: 0 }} animate={{ width: `${pctFull}%` }} style={{ height: '100%', background: 'var(--gold-primary)' }} />
              </div>
              <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)' }}>
                {seatsLeft === 0 ? 'Full' : `${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left`} · {session.registeredCount} joined
              </span>
            </div>
          )}
        </div>
        {cd && !cd.isLive && (
          <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
            <CountdownUnit value={cd.d} label="Days" /><CountdownUnit value={cd.h} label="Hrs" /><CountdownUnit value={cd.m} label="Min" /><CountdownUnit value={cd.s} label="Sec" />
          </div>
        )}
        {session.registered ? (
          session.meetingUrl ? (
            <a href={session.meetingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">Join Live</a>
          ) : (
            <span style={{ color: 'var(--gold-primary)', fontSize: 'var(--text-sm)' }}>✓ You're registered</span>
          )
        ) : (
          <button className="btn btn-gold" disabled={joining || seatsLeft === 0} onClick={onJoin}>
            {joining ? 'Joining…' : seatsLeft === 0 ? 'Full' : 'Join'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function PoojaSection() {
  const { isLoggedIn, setShowLoginModal, setPendingAction, setPage, setAstrologerFilter } = useAppContext();
  const [tab, setTab] = React.useState<Tab>('recorded');
  const [videos, setVideos] = React.useState<PoojaVideo[] | null>(null);
  const [sessions, setSessions] = React.useState<PoojaGroupSession[] | null>(null);
  const [books, setBooks] = React.useState<PoojaBook[] | null>(null);
  const [videoFilter, setVideoFilter] = React.useState('All');
  const [bookFilter, setBookFilter] = React.useState('All');
  const [activeVideo, setActiveVideo] = React.useState<PoojaVideo | null>(null);
  const [activeBook, setActiveBook] = React.useState<PoojaBook | null>(null);
  const [joining, setJoining] = React.useState<string | null>(null);
  const [joinError, setJoinError] = React.useState('');

  React.useEffect(() => {
    if (tab === 'recorded' && videos === null) poojaService.listVideos().then(setVideos).catch(() => setVideos([]));
    if (tab === 'group' && sessions === null) poojaService.listSessions().then(setSessions).catch(() => setSessions([]));
    if (tab === 'library' && books === null) poojaService.listBooks().then(setBooks).catch(() => setBooks([]));
  }, [tab, videos, sessions, books]);

  const requireLogin = (): boolean => {
    if (isLoggedIn) return true;
    setPendingAction('pooja');
    setShowLoginModal(true);
    return false;
  };

  const handleJoin = async (session: PoojaGroupSession) => {
    if (!requireLogin()) return;
    setJoinError('');
    setJoining(session.id);
    try {
      const updated = await poojaService.joinSession(session.id);
      setSessions(prev => prev ? prev.map(s => (s.id === session.id ? { ...s, ...updated, registeredCount: s.registeredCount + (s.registered ? 0 : 1) } : s)) : prev);
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Could not join this session.');
    } finally {
      setJoining(null);
    }
  };

  const browsePandits = () => {
    if (!requireLogin()) return;
    setAstrologerFilter('Pooja');
    setPage('astrologers');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const videoCategories = React.useMemo(() => Array.from(new Set((videos ?? []).map(v => v.category))), [videos]);
  const shownVideos = videoFilter === 'All' ? (videos ?? []) : (videos ?? []).filter(v => v.category === videoFilter);
  const [featuredVideo, ...restVideos] = shownVideos;

  const bookCategories = React.useMemo(() => Array.from(new Set((books ?? []).map(b => b.category))), [books]);
  const shownBooks = bookFilter === 'All' ? (books ?? []) : (books ?? []).filter(b => b.category === bookFilter);

  const [heroSession, ...otherSessions] = sessions ?? [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: 'var(--space-16)' }}>
      {/* Hero band */}
      <div style={{
        paddingTop: 'calc(var(--nav-height) + var(--space-10))', paddingBottom: 'var(--space-10)',
        background: 'radial-gradient(circle at 20% 20%, rgba(181,138,59,0.18), transparent 55%), linear-gradient(160deg, #1c0f0c, #3a1a12)',
        position: 'relative', overflow: 'hidden',
      }}>
        <CelestialBackdrop variant="mandala" intensity="medium" />
        <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px', position: 'relative' }}>
          <TempleBell style={{ position: 'absolute', top: 0, right: '24px' }} />
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 'var(--space-6)' }}>
            <div style={{ flex: '1 1 360px' }}>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                <span style={{ fontSize: '10px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-primary)' }}>Pooja</span>
                <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: 300, color: '#fff', marginTop: 'var(--space-2)' }}>Pooja &amp; Rituals</h1>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'rgba(255,255,255,0.7)', marginTop: 'var(--space-2)', maxWidth: '560px' }}>
                  Watch a recorded aarti, join a live group pooja, Book a Pooja for your own ritual, or read from our aarti &amp; book library.
                </p>
              </motion.div>

              <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', marginTop: 'var(--space-8)' }}>
                {TABS.map(item => (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    style={{ position: 'relative', padding: '10px 18px', borderRadius: '999px', border: 'none', cursor: 'pointer', background: 'transparent', color: tab === item.key ? '#1c0f0c' : 'rgba(255,255,255,0.8)', fontSize: 'var(--text-sm)', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: '7px' }}
                  >
                    {tab === item.key && (
                      <motion.span layoutId="pooja-tab-pill" transition={{ type: 'spring', duration: 0.4 }}
                        style={{ position: 'absolute', inset: 0, borderRadius: '999px', background: 'var(--gold-primary)', zIndex: -1 }} />
                    )}
                    <item.Icon size={16} />{item.label}
                  </button>
                ))}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8, delay: 0.1 }}
              style={{
                position: 'relative', flex: '0 0 auto', width: '220px', height: '260px',
                marginTop: '60px', marginBottom: 'calc(-1 * var(--space-10))',
              }}
            >
              <div style={{
                position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '90%', height: '70%',
                background: 'radial-gradient(ellipse at 50% 100%, rgba(210,155,50,0.25) 0%, rgba(180,100,30,0.1) 45%, transparent 75%)',
              }} />
              <img
                src="/Astrologist/A3.png" alt="A pandit" draggable={false}
                style={{
                  position: 'relative', display: 'block', width: '100%', height: '100%', objectFit: 'contain', objectPosition: 'bottom center',
                  filter: 'drop-shadow(0 -6px 24px rgba(180,130,50,0.18))',
                }}
              />
            </motion.div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1160px', margin: '0 auto', padding: '0 24px', marginTop: 'var(--space-8)' }}>
        <AnimatePresence mode="wait">
          {tab === 'recorded' && (
            <motion.div key="recorded" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {videos === null ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading videos…</p>
              ) : videos.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No recorded poojas yet — check back soon.</p>
              ) : (
                <>
                  <FilterChips options={videoCategories} active={videoFilter} onChange={setVideoFilter} />
                  {featuredVideo && (
                    <motion.button
                      whileHover={{ y: -4 }} onClick={() => setActiveVideo(featuredVideo)}
                      style={{ ...card, textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden', display: 'block', width: '100%', marginBottom: 'var(--space-5)' }}
                    >
                      <div style={{ position: 'relative', paddingTop: '38%', background: '#000' }}>
                        {featuredVideo.thumbnailUrl ? (
                          <img src={featuredVideo.thumbnailUrl} alt={featuredVideo.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><PlayIcon size={48} /></span>
                        )}
                        <span style={{ position: 'absolute', top: '12px', left: '12px', background: 'var(--gold-primary)', color: '#1c0f0c', fontSize: '10px', padding: '3px 10px', borderRadius: '999px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Featured</span>
                      </div>
                      <div style={{ padding: 'var(--space-4)' }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{featuredVideo.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{featuredVideo.category}</div>
                      </div>
                    </motion.button>
                  )}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-5)' }}>
                    {restVideos.map((v, i) => (
                      <motion.button
                        key={v.id} whileHover={{ y: -4 }}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
                        onClick={() => setActiveVideo(v)} style={{ ...card, textAlign: 'left', cursor: 'pointer' }}
                      >
                        <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000', marginBottom: 'var(--space-3)' }}>
                          {v.thumbnailUrl ? (
                            <img src={v.thumbnailUrl} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-primary)' }}><PlayIcon size={32} /></span>
                          )}
                        </div>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{v.title}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{v.category}</div>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {tab === 'group' && (
            <motion.div key="group" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {joinError && <p style={{ color: '#c0392b', marginBottom: 'var(--space-4)' }}>{joinError}</p>}
              {sessions === null ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading sessions…</p>
              ) : sessions.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No group poojas scheduled right now — check back soon.</p>
              ) : (
                <>
                  {heroSession && <GroupSessionHero session={heroSession} joining={joining === heroSession.id} onJoin={() => handleJoin(heroSession)} />}
                  {otherSessions.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                      {otherSessions.map(s => {
                        const seatsLeft = s.capacity != null ? Math.max(0, s.capacity - s.registeredCount) : null;
                        return (
                          <motion.div key={s.id} whileHover={{ y: -2 }} style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                            <div>
                              <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)', color: 'var(--text-primary)' }}>{s.title}</div>
                              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: '4px' }}>with {s.panditName}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {new Date(s.scheduledAt).toLocaleString()} · {s.pricePaise ? `₹${(s.pricePaise / 100).toFixed(0)}` : 'Free'}
                                {seatsLeft !== null && ` · ${seatsLeft === 0 ? 'Full' : `${seatsLeft} left`}`}
                              </div>
                            </div>
                            {s.registered ? (
                              s.meetingUrl ? (
                                <a href={s.meetingUrl} target="_blank" rel="noreferrer" className="btn btn-gold">Join Live</a>
                              ) : (
                                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gold-primary)' }}>You're registered</span>
                              )
                            ) : (
                              <button className="btn btn-gold" disabled={joining === s.id || seatsLeft === 0} onClick={() => handleJoin(s)}>
                                {joining === s.id ? 'Joining…' : seatsLeft === 0 ? 'Full' : 'Join'}
                              </button>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {tab === 'pandit' && (
            <motion.div key="pandit" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div style={{ ...card, textAlign: 'center', padding: 'var(--space-12) var(--space-8)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-4)' }}>
                <AcharyaIcon size={44} style={{ color: 'var(--gold-primary)' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-2xl)', fontWeight: 300, color: 'var(--text-primary)' }}>Book a Pooja for your own Pooja</h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: '460px' }}>
                  Get a 1:1 session with a pandit for a specific ritual. Pick what you need, or just browse everyone who offers pooja.
                </p>
                <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '520px' }}>
                  {POOJA_TYPES.map(p => (
                    <button key={p} onClick={browsePandits} style={{ padding: '8px 16px', borderRadius: '999px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', color: 'var(--text-secondary)', fontSize: 'var(--text-xs)', cursor: 'pointer' }}>
                      {p}
                    </button>
                  ))}
                </div>
                <button className="btn btn-gold" onClick={browsePandits}>Browse All Pandits</button>
              </div>
            </motion.div>
          )}

          {tab === 'library' && (
            <motion.div key="library" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {books === null ? (
                <p style={{ color: 'var(--text-muted)' }}>Loading library…</p>
              ) : books.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No books added yet — check back soon.</p>
              ) : (
                <>
                  <FilterChips options={bookCategories} active={bookFilter} onChange={setBookFilter} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
                    {shownBooks.map((b, i) => (
                      <motion.button
                        key={b.id} whileHover={{ y: -4 }}
                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.3) }}
                        onClick={() => setActiveBook(b)} style={{ ...card, textAlign: 'left', cursor: 'pointer', padding: 0, overflow: 'hidden' }}
                      >
                        <div style={{ position: 'relative', paddingTop: '62%', background: 'linear-gradient(135deg, #3a1a12, #7a3a1a)' }}>
                          {b.coverImageUrl ? (
                            <img src={b.coverImageUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><ManuscriptIcon size={36} /></span>
                          )}
                          <span style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: '10px', padding: '3px 9px', borderRadius: '999px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{b.pdfUrl ? 'PDF' : 'Text'}</span>
                        </div>
                        <div style={{ padding: 'var(--space-4)' }}>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-base)', color: 'var(--text-primary)' }}>{b.title}</div>
                          {b.author && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>{b.author}</div>}
                          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>{b.category}</div>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
        {activeBook && <BookModal book={activeBook} onClose={() => setActiveBook(null)} />}
      </AnimatePresence>
    </div>
  );
}
