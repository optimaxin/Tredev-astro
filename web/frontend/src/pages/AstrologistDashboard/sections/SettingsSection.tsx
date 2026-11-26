import React, { useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { useRealtime } from '../../../realtime/RealtimeContext';
import { useDashboardNav, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

type Tab = 'account' | 'notifications' | 'availability' | 'security' | 'language' | 'payouts';

interface NotifPrefs { email: boolean; push: boolean; booking: boolean; payment: boolean; }

function loadPrefs(email: string): NotifPrefs {
  try {
    const raw = localStorage.getItem(`astro_notif_prefs::${email}`);
    return raw ? JSON.parse(raw) : { email: true, push: true, booking: true, payment: true };
  } catch {
    return { email: true, push: true, booking: true, payment: true };
  }
}

export default function SettingsSection() {
  const { currentUser, availability, language, setLanguage } = useAppContext();
  const { notifPrefs, completeOnboarding } = useRealtime();
  const { navigate } = useDashboardNav();
  const [tab, setTab] = useState<Tab>('account');
  const [prefs, setPrefs] = useState<NotifPrefs>(() => loadPrefs(currentUser?.email || ''));
  const [browserPermDenied, setBrowserPermDenied] = useState(false);

  const updatePrefs = (partial: Partial<NotifPrefs>) => {
    const next = { ...prefs, ...partial };
    setPrefs(next);
    localStorage.setItem(`astro_notif_prefs::${currentUser?.email}`, JSON.stringify(next));
  };

  // The one-time onboarding banner (NotificationPermissionOnboarding.tsx)
  // hides itself forever once answered — this is the only other place to
  // turn browser notifications on (required to go online, see
  // RealtimeContext.tsx's goOnline) if it was skipped, or if the browser's
  // own site permission was revoked since.
  const browserNotifsOn = 'Notification' in window && Notification.permission === 'granted' && notifPrefs.browser;
  const enableBrowserNotifs = async () => {
    setBrowserPermDenied(false);
    await completeOnboarding(notifPrefs.sound, true);
    if (!('Notification' in window) || Notification.permission !== 'granted') setBrowserPermDenied(true);
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'account', label: 'Account' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'availability', label: 'Availability' },
    { key: 'security', label: 'Security' },
    { key: 'language', label: 'Language' },
    { key: 'payouts', label: 'Payouts' },
  ];

  return (
    <div>
      <SectionHeader title="Settings" />
      <div className={styles.tabs}>
        {TABS.map(t => <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>)}
      </div>

      {tab === 'account' && (
        <Panel title="Account">
          <div className={styles.statRow}><span className={styles.statRowLabel}>Name</span><span className={styles.statRowValue}>{currentUser?.name}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Email</span><span className={styles.statRowValue}>{currentUser?.email}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Role</span><span className={styles.statRowValue}>Astrologist</span></div>
        </Panel>
      )}

      {tab === 'notifications' && (
        <Panel title="Notification Preferences">
          <div className={styles.toggleRow}>
            <span className={styles.tablePrimary}>
              Browser notifications
              <br />
              <small className={styles.tableMuted}>Required to go online — otherwise you won't notice a new assignment land.</small>
            </span>
            {browserNotifsOn ? (
              <span className={styles.statRowValue}>On ✓</span>
            ) : (
              <button className={styles.btnSm} onClick={enableBrowserNotifs}>Enable</button>
            )}
          </div>
          {browserPermDenied && (
            <p className={styles.tableMuted} style={{ color: 'var(--color-danger, #c0392b)' }}>
              Your browser is blocking notifications for this site. Enable them from your browser's site settings (usually the padlock icon next to the address bar), then come back and tap Enable again.
            </p>
          )}
          {([
            ['email', 'Email notifications'],
            ['push', 'Push notifications'],
            ['booking', 'Booking notifications'],
            ['payment', 'Payment notifications'],
          ] as const).map(([key, label]) => (
            <div key={key} className={styles.toggleRow}>
              <span className={styles.tablePrimary}>{label}</span>
              <button className={`${styles.toggleSwitch} ${prefs[key] ? styles.toggleOn : ''}`} onClick={() => updatePrefs({ [key]: !prefs[key] } as Partial<NotifPrefs>)}>
                <span className={styles.toggleKnob} />
              </button>
            </div>
          ))}
        </Panel>
      )}

      {tab === 'availability' && (
        <Panel title="Availability">
          <div className={styles.statRow}><span className={styles.statRowLabel}>Status</span><span className={styles.statRowValue}>{availability.status}</span></div>
          <div className={styles.statRow}><span className={styles.statRowLabel}>Consultation duration</span><span className={styles.statRowValue}>{availability.consultationDuration} min</span></div>
          <button className={styles.btnSm} style={{ marginTop: 8 }} onClick={() => navigate('availability')}>Manage Full Schedule</button>
        </Panel>
      )}

      {tab === 'security' && (
        <Panel title="Security">
          <p className={styles.tableMuted}>Password and session management aren't available in this demo environment.</p>
        </Panel>
      )}

      {tab === 'language' && (
        <Panel title="Language">
          <div className={styles.chipRow}>
            {(['en', 'hi', 'mr'] as const).map(l => (
              <button key={l} className={`${styles.chip} ${language === l ? styles.chipActive : ''}`} onClick={() => setLanguage(l)}>
                {l === 'en' ? 'English' : l === 'hi' ? 'हिन्दी' : 'मराठी'}
              </button>
            ))}
          </div>
        </Panel>
      )}

      {tab === 'payouts' && (
        <Panel title="Payouts">
          <p className={styles.tableMuted}>Full payout integration isn't connected yet. See the Earnings page for pending and completed totals.</p>
          <button className={styles.btnSm} style={{ marginTop: 8 }} onClick={() => navigate('earnings')}>View Earnings</button>
        </Panel>
      )}
    </div>
  );
}
