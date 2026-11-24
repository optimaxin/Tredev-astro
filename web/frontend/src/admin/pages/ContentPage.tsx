import { useEffect, useRef, useState } from 'react';
import { useAppContext, TRANSLATIONS } from '../../context/AppContext';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiContentOverride } from '../../services/adminService';
import { EmptyState } from '../components/SharedControls';
import styles from './AdminPages.module.css';

const BASE_KEYS = Object.keys(TRANSLATIONS.en);

// Lets staff/admin override any site text string shown via t() — or an
// image, for a key a page has been wired to read through t() too (see
// Navigation.tsx's 'site_logo_image') — without a code change or redeploy.
// Every known translation key is searchable here even before it's ever been
// overridden; an arbitrary custom key (for an image slot) also works once a
// developer has wired that one spot to read it.
export default function ContentPage() {
  const { t } = useAppContext();
  const [overrides, setOverrides] = useState<ApiContentOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [customKey, setCustomKey] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetKey = useRef<string | null>(null);

  const load = () => {
    setLoading(true);
    adminService.listContentOverrides()
      .then(setOverrides)
      .catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load content overrides.'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const overrideMap = Object.fromEntries(overrides.map(o => [o.key, o.value]));
  const allKeys = Array.from(new Set([...BASE_KEYS, ...overrides.map(o => o.key)]));

  const q = search.trim().toLowerCase();
  const matches = q.length >= 2
    ? allKeys.filter(k => k.toLowerCase().includes(q) || (TRANSLATIONS.en[k] || '').toLowerCase().includes(q)).slice(0, 60)
    : overrides.map(o => o.key); // no search yet — just show what's already customized

  const valueFor = (key: string) => edits[key] ?? overrideMap[key] ?? TRANSLATIONS.en[key] ?? '';

  const handleSave = async (key: string) => {
    const value = (edits[key] ?? overrideMap[key] ?? '').trim();
    if (!value) return;
    setSavingKey(key);
    try {
      await adminService.setContentOverride(key, value);
      load();
      setEdits(prev => { const next = { ...prev }; delete next[key]; return next; });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = async (key: string) => {
    setSavingKey(key);
    try {
      await adminService.resetContentOverride(key);
      load();
      setEdits(prev => { const next = { ...prev }; delete next[key]; return next; });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not reset.');
    } finally {
      setSavingKey(null);
    }
  };

  const handleUploadClick = (key: string) => {
    uploadTargetKey.current = key;
    fileInputRef.current?.click();
  };

  const handleFileChosen: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    const key = uploadTargetKey.current;
    e.target.value = '';
    if (!file || !key) return;
    const reader = new FileReader();
    reader.onload = () => setEdits(prev => ({ ...prev, [key]: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_sidebar_content')}</div>
      </div>
      <p style={{ fontSize: '0.85rem', color: 'var(--adm-charcoal-soft)', marginBottom: 16 }}>
        Change any text or image shown on the site — search by its key, or by the words it currently shows.
        Saved changes apply immediately, with no redeploy needed.
      </p>

      <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChosen} style={{ display: 'none' }} />

      <input
        className={styles.formInput}
        placeholder='Search site text (e.g. "hero", "reports", or a key like nav_reports)…'
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ marginBottom: 16, maxWidth: 420 }}
      />

      {error && <p style={{ color: 'var(--adm-danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</p>}

      {!loading && matches.length === 0 && q.length >= 2 && (
        <EmptyState title="No matches" description="Try a different search term, or check the exact key spelling." />
      )}
      {!loading && matches.length === 0 && q.length < 2 && (
        <EmptyState title="Nothing customized yet" description="Search above to find any site text to change." />
      )}

      {matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {matches.map(key => {
            const isOverridden = key in overrideMap;
            const isImage = /image|logo|banner|photo|avatar/i.test(key);
            const value = valueFor(key);
            return (
              <div key={key} style={{ border: '1px solid var(--adm-border, #e5e0d8)', borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <code style={{ fontSize: '0.74rem', color: 'var(--adm-muted, #8a8678)' }}>{key}</code>
                  {isOverridden && <span style={{ fontSize: '0.7rem', color: 'var(--adm-gold-dark, #8a6a22)' }}>customized</span>}
                </div>
                {isImage && value && (
                  <img src={value} alt="" style={{ maxHeight: 60, borderRadius: 4, marginBottom: 6, display: 'block' }} />
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <textarea
                    className={styles.formInput}
                    value={value}
                    rows={isImage ? 1 : 2}
                    onChange={e => setEdits(prev => ({ ...prev, [key]: e.target.value }))}
                    style={{ flex: 1, resize: 'vertical', fontSize: '0.82rem' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {isImage && (
                      <button type="button" className="btn btn-sm" onClick={() => handleUploadClick(key)} style={{ whiteSpace: 'nowrap' }}>
                        Upload
                      </button>
                    )}
                    <button type="button" className="btn btn-gold btn-sm" disabled={savingKey === key} onClick={() => handleSave(key)}>
                      {savingKey === key ? '…' : 'Save'}
                    </button>
                    {isOverridden && (
                      <button type="button" className="btn btn-sm" disabled={savingKey === key} onClick={() => handleReset(key)}>
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
        <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 8 }}>Add a custom key</div>
        <p style={{ fontSize: '0.78rem', color: 'var(--adm-charcoal-soft)', marginBottom: 8 }}>
          For a page spot that isn't searchable above yet (ask a developer for its key once it's wired to read one).
        </p>
        <div style={{ display: 'flex', gap: 8, maxWidth: 420 }}>
          <input
            className={styles.formInput}
            placeholder="e.g. home_hero_image"
            value={customKey}
            onChange={e => setCustomKey(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-sm"
            disabled={!customKey.trim()}
            onClick={() => { setSearch(customKey.trim()); setCustomKey(''); }}
          >
            Find / Create
          </button>
        </div>
      </div>
    </div>
  );
}
