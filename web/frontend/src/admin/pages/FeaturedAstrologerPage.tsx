import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { astrologerService } from '../../services/astrologerService';
import type { UiAstrologer } from '../../services/astrologerService';
import { adminService, AdminApiError } from '../../services/adminService';
import { EmptyState } from '../components/SharedControls';
import styles from './AdminPages.module.css';

// ADMIN-only (see adminService.getFeaturedAstrologer/setFeaturedAstrologer,
// gated server-side with adminOnly, not requireSection) — picks which real
// astrologer is highlighted in the nav's Consult dropdown and pinned to the
// top of the public directory. Replaces the old hardcoded
// RAGHAV_ASTROLOGER_ID constant with a changeable setting, same precedent
// as the Staff section: never toggleable for a STAFF account.
export default function FeaturedAstrologerPage() {
  const { t } = useAppContext();
  const [catalog, setCatalog] = useState<UiAstrologer[]>([]);
  const [currentId, setCurrentId] = useState<number | null>(null);
  const [currentName, setCurrentName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      astrologerService.list({ limit: 100 }).then(r => r.data),
      adminService.getFeaturedAstrologer(),
    ])
      .then(([data, featured]) => {
        setCatalog(data);
        setCurrentId(featured.astrologerId);
        setCurrentName(featured.astrologerName);
      })
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load astrologers.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handlePick = async (id: number | null) => {
    setSaving(true);
    setError('');
    try {
      const result = await adminService.setFeaturedAstrologer(id);
      setCurrentId(result.astrologerId);
      setCurrentName(id === null ? null : (catalog.find(a => a.id === id)?.name ?? null));
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const q = search.trim().toLowerCase();
  const matches = q.length >= 1 ? catalog.filter(a => a.name.toLowerCase().includes(q)) : catalog;

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_sidebar_featured_astrologer')}</div>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--adm-charcoal-soft)', marginBottom: 16 }}>
        Pick the one astrologer highlighted in the site's Consult dropdown and pinned to the top of the full
        directory with an "Our Celebrity Astrologer" badge. Only an ADMIN can change this — it's never
        delegable to Staff.
      </p>

      <div style={{ border: '1px solid var(--adm-border, #e5e0d8)', borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--adm-muted, #8a8678)', marginBottom: 6 }}>Currently featured</div>
        {currentId ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <strong>{currentName || `Astrologer #${currentId}`}</strong>
            <button type="button" className="btn btn-sm" disabled={saving} onClick={() => handlePick(null)}>
              Remove
            </button>
          </div>
        ) : (
          <span style={{ color: 'var(--adm-muted, #8a8678)' }}>No astrologer is currently featured.</span>
        )}
      </div>

      {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      <input
        className={styles.formInput}
        placeholder="Search astrologers by name…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 420 }}
      />

      {!loading && matches.length === 0 && (
        <EmptyState title="No astrologers found" description="Try a different search, or check the Astrologers section." />
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {matches.map(a => (
          <div
            key={a.id}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              border: '1px solid var(--adm-border, #e5e0d8)', borderRadius: 8, padding: '10px 14px',
              background: a.id === currentId ? 'var(--adm-gold-bg, #faf3e3)' : 'transparent',
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{a.name}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--adm-muted, #8a8678)' }}>{a.title} · ★ {a.rating.toFixed(1)}</div>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${a.id === currentId ? '' : 'btn-gold'}`}
              disabled={saving || a.id === currentId}
              onClick={() => handlePick(a.id)}
            >
              {a.id === currentId ? 'Featured' : 'Make Featured'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
