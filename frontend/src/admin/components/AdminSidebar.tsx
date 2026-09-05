import { useAppContext } from '../../context/AppContext';
import type { AdminSection } from '../adminTypes';
import styles from './AdminSidebar.module.css';

const NAV_ITEMS: { key: AdminSection; icon: string; labelKey: string }[] = [
  { key: 'overview', icon: '◈', labelKey: 'admin_sidebar_overview' },
  { key: 'applications', icon: '✦', labelKey: 'admin_sidebar_applications' },
  { key: 'astrologers', icon: '☉', labelKey: 'admin_sidebar_astrologers' },
  { key: 'users', icon: '☰', labelKey: 'admin_sidebar_users' },
  { key: 'staff', icon: '◆', labelKey: 'admin_sidebar_staff' },
  { key: 'consultations', icon: '◐', labelKey: 'admin_sidebar_consultations' },
  { key: 'reports', icon: '▤', labelKey: 'admin_sidebar_reports' },
  { key: 'orders', icon: '▢', labelKey: 'admin_sidebar_orders' },
  { key: 'pricing', icon: '🌍', labelKey: 'admin_sidebar_pricing' },
  { key: 'blog', icon: '✍', labelKey: 'admin_sidebar_blog' },
  { key: 'notifications', icon: '♃', labelKey: 'admin_sidebar_notifications' },
  { key: 'audit', icon: '◈', labelKey: 'admin_sidebar_audit' },
  { key: 'settings', icon: '⚙', labelKey: 'admin_sidebar_settings' },
];

interface Props {
  active: AdminSection;
  onNavigate: (section: AdminSection) => void;
  mobileOpen: boolean;
  // Restricts which nav items render at all — used for STAFF, whose real
  // allowed sections are per-account (see AdminConsole.tsx, which fetches
  // them from /admin/my-permissions). Undefined means no restriction (the
  // ADMIN case) — 'staff' itself is never in a STAFF account's own list, so
  // it only ever shows for an unrestricted (ADMIN) sidebar.
  allowedSections?: AdminSection[];
}

export default function AdminSidebar({ active, onNavigate, mobileOpen, allowedSections }: Props) {
  const { t, currentUser } = useAppContext();
  const items = allowedSections ? NAV_ITEMS.filter(item => allowedSections.includes(item.key)) : NAV_ITEMS;
  const isStaff = currentUser?.role === 'STAFF';

  return (
    <aside className={`${styles.sidebar} ${mobileOpen ? styles.open : ''}`}>
      <div className={styles.brand}>
        <div className={styles.brandMark}>त्र</div>
        <div className={styles.brandText}>
          <div className={styles.brandName}>{t(isStaff ? 'admin_console_name_staff' : 'admin_console_name')}</div>
          <div className={styles.brandCaption}>{t(isStaff ? 'admin_console_caption_staff' : 'admin_console_caption')}</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {items.map(item => (
          <button
            key={item.key}
            className={`${styles.navItem} ${active === item.key ? styles.navItemActive : ''}`}
            onClick={() => onNavigate(item.key)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{t(item.labelKey)}</span>
          </button>
        ))}
      </nav>

      <div className={styles.foot}>© 2026 TredevAstro</div>
    </aside>
  );
}
