import { useAppContext } from '../../context/AppContext';
import { AdminButton } from '../components/SharedControls';
import styles from './AdminPages.module.css';

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

        <div className={styles.settingsCard}>
          <div className={styles.settingsCardTitle}>{t('admin_settings_notification_templates')}</div>
          <p className={styles.settingsCardDesc}>{t('admin_settings_notification_templates_desc')}</p>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.settingsCardTitle}>{t('admin_settings_payment')}</div>
          <p className={styles.settingsCardDesc}>{t('admin_settings_payment_desc')}</p>
        </div>

        <div className={styles.settingsCard}>
          <div className={styles.settingsCardTitle}>{t('admin_settings_system_prefs')}</div>
          <p className={styles.settingsCardDesc}>{t('admin_settings_system_prefs_desc')}</p>
        </div>
      </div>
    </div>
  );
}
