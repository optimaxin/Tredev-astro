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

function AppContent() {
  const { theme, language, page, currentUser } = useAppContext();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // The Admin Console is a separate internal tool with its own layout — it
  // never shows the public site's navbar/footer chrome.
  const isAdminConsole = currentUser?.role === 'ADMIN' && ['dashboard', 'profile', 'my-jyotish'].includes(page);

  if (isAdminConsole) {
    return (
      <div className="app">
        <PageRenderer />
        <LoginModal />
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
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
