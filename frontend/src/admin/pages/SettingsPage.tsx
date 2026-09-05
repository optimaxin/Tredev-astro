import { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { AdminButton } from '../components/SharedControls';
import { realtimeApi, type AdminConfig } from '../../realtime/api';
import { adminService, AdminApiError } from '../../services/adminService';
import styles from './AdminPages.module.css';

// Staff-settable (per the Boost Feature spec — "hum us astrologer ko promote
// kar rahe hai" is the platform's trade-off, not the astrologer's choice):
// what an astrologer keeps on a session their Boost gets credit for. Locked
// into each Boost at the moment it's activated (see boostRepository.ts), so
// changing this never rewrites the split on a Boost already run.
function BoostPayoutCard() {
  const [percent, setPercent] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminService.getBoostPayoutShare().then(r => setPercent(r.percent)).catch(err => setError(err instanceof AdminApiError ? err.message : 'Could not load this setting.'));
  }, []);

  const save = async () => {
    if (percent === null) return;
    setSaving(true);
    setError('');
    try {
      await adminService.updateBoostPayoutShare(percent);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Could not save this setting.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.settingsCard}>
      <div className={styles.settingsCardTitle}>Boost Payout Share</div>
      <p className={styles.settingsCardDesc}>
        What an astrologer keeps on a session their active Boost gets credit for — the rest is the platform's share for promoting their profile to the top of listings. Never affects what the user pays.
      </p>
      {error && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: 12, marginTop: 8 }}>{error}</p>}
      {percent !== null && (
        <div className={styles.drawerField} style={{ marginTop: 12 }}>
          <span className={styles.drawerFieldLabel}>Astrologer keeps<br /><small style={{ opacity: 0.6, fontWeight: 400 }}>Platform keeps the rest ({100 - percent}%)</small></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input type="number" min={0} max={100} className="input-field" style={{ width: 70 }} value={percent} onChange={e => setPercent(Number(e.target.value))} />
            <span>%</span>
          </div>
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <AdminButton variant="gold" disabled={saving || percent === null} onClick={save}>{saved ? 'Saved ✓' : saving ? '…' : 'Save'}</AdminButton>
      </div>
    </div>
  );
}

function RealtimeConfigCard() {
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    realtimeApi.getAdminConfig().then(setConfig).catch(e => setError(e.message));
  }, []);

  const field = (key: keyof AdminConfig, label: string, hint: string) => (
    <div className={styles.drawerField} key={key}>
      <span className={styles.drawerFieldLabel}>{label}<br /><small style={{ opacity: 0.6, fontWeight: 400 }}>{hint}</small></span>
      <input
        type="number"
        min={1}
        className="input-field"
        style={{ width: 80 }}
        value={config?.[key] ?? ''}
        onChange={e => setConfig(prev => prev ? { ...prev, [key]: Number(e.target.value) } : prev)}
      />
    </div>
  );

  return (
    <div className={styles.settingsCard}>
      <div className={styles.settingsCardTitle}>Realtime Consultation Rules</div>
      <p className={styles.settingsCardDesc}>Controls the live availability, queue, and auto-away system (server/store.ts) — not the astrologer's own weekly schedule.</p>
      {error && <p style={{ color: '#c0392b', fontSize: 12 }}>{error}</p>}
      {config && (
        <>
          {field('maxQueueWaitMinutes', 'Max queue wait (min)', 'Users waiting longer than this are shown alternatives')}
          {field('awayTimeoutMinutes', 'Auto-away timeout (min)', 'Inactivity before an astrologer is marked away')}
          {field('defaultConsultationMinutes', 'Default consultation length (min)', 'Used for ETA before any history exists')}
          {field('defaultMaxConcurrent', 'Default max concurrent (new astrologers)', 'Simultaneous consultations before new requests queue')}
          <div style={{ marginTop: 12 }}>
            <AdminButton variant="gold" onClick={() => realtimeApi.updateAdminConfig(config).then(c => { setConfig(c); setSaved(true); setTimeout(() => setSaved(false), 2000); })}>
              {saved ? 'Saved ✓' : 'Save'}
            </AdminButton>
          </div>
        </>
      )}
    </div>
  );
}

const LANGUAGES = [
  { code: 'en' as const, name: 'English' },
  { code: 'hi' as const, name: 'हिन्दी' },
  { code: 'mr' as const, name: 'मराठी' },
];

export default function SettingsPage() {
  const { t, accounts, language, setLanguage } = useAppContext();

  const roleCounts = {
    USER: accounts.filter(a => a.role === 'USER').length,
    ASTROLOGIST: accounts.filter(a => a.role === 'ASTROLOGIST').length,
    ADMIN: accounts.filter(a => a.role === 'ADMIN').length,
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_settings_title')}</div>
        <div className={styles.pageSub}>{t('admin_settings_readonly_note')}</div>
      </div>

      {/* Short info cards together in one row — the realtime-rules card
          below is real functionality (inputs + save) and much taller, so it
          gets its own full-width row instead of stretching/cramping next to
          these. The old grid also carried 3 purely-decorative cards
          (notification templates / payment / system prefs) that were just a
          title and a sentence with no actual control behind them — removed
          rather than faked, since that's what was making the layout read as
          unfinished. */}
      <div className={styles.settingsGrid}>
        <div className={styles.settingsCard}>
          <div className={styles.settingsCardTitle}>{t('admin_settings_general')}</div>
          <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_settings_platform')}</span><span className={styles.drawerFieldValue}>TredevAstro</span></div>
          <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_settings_support_email')}</span><span className={styles.drawerFieldValue}>support@tredevastro.com</span></div>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.settingsCardTitle}>{t('admin_settings_languages')}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
            {LANGUAGES.map(l => (
              <AdminButton key={l.code} variant={language === l.code ? 'gold' : 'outline'} onClick={() => setLanguage(l.code)}>
                {l.name}
              </AdminButton>
            ))}
          </div>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.settingsCardTitle}>{t('admin_settings_roles')}</div>
          <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_sidebar_users')}</span><span className={styles.drawerFieldValue}>{roleCounts.USER}</span></div>
          <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_kpi_astrologers')}</span><span className={styles.drawerFieldValue}>{roleCounts.ASTROLOGIST}</span></div>
          <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_settings_admins')}</span><span className={styles.drawerFieldValue}>{roleCounts.ADMIN}</span></div>
        </div>
      </div>

      <div className={styles.settingsGrid} style={{ marginTop: 16 }}>
        <BoostPayoutCard />
      </div>

      <div className={styles.settingsFullRow}>
        <RealtimeConfigCard />
      </div>
    </div>
  );
}
