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
import KundliChatWidget from './sections/KundliSection/KundliChatWidget';

// The Kundli page's own chat widget already knows the freshly-generated
// chart's exact birth details; it renders itself there. Elsewhere on the
// site the same widget is reused for the user's saved profile chart, so
// these two never both mount at once and collide (see KundliChatWidget's
// own launcher-FAB history note).
const KUNDLI_PAGES = new Set(['free-kundli', 'kundli-result']);

function AppContent() {
  const { theme, language, page, currentUser } = useAppContext();

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
      {showSiteChat && currentUser && (
        <KundliChatWidget
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
