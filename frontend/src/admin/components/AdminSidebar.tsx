import { useAppContext } from '../../context/AppContext';
import type { AdminSection } from '../adminTypes';
import styles from './AdminSidebar.module.css';

const NAV_ITEMS: { key: AdminSection; icon: string; labelKey: string }[] = [
  { key: 'overview', icon: '◈', labelKey: 'admin_sidebar_overview' },
  { key: 'applications', icon: '◎', labelKey: 'admin_sidebar_applications' },
  { key: 'astrologers', icon: '☉', labelKey: 'admin_sidebar_astrologers' },
  { key: 'users', icon: '☰', labelKey: 'admin_sidebar_users' },
  { key: 'consultations', icon: '◐', labelKey: 'admin_sidebar_consultations' },
  { key: 'reports', icon: '▤', labelKey: 'admin_sidebar_reports' },
  { key: 'orders', icon: '▢', labelKey: 'admin_sidebar_orders' },
  { key: 'content', icon: '✎', labelKey: 'admin_sidebar_content' },
  { key: 'blog', icon: '✍', labelKey: 'admin_sidebar_blog' },
  { key: 'notifications', icon: '♃', labelKey: 'admin_sidebar_notifications' },
  { key: 'audit', icon: '◈', labelKey: 'admin_sidebar_audit' },
  { key: 'settings', icon: '⚙', labelKey: 'admin_sidebar_settings' },
];

interface Props {
  active: AdminSection;
  onNavigate: (section: AdminSection) => void;
  mobileOpen: boolean;
  pendingApplications: number;
}

export default function AdminSidebar({ active, onNavigate, mobileOpen, pendingApplications }: Props) {
  const { t } = useAppContext();

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''}`}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>त्र</div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>{t('admin_console_name')}</div>
          <div className={styles.brandCaption}>{t('admin_console_caption')}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.key}
            className={`${styles.navItem} ${active === item.key ? styles.navItemActive : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{t(item.labelKey)}</span>
            {item.key === 'applications' && pendingApplications > 0 && (
              <span className={styles.navBadge}>{pendingApplications}</span>
            )}
          </button>
        ))}
      </nav>

      <div className={styles.foot}>© 2026 TredevAstro</div>
    </aside>
  );
}
