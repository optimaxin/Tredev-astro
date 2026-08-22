import React, { useEffect } from 'react';
import './styles/globals.css';
import { AppProvider, useAppContext } from './context/AppContext';

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
  const isWorkspaceConsole =
    (currentUser?.role === 'ADMIN' || currentUser?.role === 'ASTROLOGIST') &&
    ['dashboard', 'profile', 'my-jyotish'].includes(page);

  if (isWorkspaceConsole) {
    return (
      <div className="app">
        <BroadcastBanner />
        <PageRenderer />
        <LoginModal />
        <ToastStack />
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
