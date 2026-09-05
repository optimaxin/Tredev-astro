import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { AuthUser } from '../../context/AppContext';
import { astrologerService } from '../../services/astrologerService';
import type { UiAstrologer, ApiAstrologerProfile } from '../../services/astrologerService';
import { adminService, AdminApiError } from '../../services/adminService';
import type { ApiAstrologerRevenue, ApiAstrologerActivity, ApiAstrologerStatus } from '../../services/adminService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, SearchInput, EmptyState, AdminButton, ConfirmDialog, ChatAuditPanel } from '../components/SharedControls';
import { accountStatus } from '../adminUtils';
import styles from './AdminPages.module.css';

// Matched by name against the real astrologer catalog — every astrologer
// account (seeded roster or one created through the real apply/approve
// flow) has exactly one catalog row with that account's real name.
function joinedProfile(account: AuthUser, catalog: UiAstrologer[]) {
  const profile = catalog.find(a => a.name === account.name);
  return {
    id: profile?.id,
    rating: profile?.rating ?? 0,
    experience: profile?.experience ?? 0,
    languages: profile?.languages ?? [],
    consultations: profile?.consultations ?? 0,
    price: profile?.price ?? 0,
    specialization: profile?.specialization ?? [],
    about: profile?.about ?? '—',
    avatar: profile?.avatar,
    activeOfferPercent: profile?.activeOfferPercent ?? 0,
  };
}

const CONSULTATION_TYPES = ['chat', 'voice', 'video'] as const;

interface EditForm {
  title: string;
  bio: string;
  avatar: string;
  experienceYears: string;
  languages: string;   // comma-separated in the form, split into string[] on save
  categories: string;
  expertise: string;
  consultationTypes: string[];
  chatPrice: string;
  callPrice: string;
  videoPrice: string;
}

const EMPTY_EDIT_FORM: EditForm = {
  title: '', bio: '', avatar: '', experienceYears: '0',
  languages: '', categories: '', expertise: '',
  consultationTypes: ['chat', 'voice', 'video'],
  chatPrice: '0', callPrice: '0', videoPrice: '0',
};

function profileToForm(p: ApiAstrologerProfile): EditForm {
  return {
    title: p.title, bio: p.bio, avatar: p.avatar, experienceYears: String(p.experienceYears),
    languages: p.languages.join(', '), categories: p.categories.join(', '), expertise: p.expertise.join(', '),
    consultationTypes: p.consultationTypes,
    chatPrice: String(p.chatPrice), callPrice: String(p.callPrice), videoPrice: String(p.videoPrice),
  };
}

const splitList = (s: string) => s.split(',').map(x => x.trim()).filter(Boolean);

const ZERO_REVENUE: ApiAstrologerRevenue = {
  astrologerId: -1, astrologerName: '', chatCount: 0, chatRevenue: 0, voiceCount: 0, voiceRevenue: 0, videoCount: 0, videoRevenue: 0, totalRevenue: 0,
  astrologerPayout: 0, platformShare: 0,
};

