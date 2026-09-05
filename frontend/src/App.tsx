import React, { useEffect } from 'react';
import './styles/globals.css';
import { AppProvider, useAppContext, isWorkspaceRole, WORKSPACE_PAGES } from './context/AppContext';

// Layout
import Navigation from './components/Navigation/Navigation';
import Footer from './components/Footer/Footer';
import PageRenderer from './pages/PageRenderer';
import CosmicClouds from './components/CosmicClouds/CosmicClouds';
import LoginModal from './components/LoginModal/LoginModal';
import MonkWidget from './components/MonkWidget/MonkWidget';
import { RealtimeProvider } from './realtime/RealtimeContext';
import ToastStack from './realtime/ToastStack';
import BroadcastBanner from './components/BroadcastBanner/BroadcastBanner';
import ActiveSessionBanner from './components/ActiveSessionBanner/ActiveSessionBanner';

function AppContent() {
  const { theme, language, page, currentUser } = useAppContext();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

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
      <MonkWidget />
      <ToastStack />
      <ActiveSessionBanner />
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
