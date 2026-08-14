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
  const { theme } = useAppContext();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
