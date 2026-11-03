import React from 'react';
// The main site's design tokens/typography/.btn utility classes, reused
// directly for visual parity — the same pattern web/ganesh-chaturthi already
// uses (see its src/main.tsx). This is a stylesheet, not a feature: it adds
// no app behaviour on its own.
import '../../frontend/src/styles/globals.css';
import './styles/app.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { RouterProvider, useRouter } from './context/RouterContext';
import AuthPage from './pages/AuthPage';
import Header from './components/Header';
import MyPremiumReports from './sections/PremiumReport/MyPremiumReports';
import PremiumReportCreate from './sections/PremiumReport/PremiumReportCreate';
import PremiumReportProgress from './sections/PremiumReport/PremiumReportProgress';
import PremiumReportViewer from './sections/PremiumReport/PremiumReportViewer';

function AppShell() {
  const { currentUser, authLoading } = useAuth();
  const { view, reportId } = useRouter();

  if (authLoading) {
    return (
      <div className="pr-loading-screen" aria-busy="true">
        <div className="pr-loading-spinner" />
      </div>
    );
  }

  // Every other screen requires an authenticated TredevaAstro account —
  // the exact same accounts the main site uses, nothing new.
  if (!currentUser) return <AuthPage />;

  return (
    <div className="pr-app">
      <Header />
      {/* The viewer owns its own full-width layout (sticky contents rail +
          reading column) and opts out of pr-main's centered max-width. */}
      <main className={view === 'view' ? 'pr-main pr-main-full' : 'pr-main'}>
        {view === 'list' && <MyPremiumReports />}
        {view === 'create' && <PremiumReportCreate />}
        {view === 'status' && reportId && <PremiumReportProgress reportId={reportId} />}
        {view === 'view' && <PremiumReportViewer reportId={reportId} />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <AppShell />
      </RouterProvider>
    </AuthProvider>
  );
}