export default function AstrologersPage() {
  const { t, accounts, suspendAccount, restoreAccount, updateAccountRole, currentUser } = useAppContext();
  // Revenue is an ADMIN-only view — Staff never sees it here regardless of
  // whether they've been granted the Astrologers section, mirrors the
  // backend's GET /astrologers/revenue being adminOnly now.
  const isAdmin = currentUser?.role === 'ADMIN';
  const [view, setView] = useState<'cards' | 'table' | 'revenue'>('cards');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<AuthUser | null>(null);
  const [profileTab, setProfileTab] = useState('overview');
  const [catalog, setCatalog] = useState<UiAstrologer[]>([]);
  const [revenue, setRevenue] = useState<ApiAstrologerRevenue[]>([]);
  const [liveStatus, setLiveStatus] = useState<Record<number, ApiAstrologerStatus>>({});
  const [activity, setActivity] = useState<ApiAstrologerActivity | null>(null);
  const [activityError, setActivityError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<AuthUser | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState('');

  // Staff-set per-astrologer Boost payout-share override — draft input for
  // whichever astrologer's drawer is currently open.
  const [boostPayoutDraft, setBoostPayoutDraft] = useState('');
  const [boostPayoutSaving, setBoostPayoutSaving] = useState(false);
  const [boostPayoutError, setBoostPayoutError] = useState('');

  // Editing the rest of the catalog profile (experience years, bio,
  // languages, pricing, etc.) — previously had no edit path at all; "Edit"
  // and "View" both just opened the same read-only drawer.
  const [editTarget, setEditTarget] = useState<AuthUser | null>(null);
  const [editForm, setEditForm] = useState<EditForm>(EMPTY_EDIT_FORM);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const openEdit = async (account: AuthUser) => {
    const id = joinedProfile(account, catalog).id;
    if (id === undefined) { setEditError('No catalog entry found for this astrologer.'); return; }
    setEditTarget(account);
    setEditError('');
    setEditLoading(true);
    try {
      const profile = await astrologerService.getRaw(id);
      if (profile) setEditForm(profileToForm(profile));
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not load this astrologer\'s profile.');
    } finally {
      setEditLoading(false);
    }
  };

  const toggleConsultationType = (type: string) => {
    setEditForm(prev => ({
      ...prev,
      consultationTypes: prev.consultationTypes.includes(type)
        ? prev.consultationTypes.filter(t => t !== type)
        : [...prev.consultationTypes, type],
    }));
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    const id = joinedProfile(editTarget, catalog).id;
    if (id === undefined) return;
    setEditSaving(true);
    setEditError('');
    try {
      const updated = await adminService.updateAstrologerProfile(id, {
        title: editForm.title,
        bio: editForm.bio,
        avatar: editForm.avatar,
        languages: splitList(editForm.languages),
        categories: splitList(editForm.categories),
        expertise: splitList(editForm.expertise),
        consultationTypes: editForm.consultationTypes,
        chatPrice: Number(editForm.chatPrice) || 0,
        callPrice: Number(editForm.callPrice) || 0,
        videoPrice: Number(editForm.videoPrice) || 0,
        experienceYears: Number(editForm.experienceYears) || 0,
      });
      // Reflect the save immediately in the list/cards without a full
      // reload — adapt() lives in astrologerService, so just re-map here.
      setCatalog(prev => prev.map(c => c.id === updated.id ? {
        ...c, title: updated.title, rating: updated.rating, reviews: updated.reviewCount,
        experience: updated.experienceYears, languages: updated.languages, price: updated.chatPrice,
        avatar: updated.avatar, about: updated.bio, category: updated.categories, specialization: updated.expertise,
      } : c));
      setEditTarget(null);
    } catch (err) {
      setEditError(err instanceof AdminApiError ? err.message : 'Could not save these changes.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    setRemoveError('');
    try {
      await updateAccountRole(removeTarget.email, 'USER');
      setRemoveTarget(null);
      if (selected?.email === removeTarget.email) setSelected(null);
    } catch (err) {
      setRemoveError(err instanceof Error ? err.message : 'Could not remove this astrologer.');
    } finally {
      setRemoving(false);
    }
  };

  useEffect(() => {
    astrologerService.list({ limit: 50 }).then(r => setCatalog(r.data)).catch(() => {});
    if (isAdmin) adminService.getAstrologerRevenue().then(setRevenue).catch(() => {});
    adminService.getAstrologerStatuses()
      .then(rows => setLiveStatus(Object.fromEntries(rows.map(r => [r.id, r]))))
      .catch(() => {});
  }, [isAdmin]);

  // Reset the Boost payout override draft whenever a different astrologer's
  // drawer opens, seeded from their current override (blank = using the
  // platform default).
  useEffect(() => {
    const id = selected ? joinedProfile(selected, catalog).id : undefined;
    const override = id !== undefined ? liveStatus[id]?.boostPayoutOverridePercent : null;
    setBoostPayoutDraft(override != null ? String(override) : '');
    setBoostPayoutError('');
  }, [selected, catalog, liveStatus]);

  const saveBoostPayoutOverride = async (astrologerId: number, clear: boolean) => {
    setBoostPayoutSaving(true);
    setBoostPayoutError('');
    try {
      const percent = clear ? null : Number(boostPayoutDraft);
      if (!clear && (Number.isNaN(percent) || percent! < 0 || percent! > 100)) {
        setBoostPayoutError('Enter a number between 0 and 100.');
        return;
      }
      await adminService.updateAstrologerBoostPayout(astrologerId, percent);
      // Re-fetch rather than patch the local cache — the effective %
      // when clearing an override depends on the platform default, which
      // this component doesn't otherwise track.
      const rows = await adminService.getAstrologerStatuses();
      setLiveStatus(Object.fromEntries(rows.map(r => [r.id, r])));
      if (clear) setBoostPayoutDraft('');
    } catch (err) {
      setBoostPayoutError(err instanceof AdminApiError ? err.message : 'Could not save this override.');
    } finally {
      setBoostPayoutSaving(false);
    }
  };

  // Fetched fresh per astrologer when the profile drawer opens — same
  // pattern as UsersPage's activity fetch.
  useEffect(() => {
    const id = selected ? joinedProfile(selected, catalog).id : undefined;
    if (id === undefined) { setActivity(null); return; }
    setActivity(null);
    setActivityError('');
    adminService.getAstrologerActivity(id)
      .then(setActivity)
      .catch(() => setActivityError('Could not load this astrologer\'s activity.'));
  }, [selected, catalog]);

  const astrologers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accounts
      .filter(a => a.role === 'ASTROLOGIST')
      .filter(a => !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
  }, [accounts, search]);

  // Real per-type revenue (chat/voice/video, each at that astrologer's own
  // price, counted only from completed consultations) — replaces the old
  // `price * totalConsultations` estimate, which used the CHAT price for
  // every consultation type and counted consultations that were never
  // actually completed.
  const revenueFor = (astrologerId: number | undefined): ApiAstrologerRevenue =>
    revenue.find(r => r.astrologerId === astrologerId) ?? ZERO_REVENUE;

  // Live realtime availability (see ApiAstrologerStatus) — separate from the
  // account ACTIVE/SUSPENDED StatusBadge, which only reflects moderation.
  const liveStatusFor = (astrologerId: number | undefined) => liveStatus[astrologerId ?? -1]?.status ?? 'OFFLINE';
  const liveStatusBadge = (astrologerId: number | undefined) => {
    const s = liveStatusFor(astrologerId).toLowerCase();
    return <StatusBadge status={s} label={t(`admin_astro_status_${s}`)} />;
  };
  // Offer/Boost — see Extra/Astrologer Offers Feature and Boost Feature
  // PDFs; both were fully implemented backend + astrologer-dashboard side
  // but had no visibility anywhere in the admin/staff console until now.
  const boostBadge = (astrologerId: number | undefined) =>
    liveStatus[astrologerId ?? -1]?.activeBoost ? <StatusBadge status="boost_active" label="Boost active" /> : null;
  const offerBadge = (percent: number) =>
    percent > 0 ? <StatusBadge status="offer_active" label={`${percent}% OFF active`} /> : null;

  const TABS = [
    { key: 'overview', labelKey: 'admin_astro_tab_overview' },
    { key: 'schedule', labelKey: 'admin_astro_tab_schedule' },
    { key: 'reviews', labelKey: 'admin_astro_tab_reviews' },
    ...(isAdmin ? [{ key: 'earnings', labelKey: 'admin_astro_tab_earnings' }] : []),
    { key: 'consultations', labelKey: 'admin_astro_tab_consultations' },
    { key: 'audit', labelKey: 'admin_astro_tab_audit' },
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
          {isAdmin && <AdminButton variant={view === 'revenue' ? 'gold' : 'outline'} onClick={() => setView('revenue')}>{t('admin_astro_view_revenue')}</AdminButton>}
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={setSearch} placeholder={t('admin_search_name_email')} />
        </div>
      </div>

      {astrologers.length === 0 && (
        <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
      )}

      {astrologers.length > 0 && view === 'revenue' && (
        <DataTable
          columns={[
            { key: 'name', label: t('admin_astro_col_name'), render: a => a.name },
            { key: 'chat', label: t('admin_astro_revenue_chat'), render: a => `₹${revenueFor(joinedProfile(a, catalog).id).chatRevenue.toLocaleString()} (${revenueFor(joinedProfile(a, catalog).id).chatCount})` },
            { key: 'voice', label: t('admin_astro_revenue_voice'), render: a => `₹${revenueFor(joinedProfile(a, catalog).id).voiceRevenue.toLocaleString()} (${revenueFor(joinedProfile(a, catalog).id).voiceCount})` },
            { key: 'video', label: t('admin_astro_revenue_video'), render: a => `₹${revenueFor(joinedProfile(a, catalog).id).videoRevenue.toLocaleString()} (${revenueFor(joinedProfile(a, catalog).id).videoCount})` },
            { key: 'total', label: t('admin_astro_revenue_total'), render: a => <strong>₹{revenueFor(joinedProfile(a, catalog).id).totalRevenue.toLocaleString()}</strong> },
            { key: 'payout', label: 'Astrologer Payout', render: a => `₹${revenueFor(joinedProfile(a, catalog).id).astrologerPayout.toLocaleString()}` },
            { key: 'platformShare', label: 'Platform Share', render: a => `₹${revenueFor(joinedProfile(a, catalog).id).platformShare.toLocaleString()}` },
          ]}
          rows={astrologers}
          keyField="email"
        />
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
                  {isAdmin && <div><span className={styles.astroStatLabel}>{t('admin_astro_col_earnings')}: </span><span className={styles.astroStatValue}>₹{revenueFor(p.id).totalRevenue.toLocaleString()}</span></div>}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <StatusBadge status={status} label={t(`admin_status_${status.toLowerCase()}`)} />
                  {liveStatusBadge(p.id)}
                  {boostBadge(p.id)}
                  {offerBadge(p.activeOfferPercent)}
                </div>
                <div className={styles.astroCardActions}>
                  <AdminButton onClick={() => { setSelected(a); setProfileTab('overview'); }}>{t('admin_action_view')}</AdminButton>
                  <AdminButton onClick={() => openEdit(a)}>{t('admin_action_edit')}</AdminButton>
                  {status === 'ACTIVE'
                    ? <AdminButton variant="danger" onClick={() => suspendAccount(a.email)}>{t('admin_action_suspend')}</AdminButton>
                    : <AdminButton variant="gold" onClick={() => restoreAccount(a.email)}>{t('admin_action_activate')}</AdminButton>}
                  <AdminButton variant="danger" onClick={() => setRemoveTarget(a)}>{t('admin_action_remove')}</AdminButton>
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
            ...(isAdmin ? [{ key: 'earnings', label: t('admin_astro_col_earnings'), render: (a: AuthUser) => `₹${revenueFor(joinedProfile(a, catalog).id).totalRevenue.toLocaleString()}` }] : []),
            { key: 'liveStatus', label: t('admin_astro_col_live_status'), render: a => liveStatusBadge(joinedProfile(a, catalog).id) },
            {
              key: 'promotions', label: 'Promotions', render: a => {
                const p = joinedProfile(a, catalog);
                return <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{boostBadge(p.id)}{offerBadge(p.activeOfferPercent)}</div>;
              },
            },
            { key: 'status', label: t('admin_astro_col_status'), render: a => { const s = accountStatus(a.status); return <StatusBadge status={s} label={t(`admin_status_${s.toLowerCase()}`)} />; } },
            {
              key: 'action', label: t('admin_apps_col_action'), hideOnCard: true, render: a => {
                const s = accountStatus(a.status);
                return (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <AdminButton onClick={() => { setSelected(a); setProfileTab('overview'); }}>{t('admin_action_view')}</AdminButton>
                    <AdminButton onClick={() => openEdit(a)}>{t('admin_action_edit')}</AdminButton>
                    {s === 'ACTIVE'
                      ? <AdminButton variant="danger" onClick={() => suspendAccount(a.email)}>{t('admin_action_suspend')}</AdminButton>
                      : <AdminButton variant="gold" onClick={() => restoreAccount(a.email)}>{t('admin_action_activate')}</AdminButton>}
                    <AdminButton variant="danger" onClick={() => setRemoveTarget(a)}>{t('admin_action_remove')}</AdminButton>
                  </div>
                );
              }
            },
          ]}
          rows={astrologers}
          keyField="email"
        />
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.name || ''} wide>
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
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_live_status')}</span><span className={styles.drawerFieldValue}>{liveStatusBadge(p.id)}</span></div>
                  {(liveStatus[p.id ?? -1]?.activeBoost || p.activeOfferPercent > 0) && (
                    <div className={styles.drawerField}>
                      <span className={styles.drawerFieldLabel}>Promotions</span>
                      <span className={styles.drawerFieldValue} style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        {boostBadge(p.id)}
                        {offerBadge(p.activeOfferPercent)}
                      </span>
                    </div>
                  )}
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_rating')}</span><span className={styles.drawerFieldValue}>★ {p.rating}</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_experience')}</span><span className={styles.drawerFieldValue}>{p.experience} yrs</span></div>
                  <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_languages')}</span><span className={styles.drawerFieldValue}>{p.languages.join(', ') || '—'}</span></div>
                  <p style={{ fontSize: '0.82rem', color: 'var(--adm-charcoal-soft)', marginTop: 14, lineHeight: 1.5 }}>{p.about}</p>

                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--adm-border, #e5e0d8)' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: 6 }}>Boost Payout Override</div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--adm-charcoal-soft)', marginBottom: 10 }}>
                      What this astrologer keeps on a Boost-attributed session. Leave blank to use the platform default
                      {liveStatus[p.id ?? -1] && !liveStatus[p.id ?? -1]?.boostPayoutOverridePercent && ` (currently ${liveStatus[p.id ?? -1]?.effectiveBoostPayoutSharePercent}%)`}.
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <input
                        type="number" min={0} max={100}
                        className={styles.formInput} style={{ width: 90 }}
                        value={boostPayoutDraft}
                        placeholder="Default"
                        onChange={e => setBoostPayoutDraft(e.target.value)}
                      />
                      <span style={{ fontSize: '0.82rem' }}>%</span>
                      <AdminButton variant="gold" disabled={boostPayoutSaving || p.id === undefined || !boostPayoutDraft} onClick={() => p.id !== undefined && saveBoostPayoutOverride(p.id, false)}>
                        {boostPayoutSaving ? '…' : 'Save'}
                      </AdminButton>
                      {liveStatus[p.id ?? -1]?.boostPayoutOverridePercent != null && (
                        <AdminButton variant="outline" disabled={boostPayoutSaving || p.id === undefined} onClick={() => p.id !== undefined && saveBoostPayoutOverride(p.id, true)}>
                          Reset to default
                        </AdminButton>
                      )}
                    </div>
                    {boostPayoutError && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.8rem', marginTop: 8 }}>{boostPayoutError}</p>}
                  </div>
                </>
              )}
              {profileTab === 'schedule' && <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
              {profileTab === 'reviews' && <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
              {profileTab === 'earnings' && (() => {
                const rev = revenueFor(p.id);
                return (
                  <>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_chat')}</span><span className={styles.drawerFieldValue}>₹{rev.chatRevenue.toLocaleString()} ({rev.chatCount})</span></div>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_voice')}</span><span className={styles.drawerFieldValue}>₹{rev.voiceRevenue.toLocaleString()} ({rev.voiceCount})</span></div>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_video')}</span><span className={styles.drawerFieldValue}>₹{rev.videoRevenue.toLocaleString()} ({rev.videoCount})</span></div>
                    <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_revenue_total')}</span><span className={styles.drawerFieldValue}><strong>₹{rev.totalRevenue.toLocaleString()}</strong></span></div>
                    {rev.astrologerPayout !== rev.totalRevenue && (
                      <>
                        <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Astrologer Payout</span><span className={styles.drawerFieldValue}>₹{rev.astrologerPayout.toLocaleString()}</span></div>
                        <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>Platform Share (Boost)</span><span className={styles.drawerFieldValue}>₹{rev.platformShare.toLocaleString()}</span></div>
                      </>
                    )}
                  </>
                );
              })()}
              {profileTab === 'consultations' && (
                <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_astro_col_consultations')}</span><span className={styles.drawerFieldValue}>{p.consultations.toLocaleString()}</span></div>
              )}
              {profileTab === 'audit' && (
                <ChatAuditPanel
                  recentChats={activity ? activity.recentChats : activityError ? [] : null}
                  lastAction={activity?.lastAction ?? null}
                  loadError={activityError}
                  onRaiseWarning={note => adminService.logNote('audit.warning', `${selected.name} (astrologer): ${note}`).then(() => {})}
                />
              )}
              {profileTab === 'documents' && <EmptyState title={t('admin_apps_no_docs')} />}
            </>
          );
        })()}
      </Drawer>


      <Drawer
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget ? `${t('admin_action_edit')} — ${editTarget.name}` : ''}
        footer={<AdminButton variant="gold" type="submit" form="edit-astrologer-form" disabled={editLoading || editSaving}>{editSaving ? '…' : t('admin_action_save')}</AdminButton>}
      >
        {editLoading ? (
          <p style={{ fontSize: '0.85rem', color: 'var(--adm-charcoal-soft)' }}>Loading…</p>
        ) : (
          <form id="edit-astrologer-form" onSubmit={handleEditSave}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_title')}</label>
              <input className={styles.formInput} required value={editForm.title} onChange={e => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_bio')}</label>
              <textarea className={styles.formTextarea} value={editForm.bio} onChange={e => setEditForm({ ...editForm, bio: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_avatar')}</label>
              <input className={styles.formInput} value={editForm.avatar} onChange={e => setEditForm({ ...editForm, avatar: e.target.value })} placeholder="https://…" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_experience')}</label>
              <input type="number" min={0} max={80} className={styles.formInput} value={editForm.experienceYears} onChange={e => setEditForm({ ...editForm, experienceYears: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_col_languages')}</label>
              <input className={styles.formInput} value={editForm.languages} onChange={e => setEditForm({ ...editForm, languages: e.target.value })} placeholder="Hindi, English, …" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_categories')}</label>
              <input className={styles.formInput} value={editForm.categories} onChange={e => setEditForm({ ...editForm, categories: e.target.value })} placeholder="Love, Marriage, Career, …" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_expertise')}</label>
              <input className={styles.formInput} value={editForm.expertise} onChange={e => setEditForm({ ...editForm, expertise: e.target.value })} placeholder="Vedic Astrology, Numerology, …" />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_consultation_types')}</label>
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                {CONSULTATION_TYPES.map(type => (
                  <AdminButton key={type} type="button" variant={editForm.consultationTypes.includes(type) ? 'gold' : 'outline'} onClick={() => toggleConsultationType(type)}>
                    {type}
                  </AdminButton>
                ))}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_chat_price')}</label>
              <input type="number" min={0} className={styles.formInput} value={editForm.chatPrice} onChange={e => setEditForm({ ...editForm, chatPrice: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_call_price')}</label>
              <input type="number" min={0} className={styles.formInput} value={editForm.callPrice} onChange={e => setEditForm({ ...editForm, callPrice: e.target.value })} />
            </div>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>{t('admin_astro_edit_video_price')}</label>
              <input type="number" min={0} className={styles.formInput} value={editForm.videoPrice} onChange={e => setEditForm({ ...editForm, videoPrice: e.target.value })} />
            </div>
            {editError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem' }}>{editError}</p>}
          </form>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!removeTarget}
        title={t('admin_astro_confirm_remove_title')}
        description={t('admin_astro_confirm_remove_desc')}
        confirmLabel={t('admin_action_remove')}
        cancelLabel={t('admin_action_cancel')}
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
      {removeError && <p style={{ color: 'var(--adm-danger)', fontSize: '0.8rem', marginTop: 8 }}>{removeError}</p>}
    </div>
  );
}
