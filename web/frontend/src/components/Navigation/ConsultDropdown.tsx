import React from 'react';
import { useAppContext } from '../../context/AppContext';
import { astrologerService } from '../../services/astrologerService';
import type { UiAstrologer } from '../../services/astrologerService';
import { useFeaturedAstrologerId } from '../../hooks/useAstrologer';

// Opened from the nav's "Consult" button — a quick-pick list of top-rated
// astrologers, plus the site's current Featured/Celebrity Astrologer (set
// by an ADMIN, see FeaturedAstrologerPage.tsx) singled out in his own
// highlighted panel (real scheduled 1:1 slots, see pages/RaghavBookingPage)
// instead of blending into the regular list like every other astrologer.
export default function ConsultDropdown({ onClose, onViewAll }: { onClose: () => void; onViewAll: () => void }) {
  const { setPage, setSelectedId } = useAppContext();
  const featuredId = useFeaturedAstrologerId();
  const [top, setTop] = React.useState<UiAstrologer[] | null>(null);
  const [featured, setFeatured] = React.useState<UiAstrologer | null>(null);

  React.useEffect(() => {
    if (featuredId === undefined) return; // still loading — wait before excluding anyone
    astrologerService.list({ sort: 'rating', limit: 10 })
      // Excludes the featured astrologer (shown separately). Also requires a
      // real review history (100+) — a handful of test/placeholder accounts
      // in this data set carry a perfect 5.0 rating off just 1-3 reviews,
      // which sorts them above genuinely well-reviewed astrologers on rating
      // alone; this quick-pick only surfaces the established ones (the full
      // directory still lists everyone, untouched).
      .then(({ data }) => setTop(data.filter(a => a.id !== featuredId && a.reviews >= 100).slice(0, 3)))
      .catch(() => setTop([]));
    if (featuredId !== null) astrologerService.get(featuredId).then(setFeatured).catch(() => setFeatured(null));
  }, [featuredId]);

  const bookNow = (id: number) => {
    setSelectedId(id);
    setPage('consultation-booking');
    onClose();
  };

  const goToFeatured = () => {
    setPage('raghav-booking');
    onClose();
  };

  // Shown even when no real astrologer is Featured yet (see
  // FeaturedAstrologerPage.tsx) — same placeholder used by RaghavBookingPage
  // so this panel and the page it links to stay consistent. Replaced the
  // moment an ADMIN picks a real astrologer there.
  const displayName = featured?.name || 'Acharya Raghavendra';
  const displayExperience = featured ? `${featured.experience}+ Years Experience` : 'Vedic Astrology Specialist';

  return (
    <div
      style={{
        position: 'absolute', top: 'calc(100% + 12px)', right: 0, zIndex: 200,
        display: 'flex', gap: 'var(--space-4)', background: 'var(--surface)',
        border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-xl)',
        boxShadow: '0 20px 50px rgba(0,0,0,0.18)', padding: 'var(--space-5)', width: 'min(90vw, 620px)',
      }}
    >
      {/* Regular astrologers — quick list */}
      <div style={{ flex: '1 1 55%', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Top Astrologers</div>
        {top === null ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Loading…</p>
        ) : top.length === 0 ? (
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>No astrologers available right now.</p>
        ) : top.map(a => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', overflow: 'hidden', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {a.avatar ? <img src={a.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ color: 'var(--gold-primary)', fontFamily: 'var(--font-serif)' }}>{a.name.charAt(0)}</span>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>★ {a.rating.toFixed(1)} · {a.category[0] || a.title}</div>
            </div>
            <button className="btn" style={{ padding: '5px 12px', fontSize: '11px', flexShrink: 0 }} onClick={() => bookNow(a.id)}>Book Now</button>
          </div>
        ))}
        <button
          onClick={() => { onViewAll(); onClose(); }}
          style={{ background: 'none', border: 'none', textAlign: 'left', color: 'var(--gold-primary)', fontSize: 'var(--text-xs)', textDecoration: 'underline', cursor: 'pointer', marginTop: 'var(--space-2)' }}
        >
          View all astrologers →
        </button>
      </div>

      {/* Featured/Celebrity Astrologer — always shown; placeholder details
          until an ADMIN picks a real one (see displayName/displayExperience above) */}
      <button
        onClick={goToFeatured}
        style={{
          flex: '1 1 45%', position: 'relative', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', border: 'none',
          borderRadius: 'var(--radius-lg)', padding: 'var(--space-5)',
          background: 'linear-gradient(135deg, #7a3a1a, #b5893b)', color: '#fff',
        }}
      >
        <span style={{ position: 'absolute', top: '10px', right: '-28px', transform: 'rotate(45deg)', background: '#1c0f0c', color: 'var(--gold-primary)', fontSize: '10px', fontWeight: 600, letterSpacing: '0.06em', padding: '3px 32px' }}>FEATURED</span>
        <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 'var(--space-3)', overflow: 'hidden' }}>
          {featured?.avatar ? <img src={featured.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>{displayName.charAt(0)}</span>}
        </div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: 'var(--text-lg)' }}>{displayName}</div>
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', marginTop: '2px' }}>{displayExperience}</div>
        <p style={{ fontSize: 'var(--text-xs)', color: 'rgba(255,255,255,0.75)', marginTop: 'var(--space-2)', lineHeight: 1.5 }}>
          Book a real, scheduled 1:1 session — pick your slot, pay, and it's confirmed.
        </p>
        <span style={{ display: 'inline-block', marginTop: 'var(--space-4)', background: '#fff', color: '#7a3a1a', fontSize: 'var(--text-xs)', fontWeight: 600, padding: '8px 16px', borderRadius: 'var(--radius-md)' }}>
          Start Consultation →
        </span>
      </button>
    </div>
  );
}
