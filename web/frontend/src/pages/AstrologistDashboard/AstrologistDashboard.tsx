import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { astrologerService } from '../../services/astrologerService';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import { DashboardNavProvider } from './sections/shared';
import type { SectionKey } from './sections/shared';
import Overview from './sections/Overview';
import CalendarSection from './sections/CalendarSection';
import Consultations from './sections/Consultations';
import Requests from './sections/Requests';
import ChatInbox from './sections/ChatInbox';
import Clients from './sections/Clients';
import Reports from './sections/Reports';
import Earnings from './sections/Earnings';
import Reviews from './sections/Reviews';
import Availability from './sections/Availability';
import ProfileSection from './sections/ProfileSection';
import Notifications from './sections/Notifications';
import SettingsSection from './sections/SettingsSection';
import LiveQueue from './sections/LiveQueue';
import { useRealtime } from '../../realtime/RealtimeContext';
import IncomingAssignmentModal from '../../realtime/IncomingAssignmentModal';
import IdleWarningBanner from '../../realtime/IdleWarningBanner';
import NotificationPermissionOnboarding from '../../realtime/NotificationPermissionOnboarding';
import styles from './AstrologistDashboard.module.css';

const NAV_GROUPS: { label: string; items: { key: SectionKey; label: string; icon: string }[] }[] = [
  {
    label: 'Workspace',
    items: [
      { key: 'overview', label: 'Overview', icon: '◆' },
      { key: 'calendar', label: 'Calendar', icon: '▦' },
      { key: 'consultations', label: 'Consultations', icon: '◎' },
      { key: 'live-queue', label: 'Waiting Queue', icon: '⏣' },
      { key: 'requests', label: 'Requests', icon: '◉' },
      { key: 'chat-inbox', label: 'Chat', icon: '💬' },
      { key: 'clients', label: 'Clients', icon: '☉' },
    ],
  },
  {
    label: 'Practice',
    items: [
      { key: 'reports', label: 'Reports', icon: '▤' },
      { key: 'earnings', label: 'Earnings', icon: '◈' },
      { key: 'reviews', label: 'Reviews', icon: '★' },
    ],
  },
  {
    label: 'Profile',
    items: [
      { key: 'profile', label: 'My Profile', icon: '◐' },
      { key: 'availability', label: 'Availability', icon: '⚙' },
      { key: 'notifications', label: 'Notifications', icon: '♃' },
      { key: 'settings', label: 'Settings', icon: '❖' },
    ],
  },
];

const PAGE_TITLES: Record<SectionKey, string> = {
  overview: "Today's Practice",
  calendar: 'Calendar',
  consultations: 'Consultations',
  'live-queue': 'Waiting Queue',
  requests: 'Requests',
  'chat-inbox': 'Chat',
  clients: 'Clients',
  reports: 'Reports',
  earnings: 'Earnings',
  reviews: 'Reviews',
  profile: 'My Profile',
  availability: 'Availability',
  notifications: 'Notifications',
  settings: 'Settings',
};

const SECTION_COMPONENTS: Record<SectionKey, React.ComponentType> = {
  overview: Overview,
  calendar: CalendarSection,
  consultations: Consultations,
  'live-queue': LiveQueue,
  requests: Requests,
  'chat-inbox': ChatInbox,
  clients: Clients,
  reports: Reports,
  earnings: Earnings,
  reviews: Reviews,
  profile: ProfileSection,
  availability: Availability,
  notifications: Notifications,
  settings: SettingsSection,
};

const LIVE_STATUS_LABEL: Record<string, string> = {
  OFFLINE: 'Offline',
  ONLINE_AVAILABLE: 'Available',
  ONLINE_BUSY: 'Busy',
  AWAY: 'Away',
};

