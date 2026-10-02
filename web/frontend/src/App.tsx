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
import GoogleTranslate from './components/GoogleTranslate/GoogleTranslate';
import { applyGoogleTranslateLanguage } from './utils/googleTranslate';

function AppContent() {
  const { theme, language, page, currentUser } = useAppContext();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // The language dropdown (Navigation.tsx) picks a code; the actual
  // translation for anything this app's own TRANSLATIONS dictionary doesn't
  // cover is real Google Translate, applied here. Skipped on the very first
  // render (GoogleTranslate's widget script is still loading, nothing to
  // switch yet) — the cookie it reads on load already reflects whatever was
  // last picked, from a previous call to this same effect.
  const isFirstLanguageEffect = React.useRef(true);
  useEffect(() => {
    if (isFirstLanguageEffect.current) { isFirstLanguageEffect.current = false; return; }
    applyGoogleTranslateLanguage(language);
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
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <RealtimeProvider>
        {/* Rendered once here, outside AppContent's workspace/public branch
            switch, so it's never unmounted/remounted by that conditional —
            Google's script attaches to this exact div instance for the
            whole page lifetime. */}
        <GoogleTranslate />
        <AppContent />
      </RealtimeProvider>
    </AppProvider>
  );
}

export default App;
