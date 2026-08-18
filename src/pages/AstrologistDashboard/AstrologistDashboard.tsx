import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { Consultation, ConsultationRequest } from '../../context/AppContext';
import { ASTROLOGERS } from '../../data/mockData';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './AstrologistDashboard.module.css';

type TabKey = 'overview' | 'consultations' | 'clients' | 'availability' | 'earnings' | 'reviews' | 'profile' | 'notifications' | 'settings';
type ConsultationSubTab = 'upcoming' | 'requests' | 'history';

const DAY_MS = 86400000;
const TYPE_ICON: Record<string, string> = { chat: '💬', voice: '📞', video: '🎥' };
const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const SPECIALIZATION_OPTIONS = ['Love', 'Marriage', 'Career', 'Finance', 'Vastu', 'Spirituality'];
const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Marathi'];
const DURATION_OPTIONS = [30, 45, 60];
const BUFFER_OPTIONS = [5, 10, 15];

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + DAY_MS);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isSameDay(d, now)) return `Today, ${time}`;
  if (isSameDay(d, tomorrow)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    upcoming: { label: 'Upcoming', cls: styles.pillGold },
    completed: { label: 'Completed', cls: styles.pillGreen },
    cancelled: { label: 'Cancelled', cls: styles.pillRed },
    PENDING: { label: 'Pending', cls: styles.pillGold },
    ACCEPTED: { label: 'Accepted', cls: styles.pillGreen },
    DECLINED: { label: 'Declined', cls: styles.pillRed },
    AVAILABLE: { label: 'Available', cls: styles.pillGreen },
    BUSY: { label: 'Busy', cls: styles.pillGold },
    OFFLINE: { label: 'Offline', cls: styles.pillRed },
    PAID: { label: 'Paid', cls: styles.pillGreen },
  };
  const m = map[status] || { label: status, cls: '' };
  return <span className={`${styles.pill} ${m.cls}`}>{m.label}</span>;
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>
      <h3 className={styles.emptyTitle}>{title}</h3>
      {desc && <p className={styles.emptyDesc}>{desc}</p>}
    </div>
  );
}

function KpiCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className={styles.kpiCard}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {hint && <div className={styles.kpiHint}>{hint}</div>}
    </div>
  );
}