export default function AstrologistDashboard() {
  const { currentUser, logout, setPage, astrologerNotifications } = useAppContext();
  const { astrologerSync, goOnline, goOffline, connected } = useRealtime();
  const [section, setSection] = useState<SectionKey>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [identityMenuOpen, setIdentityMenuOpen] = useState(false);

  const [avatar, setAvatar] = useState('');
  useEffect(() => {
    let cancelled = false;
    astrologerService.getMyProfile().then(p => { if (!cancelled) setAvatar(p.avatar); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  const isSuspended = currentUser?.status === 'SUSPENDED';
  const liveStatus = astrologerSync?.status || 'OFFLINE';
  const isOnline = astrologerSync?.intent === 'ONLINE';
  const unread = astrologerNotifications.filter(n => !n.read).length + (astrologerSync?.notifications.filter(n => !n.read).length || 0);
  // Was reading AppContext's `consultationRequests` — the legacy mock
  // prototype state (seedAstrologistDemoData, localStorage['astro_requests']),
  // never written to by the real realtime backend. A genuine incoming
  // request never moved this badge at all; any stale demo data could show
  // one that didn't match what was actually in the Requests section.
  const pendingCount = astrologerSync?.pendingAssignments.length || 0;
  const pendingChatCount = astrologerSync?.pendingAssignments.filter(p => p.type === 'chat').length || 0;
  const liveQueueCount = astrologerSync?.queue.length || 0;

  const Section = SECTION_COMPONENTS[section];

  const navigate = (s: SectionKey) => { setSection(s); setMobileNavOpen(false); };

  return (
    <DashboardNavProvider value={{ navigate }}>
      <div className={styles.workspace}>
        <CelestialBackdrop variant="orbit" intensity="subtle" className={styles.backdrop} />

        <aside className={`${styles.sidebar} ${mobileNavOpen ? styles.sidebarOpen : ''}`}>
          <div className={styles.brand}>
            <div className={styles.brandName}>TredevaAstro</div>
            <div className={styles.brandLabel}>Astrologer Workspace</div>
          </div>

          <nav className={styles.nav}>
            {NAV_GROUPS.map(group => (
              <div key={group.label} className={styles.navGroup}>
                <div className={styles.navGroupLabel}>{group.label}</div>
                {group.items.map(item => (
                  <button key={item.key} className={`${styles.navItem} ${section === item.key ? styles.navItemActive : ''}`} onClick={() => navigate(item.key)}>
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                    {item.key === 'requests' && pendingCount > 0 && <span className={styles.navBadge}>{pendingCount}</span>}
                    {item.key === 'chat-inbox' && pendingChatCount > 0 && <span className={styles.navBadge}>{pendingChatCount}</span>}
                    {item.key === 'live-queue' && liveQueueCount > 0 && <span className={styles.navBadge}>{liveQueueCount}</span>}
                    {item.key === 'notifications' && unread > 0 && <span className={styles.navBadge}>{unread}</span>}
                  </button>
                ))}
              </div>
            ))}
          </nav>

          <div className={styles.identity}>
            <button className={styles.identityTrigger} onClick={() => setIdentityMenuOpen(v => !v)}>
              <div className={styles.identityAvatar}>{avatar ? <img src={avatar} alt="" className={styles.identityAvatarImg} /> : '◐'}</div>
              <div className={styles.identityInfo}>
                <div className={styles.identityName}>{currentUser?.name}</div>
                <div className={styles.identityTitle}>Vedic Astrology</div>
              </div>
              <span className={`${styles.statusDot} ${styles['statusDot_' + liveStatus]}`} title={LIVE_STATUS_LABEL[liveStatus]} />
            </button>
            {identityMenuOpen && (
              <div className={styles.identityMenu}>
                <button onClick={() => { navigate('profile'); setIdentityMenuOpen(false); }}>Profile</button>
                <button onClick={() => { navigate('settings'); setIdentityMenuOpen(false); }}>Settings</button>
                <div className={styles.identityMenuDivider} />
                <button
                  className={isOnline ? styles.identityMenuActive : ''}
                  // goOnline/goOffline already surface any failure as a toast
                  // themselves (see RealtimeContext.tsx) — this just has to
                  // not crash on the rejection they still throw for callers
                  // that want to react to it directly.
                  onClick={() => { (isOnline ? goOffline() : goOnline()).catch(() => {}); setIdentityMenuOpen(false); }}
                >
                  {isOnline ? `● ${LIVE_STATUS_LABEL[liveStatus]} — go offline` : '○ Go online'}
                </button>
                {!connected && <div className={styles.identityOfflineNote}>Realtime service unreachable</div>}
                <div className={styles.identityMenuDivider} />
                <button className={styles.identityMenuDanger} onClick={() => { logout(); setPage('home'); }}>Logout</button>
              </div>
            )}
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.header}>
            <div className={styles.headerLeft}>
              <button className={styles.mobileNavToggle} onClick={() => setMobileNavOpen(v => !v)} aria-label="Menu">☰</button>
              <div>
                <div className={styles.headerTitle}>{PAGE_TITLES[section]}</div>
                <div className={styles.headerDate}>{new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className={styles.headerRight}>
              <button className={styles.headerBtn} onClick={() => navigate('availability')}>+ <span>Add Availability</span></button>
              <button className={styles.headerIconBtn} onClick={() => navigate('notifications')} aria-label="Notifications">
                ♃{unread > 0 && <span className={styles.headerNotifBadge}>{unread}</span>}
              </button>
              <button className={styles.headerAvatar} onClick={() => navigate('profile')}>
                {avatar ? <img src={avatar} alt="" className={styles.identityAvatarImg} /> : '◐'}
              </button>
            </div>
          </header>

          {isSuspended && <div className={styles.suspendedBanner}>Your account has been suspended by TredevaAstro. You cannot accept new bookings or appear in public search until it is reactivated.</div>}

          <main className={styles.content}>
            <NotificationPermissionOnboarding />
            <IdleWarningBanner />
            <Section />
          </main>
        </div>

        <IncomingAssignmentModal />
      </div>
    </DashboardNavProvider>
  );
}
