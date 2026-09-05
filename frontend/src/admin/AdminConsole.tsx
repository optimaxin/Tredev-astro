import { lazy, Suspense, useEffect, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { adminService } from '../services/adminService';
import type { AdminSectionKey } from '../services/adminService';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import type { AdminSection } from './adminTypes';
import styles from './AdminConsole.module.css';

import OverviewPage from './pages/OverviewPage';

const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const AstrologersPage = lazy(() => import('./pages/AstrologersPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const StaffPage = lazy(() => import('./pages/StaffPage'));
const ConsultationsPage = lazy(() => import('./pages/ConsultationsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const BlogPostsPage = lazy(() => import('./pages/BlogPostsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function AdminConsole() {
  const { currentUser } = useAppContext();
  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);
  // Undefined while loading (ADMIN never restricts, so this only matters
  // for STAFF) — a STAFF session's real allowed sections, per-account and
  // toggled from the Staff page, not a single hardcoded list (see
  // backend/app/api/admin.routes.ts's requireSection).
  const [staffSections, setStaffSections] = useState<AdminSectionKey[] | null>(null);

  const isStaff = currentUser?.role === 'STAFF';

  useEffect(() => {
    if (!isStaff) return;
    adminService.getMyPermissions().then(r => setStaffSections(r.sections)).catch(() => setStaffSections([]));
  }, [isStaff]);

  if (currentUser?.role !== 'ADMIN' && !isStaff) return null;

  // 'staff' is deliberately never in a STAFF account's own allowed list —
  // managing who has admin access at all stays ADMIN-only regardless of
  // any toggle (see requireSection in admin.routes.ts, which enforces the
  // same thing server-side).
  const allowedSections: AdminSection[] | undefined = isStaff ? (staffSections || []) : undefined;

  const navigate = (next: AdminSection) => {
    if (allowedSections && !allowedSections.includes(next)) return;
    setSection(next);
    setMobileOpen(false);
  };

  const renderSection = () => {
    // Defense in depth — real enforcement is server-side (requireSection in
    // admin.routes.ts); this just stops a STAFF session from rendering a
    // page it could otherwise reach by calling navigate() directly.
    if (allowedSections && !allowedSections.includes(section)) return <OverviewPage onNavigate={navigate} allowedSections={allowedSections} />;
    switch (section) {
      case 'overview': return <OverviewPage onNavigate={navigate} allowedSections={allowedSections} />;
      case 'applications': return <ApplicationsPage />;
      case 'astrologers': return <AstrologersPage />;
      case 'users': return <UsersPage />;
      case 'staff': return <StaffPage />;
      case 'consultations': return <ConsultationsPage />;
      case 'reports': return <ReportsPage />;
      case 'orders': return <OrdersPage />;
      case 'blog': return <BlogPostsPage />;
      case 'notifications': return <NotificationsPage />;
      case 'audit': return <AuditLogsPage />;
      case 'settings': return <SettingsPage />;
      default: return null;
    }
  };

  return (
    <div className={styles.adminRoot}>
      <div className={`${styles.sidebarBackdrop} ${mobileOpen ? styles.open : ''}`} onClick={() => setMobileOpen(false)} />
      <div className={styles.shell}>
        <AdminSidebar
          active={section}
          onNavigate={navigate}
          mobileOpen={mobileOpen}
          allowedSections={allowedSections}
        />
        <div className={styles.main}>
          <AdminHeader onMenuClick={() => setMobileOpen(true)} />
          <div className={styles.content}>
            <div className={styles.contentInner}>
              <Suspense fallback={<div className={styles.loadingPad}>Loading…</div>}>
                {renderSection()}
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
