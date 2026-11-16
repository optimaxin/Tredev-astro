import React, { useEffect } from 'react';
import './styles/globals.css';
import { AppProvider, useAppContext, isWorkspaceRole, WORKSPACE_PAGES } from './context/AppContext';

// Layout
import Navigation from './components/Navigation/Navigation';
import Footer from './components/Footer/Footer';
import PageRenderer from './pages/PageRenderer';
import CosmicClouds from './components/CosmicClouds/CosmicClouds';
import LoginModal from './components/LoginModal/LoginModal';
import PaymentResultModal from './components/PaymentResultModal/PaymentResultModal';
import { RealtimeProvider } from './realtime/RealtimeContext';
import ToastStack from './realtime/ToastStack';
import BroadcastBanner from './components/BroadcastBanner/BroadcastBanner';
import ActiveSessionBanner from './components/ActiveSessionBanner/ActiveSessionBanner';
import KundliChatWidget from './sections/KundliSection/KundliChatWidget';

// The Kundli page's own chat widget already knows the freshly-generated
// chart's exact birth details; it renders itself there. Elsewhere on the
// site the same widget is reused for the user's saved profile chart, so
// these two never both mount at once and collide (see KundliChatWidget's
// own launcher-FAB history note).
const KUNDLI_PAGES = new Set(['free-kundli', 'kundli-result']);

function AppContent() {
  const { theme, page, currentUser } = useAppContext();

  const hasBirthDetails = !!(
    currentUser?.birthDate &&
    currentUser?.birthTime &&
    currentUser?.birthLatitude != null &&
    currentUser?.birthLongitude != null &&
    currentUser?.birthTimezoneOffsetMinutes != null
  );
  const showSiteChat = hasBirthDetails && !KUNDLI_PAGES.has(page);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Always 'en' — every string on this page is actually written in English
  // (see AppContext.tsx's t()); this is what lets a visitor's own browser
  // correctly detect the page's real language and offer its own native
  // translate feature, rather than us driving any translation ourselves.
  // The language dropdown (Navigation.tsx) only sets a UI preference now.
  useEffect(() => {
    document.documentElement.lang = 'en';
  }, []);

  // The Admin Console and Astrologer Workspace are separate internal tools
  // with their own layout — they never show the public site's navbar/footer
  // chrome (the astrologer workspace renders its own header internally).
  // AppContext's invariant effect keeps `page` inside WORKSPACE_PAGES for
  // these roles at all times (login, session restore, and browser back/
  // forward all funnel through it), so this check alone is always accurate.
  const isWorkspaceConsole = isWorkspaceRole(currentUser?.role) && WORKSPACE_PAGES.includes(page);

  if (isWorkspaceConsole) {
    return (
      <div className="app">
        <BroadcastBanner />
        <PageRenderer />
        <LoginModal />
        <PaymentResultModal />
        <ToastStack />
        <ActiveSessionBanner />
      </div>
    );
  }

  return (
    <div className="app">
      <CosmicClouds />
      <Navigation />

      <main>
        <PageRenderer />
      </main>

      <Footer />
      <LoginModal />
      <PaymentResultModal />
      <ToastStack />
      <ActiveSessionBanner />
      {showSiteChat && currentUser && (
        <KundliChatWidget
          autoOpen={false}
          chartKey={`${currentUser.birthDate}T${currentUser.birthTime}@${currentUser.birthLatitude!.toFixed(4)},${currentUser.birthLongitude!.toFixed(4)}`}
          displayName={currentUser.name}
          birth={{
            date: currentUser.birthDate!,
            time: currentUser.birthTime!,
            timezoneOffsetMinutes: currentUser.birthTimezoneOffsetMinutes!,
            latitude: currentUser.birthLatitude!,
            longitude: currentUser.birthLongitude!,
            name: currentUser.name,
            placeLabel: currentUser.birthPlace || undefined,
          }}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AppProvider>
  );
}

export default App;
