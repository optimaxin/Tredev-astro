import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { AuthUser } from '../../context/AppContext';
import { astrologerService } from '../../services/astrologerService';
import type { UiAstrologer } from '../../services/astrologerService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, SearchInput, EmptyState, AdminButton } from '../components/SharedControls';
import { accountStatus } from '../adminUtils';
import styles from './AdminPages.module.css';

// Matched by name against the real astrologer catalog — every astrologer
// account (seeded roster or one created through the real apply/approve
// flow) has exactly one catalog row with that account's real name.
function joinedProfile(account: AuthUser, catalog: UiAstrologer[]) {
  const profile = catalog.find(a => a.name === account.name);
  return {
    rating: profile?.rating ?? 0,
    experience: profile?.experience ?? 0,
    languages: profile?.languages ?? [],
    consultations: profile?.consultations ?? 0,
    price: profile?.price ?? 0,
    specialization: profile?.specialization ?? [],
    about: profile?.about ?? '—',
    avatar: profile?.avatar,
  };
}

export default function AstrologersPage() {
  const { t, accounts, suspendAccount, restoreAccount, createAstrologerAccount } = useAppContext();
  const [view, setView] = useState<'cards' | 'table'>('cards');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [catalog, setCatalog] = useState<UiAstrologer[]>([]);

  useEffect(() => {
    astrologerService.list({ limit: 50 }).then(r => setCatalog(r.data)).catch(() => {});
  }, []);

  const astrologers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter(a => a.role === 'ASTROLOGIST')
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [accounts, search]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await createAstrologerAccount(form.name, form.email, form.password);
    if (!result) { setFormError('An account with this email already exists, or the password is too short.'); return; }
    setAddOpen(false);
    setForm({ name: '', email: '', password: '' });
    setFormError('');
  };

  const TABS = [
    { key: 'overview', labelKey: 'admin_astro_tab_overview' },
    { key: 'schedule', labelKey: 'admin_astro_tab_schedule' },
    { key: 'reviews', labelKey: 'admin_astro_tab_reviews' },
    { key: 'earnings', labelKey: 'admin_astro_tab_earnings' },
    { key: 'consultations', labelKey: 'admin_astro_tab_consultations' },
    { key: 'documents', labelKey: 'admin_astro_tab_documents' },
  ];

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_astro_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.viewToggle}>
          <AdminButton variant={view === 'cards' ? 'gold' : 'outline'} onClick={() => setView('cards')}>{t('admin_astro_view_cards')}</AdminButton>
          <AdminButton variant={view === 'table' ? 'gold' : 'outline'} onClick={() => setView('table')}>{t('admin_astro_view_table')}</AdminButton>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={setSearch} placeholder={t('admin_search_name_email')} />
          <AdminButton variant="gold" onClick={() => setAddOpen(true)}>{t('admin_action_add_astrologer')}</AdminButton>
        </div>
      </div>

      {astrologers.length === 0 && (
        <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
      )}

      {astrologers.length > 0 && view === 'cards' && (
        <div className={styles.astroCardGrid}>
          {astrologers.map(a => {
            const p = joinedProfile(a, catalog);
            const status = accountStatus(a.status);
            return (
              <div key={a.email} className={styles.astroCard}>
                <div className={styles.astroCardHeader}>
                  {p.avatar ? <img src={p.avatar} alt={a.name} className={styles.astroAvatar} /> : <div className={styles.astroAvatar}>{a.name.charAt(0)}</div>}
                  <div>
                    <div className={styles.astroCardName}>{a.name}</div>
                    <div className={styles.astroCardMeta}>{a.email}</div>
                  </div>
                </div>
                <div className={styles.astroCardStats}>
                  <div><span className={styles.astroStatLabel}>{t('admin_astro_col_rating')}: </span><span className={styles.astroStatValue}>★ {p.rating}</span></div>
                  <div><span className={styles.astroStatLabel}>{t('admin_astro_col_experience')}: </span><span className={styles.astroStatValue}>{p.experience}y</span></div>
                  <div><span className={styles.astroStatLabel}>{t('admin_astro_col_consultations')}: </span><span className={styles.astroStatValue}>{p.consultations.toLocaleString()}</span></div>
                  <div><span className={styles.astroStatLabel}>{t('admin_astro_col_earnings')}: </span><span className={styles.astroStatValue}>₹{(p.price * p.consultations).toLocaleString()}</span></div>
                </div>
                <StatusBadge status={status} label={t(`admin_status_${status.toLowerCase()}`)} />
                <div className={styles.astroCardActions}>
                  <AdminButton onClick={() => { setSelected(a); setProfileTab('overview'); }}>{t('admin_action_view')}</AdminButton>
                  <AdminButton onClick={() => { setSelected(a); setProfileTab('overview'); }}>{t('admin_action_edit')}</AdminButton>
                  {status === 'ACTIVE'
                    ? <AdminButton variant="danger" onClick={() => suspendAccount(a.email)}>{t('admin_action_suspend')}</AdminButton>
                    : <AdminButton variant="gold" onClick={() => restoreAccount(a.email)}>{t('admin_action_activate')}</AdminButton>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {astrologers.length > 0 && view === 'table' && (
        <DataTable
          columns={[
            { key: 'name', label: t('admin_astro_col_name'), render: a => a.name },
            { key: 'rating', label: t('admin_astro_col_rating'), render: a => `★ ${joinedProfile(a, catalog).rating}` },
            { key: 'experience', label: t('admin_astro_col_experience'), render: a => `${joinedProfile(a, catalog).experience}y` },
            { key: 'languages', label: t('admin_astro_col_languages'), render: a => joinedProfile(a, catalog).languages.join(', ') || '—' },
            { key: 'consultations', label: t('admin_astro_col_consultations'), render: a => joinedProfile(a, catalog).consultations.toLocaleString() },
            { key: 'earnings', label: t('admin_astro_col_earnings'), render: a => { const p = joinedProfile(a, catalog); return `₹${(p.price * p.consultations).toLocaleString()}`; } },
            { key: 'status', label: t('admin_astro_col_status'), render: a => { const s = accountStatus(a.status); return <StatusBadge status={s} label={t(`admin_status_${s.toLowerCase()}`)} />; } },
            {
              key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: a => {
                const s = accountStatus(a.status);
                return (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <AdminButton onClick={() => { setSelected(a); setProfileTab('overview'); }}>{t('admin_action_view')}</AdminButton>
                    {s === 'ACTIVE'
                      ? <AdminButton variant="danger" onClick={() => suspendAccount(a.email)}>{t('admin_action_suspend')}</AdminButton>
                      : <AdminButton variant="gold" onClick={() => restoreAccount(a.email)}>{t('admin_action_activate')}</AdminButton>}
                  </div>
                );
              }
            },
          ]}
          rows={astrologers}
          keyField="email"
        />
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''}>
        {selected && (() => {
          const p = joinedProfile(selected, catalog);
          return (
            <>
              <div className={styles.tabsRow}>
                {TABS.map(tab => (
                  <button key={tab.key} className={`${styles.tabBtn} ${profileTab === tab.key ? styles.tabBtnActive : ''}`} onClick={() => setProfileTab(tab.key)}>
                    {t(tab.labelKey)}
                  </button>
                ))}
              </div>

              {profileTab === 'overview' && (
                <>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Email</span><span className={styles.drawerFieldValue}>{selected.email}</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_rating')}</span><span className={styles.drawerFieldValue}>★ {p.rating}</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_experience')}</span><span className={styles.drawerFieldValue}>{p.experience} yrs</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_languages')}</span><span className={styles.drawerFieldValue}>{p.languages.join(', ') || '—'}</span></div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)', marginTop: 14, lineHeight: 1.5 }}>{p.about}</p>
                </>
              )}
              {profileTab === 'schedule' && <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
              {profileTab === 'reviews' && <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
              {profileTab === 'earnings' && (
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_earnings')}</span><span className={styles.drawerFieldValue}>₹{(p.price * p.consultations).toLocaleString()}</span></div>
              )}
              {profileTab === 'consultations' && (
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_consultations')}</span><span className={styles.drawerFieldValue}>{p.consultations.toLocaleString()}</span></div>
              )}
              {profileTab === 'documents' && <EmptyState title={t('admin_apps_no_docs')} />}
            </>
          );
        })()}
      </Drawer>

      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('admin_astro_add_title')}
        footer={<AdminButton variant="gold" type="submit" form="add-astrologer-form">{t('admin_action_confirm')}</AdminButton>}
      >
        <form id="add-astrologer-form" onSubmit={handleAdd}>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_add_name')}</label>
            <input className={styles.formInput} required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_add_email')}</label>
            <input type="email" className={styles.formInput} required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('admin_astro_add_password')}</label>
            <input type="password" className={styles.formInput} required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
          </div>
          {formError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{formError}</p>}
        </form>
      </Drawer>
    </div>
  );
}
