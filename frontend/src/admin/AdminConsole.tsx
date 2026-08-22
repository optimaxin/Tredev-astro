import { lazy, Suspense, useState } from 'react';
import { useAppContext } from '../context/AppContext';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import type { AdminSection } from './adminTypes';
import styles from './AdminConsole.module.css';

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

  if (currentUser?.role !== 'ADMIN') return null;

  const pendingApplications = applications.filter(a => a.status === 'PENDING').length;

  const navigate = (next: AdminSection) => {
    setSection(next);
    setMobileOpen(false);
  };

  const renderSection = () => {
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