export default function AstrologistDashboard() {
  const {
    currentUser, logout, setPage, setSelectedId, t,
    consultationRequests, consultations, acceptConsultationRequest, declineConsultationRequest,
    completeConsultation, cancelConsultation, saveConsultationNotes,
    blockedSlots, addBlockedSlot, removeBlockedSlot,
    availability, setAvailabilityStatus, updateAvailability,
    profileOverride, updateProfileOverride,
    astrologerNotifications, markNotificationRead, markAllNotificationsRead,
    astrologerReviews,
  } = useAppContext();

  const [tab, setTab] = useState<TabKey>('overview');
  const [subTab, setSubTab] = useState<ConsultationSubTab>('upcoming');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [blockedForm, setBlockedForm] = useState({ date: '', start: '', end: '', reason: '' });
  const [slotForm, setSlotForm] = useState({ start: '', end: '' });

  const profile = ASTROLOGERS.find(a => a.name === currentUser?.name) || ASTROLOGERS[0];
  const isSuspended = currentUser?.status === 'SUSPENDED';
  const now = new Date();

  const pendingRequests = useMemo(
    () => consultationRequests.filter(r => r.status === 'PENDING').sort((a, b) => a.requestedFor.localeCompare(b.requestedFor)),
    [consultationRequests]
  );
  const decidedRequests = useMemo(
    () => consultationRequests.filter(r => r.status !== 'PENDING').sort((a, b) => b.submittedAt.localeCompare(a.submittedAt)),
    [consultationRequests]
  );
  const upcomingConsultations = useMemo(
    () => consultations.filter(c => c.status === 'upcoming').sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)),
    [consultations]
  );
  const todaysSchedule = useMemo(
    () => upcomingConsultations.filter(c => isSameDay(new Date(c.scheduledAt), now)),
    [upcomingConsultations]
  );
  const historyConsultations = useMemo(
    () => consultations.filter(c => c.status === 'completed' || c.status === 'cancelled').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)),
    [consultations]
  );
  const completedConsultations = useMemo(() => consultations.filter(c => c.status === 'completed'), [consultations]);

  const totalEarnings = completedConsultations.reduce((sum, c) => sum + c.amount, 0);
  const thisMonthEarnings = completedConsultations
    .filter(c => { const d = new Date(c.scheduledAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); })
    .reduce((sum, c) => sum + c.amount, 0);
  const thisWeekEarnings = completedConsultations
    .filter(c => now.getTime() - new Date(c.scheduledAt).getTime() <= 7 * DAY_MS)
    .reduce((sum, c) => sum + c.amount, 0);
  const pendingPayout = completedConsultations.filter(c => c.payoutStatus === 'PENDING').reduce((sum, c) => sum + c.amount, 0);
  const completedPayout = completedConsultations.filter(c => c.payoutStatus === 'PAID').reduce((sum, c) => sum + c.amount, 0);

  const clientList = useMemo(() => {
    const map = new Map<string, { name: string; email: string; count: number; last?: string; next?: string }>();
    consultations.forEach(c => {
      const existing = map.get(c.clientEmail) || { name: c.clientName, email: c.clientEmail, count: 0 };
      existing.count += 1;
      if (c.status === 'upcoming') {
        if (!existing.next || c.scheduledAt < existing.next) existing.next = c.scheduledAt;
      } else if (!existing.last || c.scheduledAt > existing.last) {
        existing.last = c.scheduledAt;
      }
      map.set(c.clientEmail, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [consultations]);
  const filteredClients = clientList.filter(c => c.name.toLowerCase().includes(clientSearch.trim().toLowerCase()));

  const unreadNotifications = astrologerNotifications.filter(n => !n.read).length;

  const effectiveSpecialization = profileOverride.specialization.length ? profileOverride.specialization : profile.specialization;
  const effectiveLanguages = profileOverride.languages.length ? profileOverride.languages : profile.languages;
  const effectiveTitle = profileOverride.title || profile.title;

  const completionChecks = [
    { key: 'title', done: !!profileOverride.title.trim(), label: t('astro_profile_title') },
    { key: 'bio', done: !!profileOverride.bio.trim(), label: t('astro_profile_bio') },
    { key: 'specialization', done: profileOverride.specialization.length > 0, label: t('astro_profile_expertise') },
    { key: 'languages', done: profileOverride.languages.length > 0, label: t('astro_profile_languages') },
    { key: 'visible', done: profileOverride.publicVisible, label: t('astro_profile_public_toggle') },
  ];
  const completionPct = Math.round((completionChecks.filter(c => c.done).length / completionChecks.length) * 100);
  const missingFields = completionChecks.filter(c => !c.done).map(c => c.label);

  const toggleSpecialization = (cat: string) => {
    const next = effectiveSpecialization.includes(cat) ? effectiveSpecialization.filter(c => c !== cat) : [...effectiveSpecialization, cat];
    updateProfileOverride({ specialization: next });
  };
  const toggleLanguage = (lang: string) => {
    const next = effectiveLanguages.includes(lang) ? effectiveLanguages.filter(l => l !== lang) : [...effectiveLanguages, lang];
    updateProfileOverride({ languages: next });
  };
  const toggleWorkingDay = (day: number) => {
    const next = availability.workingDays.includes(day) ? availability.workingDays.filter(d => d !== day) : [...availability.workingDays, day].sort();
    updateAvailability({ workingDays: next });
  };
  const openNotes = (id: string, existingNotes: string) => {
    setExpandedId(expandedId === id ? null : id);
    setNoteDraft(existingNotes);
  };

  const NAV_ITEMS: { key: TabKey; label: string; icon: string; badge?: number }[] = [
    { key: 'overview', label: t('astro_nav_overview'), icon: '✦' },
    { key: 'consultations', label: t('astro_nav_consultations'), icon: '◎', badge: pendingRequests.length || undefined },
    { key: 'clients', label: t('astro_nav_clients'), icon: '☉' },
    { key: 'availability', label: t('astro_nav_availability'), icon: '⚙' },
    { key: 'earnings', label: t('astro_nav_earnings'), icon: '◈' },
    { key: 'reviews', label: t('astro_nav_reviews'), icon: '★' },
    { key: 'profile', label: t('astro_nav_profile'), icon: '🪐' },
    { key: 'notifications', label: t('astro_nav_notifications'), icon: '♃', badge: unreadNotifications || undefined },
    { key: 'settings', label: t('astro_nav_settings'), icon: '❖' },
  ];

  const greeting = now.getHours() < 12 ? t('astro_greeting_morning') : now.getHours() < 17 ? t('astro_greeting_afternoon') : t('astro_greeting_evening');

  function renderRequestRow(req: ConsultationRequest) {
    return (
      <div key={req.id} className={styles.rowCard}>
        <div className={styles.rowMain}>
          <span className={styles.rowIcon}>{TYPE_ICON[req.type]}</span>
          <div className={styles.rowInfo}>
            <div className={styles.rowTitle}>{req.clientName}</div>
            <div className={styles.rowSub}>{req.service} · {formatWhen(req.requestedFor)} · {req.duration} {t('astro_min')}</div>
          </div>
        </div>
        <div className={styles.rowRight}>
          <span className={styles.rowAmount}>₹{req.price}</span>
          {req.status === 'PENDING' ? (
            <div className={styles.rowActions}>
              <button className="btn btn-gold btn-sm" disabled={isSuspended} onClick={() => acceptConsultationRequest(req.id)}>{t('astro_action_accept')}</button>
              <button className="btn btn-outline-light btn-sm" onClick={() => declineConsultationRequest(req.id)}>{t('astro_action_decline')}</button>
            </div>
          ) : (
            <StatusPill status={req.status} />
          )}
        </div>
      </div>
    );
  }

  function renderConsultationRow(c: Consultation, options: { showActions: boolean }) {
    const expanded = expandedId === c.id;
    return (
      <div key={c.id} className={styles.rowCard}>
        <div className={styles.rowMain} onClick={() => openNotes(c.id, c.notes)} role="button">
          <span className={styles.rowIcon}>{TYPE_ICON[c.type]}</span>
          <div className={styles.rowInfo}>
            <div className={styles.rowTitle}>{c.clientName}</div>
            <div className={styles.rowSub}>{c.service} · {formatWhen(c.scheduledAt)} · {c.duration} {t('astro_min')}</div>
          </div>
        </div>
        <div className={styles.rowRight}>
          <span className={styles.rowAmount}>₹{c.amount}</span>
          <StatusPill status={c.status} />
          {options.showActions && c.status === 'upcoming' && (
            <div className={styles.rowActions}>
              <button className="btn btn-gold btn-sm" onClick={() => completeConsultation(c.id)}>{t('astro_action_complete')}</button>
              <button className="btn btn-outline-light btn-sm" onClick={() => cancelConsultation(c.id)}>{t('astro_action_cancel')}</button>
            </div>
          )}
        </div>
        {expanded && (
          <div className={styles.noteBox} onClick={e => e.stopPropagation()}>
            <label className="form-label">{t('astro_private_notes')}</label>
            <textarea
              className="input-field"
              rows={3}
              value={noteDraft}
              readOnly={c.status !== 'upcoming'}
              onChange={e => setNoteDraft(e.target.value)}
              placeholder={t('astro_private_notes_placeholder')}
            />
            {c.status === 'upcoming' && (
              <button className="btn btn-outline-gold btn-sm" style={{ marginTop: 'var(--space-2)' }} onClick={() => saveConsultationNotes(c.id, noteDraft)}>
                {t('astro_action_save_notes')}
              </button>
            )}
            {c.status === 'completed' && (
              <div className={styles.payoutLine}>{t('astro_payout_status')}: <StatusPill status={c.payoutStatus} /></div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <CelestialBackdrop variant="orbit" intensity="subtle" className={styles.backdrop} />

      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <span className={styles.headerIcon}>🪐</span>
          <div>
            <div className={styles.headerTitle}>{t('astro_console_title')}</div>
            <div className={styles.headerSub}>{t('astro_console_sub')}</div>
          </div>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.availabilitySwitch}>
            {(['AVAILABLE', 'BUSY', 'OFFLINE'] as const).map(s => (
              <button
                key={s}
                className={`${styles.availOption} ${availability.status === s ? styles.availOptionActive : ''}`}
                disabled={isSuspended && s !== 'OFFLINE'}
                onClick={() => setAvailabilityStatus(s)}
              >
                <span className={`${styles.availDot} ${styles['dot' + s]}`} />
                {t(`astro_status_${s.toLowerCase()}`)}
              </button>
            ))}
          </div>
          <button className={styles.headerNotifBtn} onClick={() => setTab('notifications')} aria-label={t('astro_nav_notifications')}>
            ♃{unreadNotifications > 0 && <span className={styles.notifBadge}>{unreadNotifications}</span>}
          </button>
          <button className={styles.mobileNavToggle} onClick={() => setMobileNavOpen(v => !v)} aria-label="Menu">☰</button>
        </div>
      </div>

      {isSuspended && (
        <div className={styles.suspendedBanner}>{t('astro_suspended_banner')}</div>
      )}

      <div className={styles.layout}>
        <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.profileCard}>
            <div className={styles.avatar}>{profile.avatar ? <img src={profile.avatar} alt={profile.name} className={styles.avatarImg} /> : '🪐'}</div>
            <div className={styles.profileName}>{currentUser?.name}</div>
            <div className={styles.profileRole}>{t('astro_role_label')}</div>
          </div>
          {NAV_ITEMS.map(item => (
            <button
              key={item.key}
              onClick={() => { setTab(item.key); setMobileNavOpen(false); }}
              className={`${styles.navBtn} ${tab === item.key ? styles.navBtnActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {item.label}
              {!!item.badge && <span className={styles.navBadge}>{item.badge}</span>}
            </button>
          ))}
          <button onClick={() => { logout(); setPage('home'); }} className={styles.navBtn} style={{ color: '#c55' }}>
            <span className={styles.navIcon}>⏻</span>
            {t('astro_sign_out')}
          </button>
        </aside>

        <main className={styles.main}>
          {tab === 'overview' && (
            <div>
              <div className={styles.welcomeBlock}>
                <span className="section-eyebrow">{greeting}, {currentUser?.name?.split(' ').slice(-1)[0]}</span>
                <h1 className={styles.pageTitle}>{t('astro_overview_tagline')}</h1>
                <p className={styles.pageSub}>{now.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}</p>
              </div>

              <div className={styles.kpiGrid}>
                <KpiCard label={t('astro_kpi_today')} value={todaysSchedule.length} />
                <KpiCard label={t('astro_kpi_pending')} value={pendingRequests.length} />
                <KpiCard label={t('astro_kpi_month_earnings')} value={`₹${thisMonthEarnings.toLocaleString()}`} />
                <KpiCard label={t('astro_kpi_rating')} value={`★ ${profile.rating}`} />
              </div>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_todays_schedule')}</h3>
                {todaysSchedule.length === 0 ? (
                  <EmptyState icon="☉" title={t('astro_empty_schedule_title')} desc={t('astro_empty_schedule_desc')} />
                ) : (
                  todaysSchedule.map(c => renderConsultationRow(c, { showActions: true }))
                )}
              </div>

              <div className={styles.sectionCard}>
                <div className={styles.sectionHeaderRow}>
                  <h3 className={styles.sectionTitle}>{t('astro_pending_requests')}</h3>
                  {pendingRequests.length > 0 && (
                    <button className={styles.linkBtn} onClick={() => { setTab('consultations'); setSubTab('requests'); }}>{t('astro_view_all')}</button>
                  )}
                </div>
                {pendingRequests.length === 0 ? (
                  <EmptyState icon="◎" title={t('astro_empty_requests_title')} desc={t('astro_empty_requests_desc')} />
                ) : (
                  pendingRequests.slice(0, 4).map(renderRequestRow)
                )}
              </div>
            </div>
          )}

          {tab === 'consultations' && (
            <div>
              <h1 className={styles.pageTitle}>{t('astro_nav_consultations')}</h1>
              <div className={styles.subTabs}>
                {(['upcoming', 'requests', 'history'] as ConsultationSubTab[]).map(st => (
                  <button key={st} className={`${styles.subTabBtn} ${subTab === st ? styles.subTabBtnActive : ''}`} onClick={() => setSubTab(st)}>
                    {t(`astro_subtab_${st}`)}
                    {st === 'requests' && pendingRequests.length > 0 && <span className={styles.navBadge}>{pendingRequests.length}</span>}
                  </button>
                ))}
              </div>

              {subTab === 'upcoming' && (
                upcomingConsultations.length === 0
                  ? <EmptyState icon="◎" title={t('astro_empty_upcoming_title')} desc={t('astro_empty_upcoming_desc')} />
                  : upcomingConsultations.map(c => renderConsultationRow(c, { showActions: true }))
              )}

              {subTab === 'requests' && (
                <>
                  {pendingRequests.length === 0
                    ? <EmptyState icon="◎" title={t('astro_empty_requests_title')} desc={t('astro_empty_requests_desc')} />
                    : pendingRequests.map(renderRequestRow)}
                  {decidedRequests.length > 0 && (
                    <div className={styles.sectionCard} style={{ marginTop: 'var(--space-6)' }}>
                      <h3 className={styles.sectionTitle}>{t('astro_recently_decided')}</h3>
                      {decidedRequests.slice(0, 5).map(renderRequestRow)}
                    </div>
                  )}
                </>
              )}

              {subTab === 'history' && (
                historyConsultations.length === 0
                  ? <EmptyState icon="☾" title={t('astro_empty_history_title')} desc={t('astro_empty_history_desc')} />
                  : historyConsultations.map(c => renderConsultationRow(c, { showActions: false }))
              )}
            </div>
          )}

          {tab === 'clients' && (
            <div>
              <h1 className={styles.pageTitle}>{t('astro_nav_clients')}</h1>
              <input
                className="input-field"
                style={{ maxWidth: '320px', marginBottom: 'var(--space-5)' }}
                placeholder={t('astro_search_clients')}
                value={clientSearch}
                onChange={e => setClientSearch(e.target.value)}
              />
              {filteredClients.length === 0 ? (
                <EmptyState icon="☉" title={t('astro_empty_clients_title')} desc={t('astro_empty_clients_desc')} />
              ) : (
                <div className={styles.sectionCard}>
                  {filteredClients.map(c => (
                    <div key={c.email}>
                      <div className={styles.rowCard} role="button" onClick={() => setExpandedClient(expandedClient === c.email ? null : c.email)}>
                        <div className={styles.rowMain}>
                          <span className={styles.rowIcon}>{c.name.charAt(0).toUpperCase()}</span>
                          <div className={styles.rowInfo}>
                            <div className={styles.rowTitle}>{c.name}</div>
                            <div className={styles.rowSub}>
                              {c.count} {t('astro_consultations_count')} · {t('astro_last')}: {c.last ? formatDateShort(c.last) : '—'} · {t('astro_next')}: {c.next ? formatDateShort(c.next) : '—'}
                            </div>
                          </div>
                        </div>
                        <StatusPill status={c.next ? 'upcoming' : 'completed'} />
                      </div>
                      {expandedClient === c.email && (
                        <div className={styles.noteBox}>
                          {consultations.filter(x => x.clientEmail === c.email).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)).map(x => (
                            <div key={x.id} className={styles.miniHistoryRow}>
                              <span>{formatDateShort(x.scheduledAt)}</span>
                              <span>{x.service}</span>
                              <span>₹{x.amount}</span>
                              <StatusPill status={x.status} />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'availability' && (
            <div>
              <h1 className={styles.pageTitle}>{t('astro_nav_availability')}</h1>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_working_days')}</h3>
                <div className={styles.chipRow}>
                  {WEEKDAYS.map((w, i) => (
                    <button key={w} className={`${styles.chip} ${availability.workingDays.includes(i) ? styles.chipActive : ''}`} onClick={() => toggleWorkingDay(i)}>
                      {t(`astro_day_${w}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_time_slots')}</h3>
                {availability.slots.map((s, i) => (
                  <div key={i} className={styles.slotRow}>
                    <span>{s.start} – {s.end}</span>
                    <button className={styles.removeBtn} onClick={() => updateAvailability({ slots: availability.slots.filter((_, idx) => idx !== i) })}>✕</button>
                  </div>
                ))}
                <div className={styles.inlineForm}>
                  <input type="time" className="input-field input-cosmos" value={slotForm.start} onChange={e => setSlotForm({ ...slotForm, start: e.target.value })} />
                  <input type="time" className="input-field input-cosmos" value={slotForm.end} onChange={e => setSlotForm({ ...slotForm, end: e.target.value })} />
                  <button
                    className="btn btn-outline-gold btn-sm"
                    disabled={!slotForm.start || !slotForm.end}
                    onClick={() => { updateAvailability({ slots: [...availability.slots, slotForm] }); setSlotForm({ start: '', end: '' }); }}
                  >
                    {t('astro_action_add_slot')}
                  </button>
                </div>
              </div>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_consultation_duration')}</h3>
                <div className={styles.chipRow}>
                  {DURATION_OPTIONS.map(d => (
                    <button key={d} className={`${styles.chip} ${availability.consultationDuration === d ? styles.chipActive : ''}`} onClick={() => updateAvailability({ consultationDuration: d })}>
                      {d} {t('astro_min')}
                    </button>
                  ))}
                </div>
                <h3 className={styles.sectionTitle} style={{ marginTop: 'var(--space-6)' }}>{t('astro_buffer_time')}</h3>
                <div className={styles.chipRow}>
                  {BUFFER_OPTIONS.map(b => (
                    <button key={b} className={`${styles.chip} ${availability.bufferMinutes === b ? styles.chipActive : ''}`} onClick={() => updateAvailability({ bufferMinutes: b })}>
                      {b} {t('astro_min')}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_blocked_time')}</h3>
                {blockedSlots.length === 0 && <p className={styles.mutedText}>{t('astro_no_blocked_time')}</p>}
                {blockedSlots.map(b => (
                  <div key={b.id} className={styles.slotRow}>
                    <span>{formatDateShort(b.date)} · {b.start}–{b.end} · {b.reason}</span>
                    <button className={styles.removeBtn} onClick={() => removeBlockedSlot(b.id)}>✕</button>
                  </div>
                ))}
                <div className={styles.inlineForm}>
                  <input type="date" className="input-field input-cosmos" value={blockedForm.date} onChange={e => setBlockedForm({ ...blockedForm, date: e.target.value })} />
                  <input type="time" className="input-field input-cosmos" value={blockedForm.start} onChange={e => setBlockedForm({ ...blockedForm, start: e.target.value })} />
                  <input type="time" className="input-field input-cosmos" value={blockedForm.end} onChange={e => setBlockedForm({ ...blockedForm, end: e.target.value })} />
                  <input type="text" className="input-field input-cosmos" placeholder={t('astro_reason_placeholder')} value={blockedForm.reason} onChange={e => setBlockedForm({ ...blockedForm, reason: e.target.value })} />
                  <button
                    className="btn btn-outline-gold btn-sm"
                    disabled={!blockedForm.date || !blockedForm.start || !blockedForm.end}
                    onClick={() => { addBlockedSlot(blockedForm); setBlockedForm({ date: '', start: '', end: '', reason: '' }); }}
                  >
                    {t('astro_action_block_time')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'earnings' && (
            <div>
              <h1 className={styles.pageTitle}>{t('astro_nav_earnings')}</h1>
              <div className={styles.kpiGrid}>
                <KpiCard label={t('astro_earnings_total')} value={`₹${totalEarnings.toLocaleString()}`} />
                <KpiCard label={t('astro_earnings_month')} value={`₹${thisMonthEarnings.toLocaleString()}`} />
                <KpiCard label={t('astro_earnings_week')} value={`₹${thisWeekEarnings.toLocaleString()}`} />
                <KpiCard label={t('astro_earnings_pending_payout')} value={`₹${pendingPayout.toLocaleString()}`} />
                <KpiCard label={t('astro_earnings_completed_payout')} value={`₹${completedPayout.toLocaleString()}`} />
              </div>

              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_transactions')}</h3>
                {completedConsultations.length === 0 ? (
                  <EmptyState icon="◈" title={t('astro_empty_transactions_title')} desc={t('astro_empty_transactions_desc')} />
                ) : (
                  completedConsultations
                    .slice()
                    .sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt))
                    .map(c => (
                      <div key={c.id} className={styles.rowCard}>
                        <div className={styles.rowInfo}>
                          <div className={styles.rowTitle}>{c.clientName} · {c.service}</div>
                          <div className={styles.rowSub}>{formatDateShort(c.scheduledAt)}</div>
                        </div>
                        <div className={styles.rowRight}>
                          <span className={styles.rowAmount}>₹{c.amount}</span>
                          <StatusPill status={c.payoutStatus} />
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {tab === 'reviews' && (
            <div>
              <h1 className={styles.pageTitle}>{t('astro_nav_reviews')}</h1>
              <div className={styles.kpiGrid}>
                <KpiCard label={t('astro_average_rating')} value={`★ ${profile.rating}`} />
                <KpiCard label={t('astro_total_reviews')} value={profile.reviews.toLocaleString()} />
              </div>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_recent_reviews')}</h3>
                {astrologerReviews.length === 0 ? (
                  <EmptyState icon="★" title={t('astro_empty_reviews_title')} desc={t('astro_empty_reviews_desc')} />
                ) : (
                  astrologerReviews.slice().sort((a, b) => b.at.localeCompare(a.at)).map(r => (
                    <div key={r.id} className={styles.reviewCard}>
                      <div className={styles.reviewHead}>
                        <span className={styles.reviewStars}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                        <span className={styles.mutedText}>{r.clientName} · {formatDateShort(r.at)}</span>
                      </div>
                      <p className={styles.reviewText}>{r.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {tab === 'profile' && (
            <div>
              <h1 className={styles.pageTitle}>{t('astro_nav_profile')}</h1>

              <div className={styles.sectionCard}>
                <div className={styles.sectionHeaderRow}>
                  <h3 className={styles.sectionTitle}>{t('astro_profile_completion')}</h3>
                  <span className={styles.completionPct}>{completionPct}%</span>
                </div>
                <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${completionPct}%` }} /></div>
                {missingFields.length > 0 && (
                  <p className={styles.mutedText} style={{ marginTop: 'var(--space-2)' }}>{t('astro_missing')}: {missingFields.join(', ')}</p>
                )}
              </div>

              <div className={styles.sectionCard}>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">{t('astro_profile_title')}</label>
                  <input className="input-field" value={effectiveTitle} onChange={e => updateProfileOverride({ title: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">{t('astro_profile_bio')}</label>
                  <textarea className="input-field" rows={4} value={profileOverride.bio} onChange={e => updateProfileOverride({ bio: e.target.value })} />
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">{t('astro_profile_expertise')}</label>
                  <div className={styles.chipRow}>
                    {SPECIALIZATION_OPTIONS.map(cat => (
                      <button key={cat} className={`${styles.chip} ${effectiveSpecialization.includes(cat) ? styles.chipActive : ''}`} onClick={() => toggleSpecialization(cat)}>
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group" style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="form-label">{t('astro_profile_languages')}</label>
                  <div className={styles.chipRow}>
                    {LANGUAGE_OPTIONS.map(lang => (
                      <button key={lang} className={`${styles.chip} ${effectiveLanguages.includes(lang) ? styles.chipActive : ''}`} onClick={() => toggleLanguage(lang)}>
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={styles.toggleRow}>
                  <div>
                    <div className={styles.rowTitle}>{t('astro_profile_public_toggle')}</div>
                    <div className={styles.mutedText}>{isSuspended ? t('astro_public_disabled_suspended') : t('astro_profile_public_desc')}</div>
                  </div>
                  <button
                    className={`${styles.toggleSwitch} ${profileOverride.publicVisible && !isSuspended ? styles.toggleSwitchOn : ''}`}
                    disabled={isSuspended}
                    onClick={() => updateProfileOverride({ publicVisible: !profileOverride.publicVisible })}
                  >
                    <span className={styles.toggleKnob} />
                  </button>
                </div>
                <button className="btn btn-outline-gold" style={{ marginTop: 'var(--space-6)' }} onClick={() => { setSelectedId(profile.id); setPage('astrologer-profile'); }}>
                  {t('astro_view_public_profile')}
                </button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div>
              <div className={styles.sectionHeaderRow}>
                <h1 className={styles.pageTitle}>{t('astro_nav_notifications')}</h1>
                {unreadNotifications > 0 && (
                  <button className={styles.linkBtn} onClick={markAllNotificationsRead}>{t('astro_mark_all_read')}</button>
                )}
              </div>
              {astrologerNotifications.length === 0 ? (
                <EmptyState icon="♃" title={t('astro_empty_notifications_title')} desc={t('astro_empty_notifications_desc')} />
              ) : (
                <div className={styles.sectionCard}>
                  {astrologerNotifications.slice().sort((a, b) => b.at.localeCompare(a.at)).map(n => (
                    <div key={n.id} className={`${styles.notifRow} ${n.read ? '' : styles.notifRowUnread}`} onClick={() => markNotificationRead(n.id)} role="button">
                      <span className={styles.notifDot} />
                      <div className={styles.rowInfo}>
                        <div className={styles.rowTitle}>{n.message}</div>
                        <div className={styles.mutedText}>{formatDateShort(n.at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'settings' && (
            <div>
              <h1 className={styles.pageTitle}>{t('astro_nav_settings')}</h1>
              <div className={styles.sectionCard}>
                <h3 className={styles.sectionTitle}>{t('astro_settings_account')}</h3>
                <div className={styles.rowCard} style={{ cursor: 'default' }}>
                  <div className={styles.rowInfo}>
                    <div className={styles.rowTitle}>{currentUser?.name}</div>
                    <div className={styles.mutedText}>{currentUser?.email}</div>
                  </div>
                </div>
              </div>
              <button onClick={() => { logout(); setPage('home'); }} className="btn btn-outline-light">
                {t('astro_sign_out')}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
