import { lazy, Suspense, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import type { AdminSection } from './adminTypes';
import styles from './AdminConsole.module.css';

// STAFF gets a narrow slice of the console — just enough to review/approve
// astrologer applications and assign the Astrologer role from the user
// list (see backend/app/api/admin.routes.ts's staffOk-gated routes for the
// matching server-side scope). Everything else (broadcasts, blog, audit
// log, financials, suspending accounts, granting Staff/Admin) stays
// ADMIN-only, both here and enforced again server-side.
const STAFF_SECTIONS: AdminSection[] = ['overview', 'applications', 'astrologers', 'users'];

import OverviewPage from './pages/OverviewPage';

const ApplicationsPage = lazy(() => import('./pages/ApplicationsPage'));
const AstrologersPage = lazy(() => import('./pages/AstrologersPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const ConsultationsPage = lazy(() => import('./pages/ConsultationsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const OrdersPage = lazy(() => import('./pages/OrdersPage'));
const ContentPage = lazy(() => import('./pages/ContentPage'));
const BlogPostsPage = lazy(() => import('./pages/BlogPostsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

export default function AdminConsole() {
  const { currentUser, applications } = useAppContext();
  const [section, setSection] = useState<AdminSection>('overview');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isStaff = currentUser?.role === 'STAFF';
  if (currentUser?.role !== 'ADMIN' && !isStaff) return null;

  const pendingApplications = applications.filter(a => a.status === 'PENDING').length;

  const navigate = (next: AdminSection) => {
    if (isStaff && !STAFF_SECTIONS.includes(next)) return;
    setSection(next);
    setMobileOpen(false);
  };

  const renderSection = () => {
    // Defense in depth — real enforcement is server-side (staffOk-gated
    // routes in admin.routes.ts); this just stops a STAFF session from
    // rendering an admin-only page it could otherwise reach by calling
    // navigate() with an unlisted section key.
    if (isStaff && !STAFF_SECTIONS.includes(section)) return <OverviewPage onNavigate={navigate} />;
    switch (section) {
      case 'overview': return <OverviewPage onNavigate={navigate} />;
      case 'applications': return <ApplicationsPage />;
      case 'astrologers': return <AstrologersPage />;
      case 'users': return <UsersPage />;
      case 'consultations': return <ConsultationsPage />;
      case 'reports': return <ReportsPage />;
      case 'orders': return <OrdersPage />;
      case 'content': return <ContentPage />;
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
          pendingApplications={pendingApplications}
          allowedSections={isStaff ? STAFF_SECTIONS : undefined}
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
