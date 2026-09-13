import { useEffect, useState } from 'react';
import { AppProvider, useAppContext } from '../../frontend/src/context/AppContext';
import LoginModal from '../../frontend/src/components/LoginModal/LoginModal';
import FreeTools from '../../frontend/src/sections/FreeTools/FreeTools';
import { TOOLS } from './data/tools';
import OnboardingModal from './components/OnboardingModal';
import WishCustomizer from './components/WishCustomizer';
import PrintKundliPage from './PrintKundliPage';
import { trackEvent, setAnalyticsUser } from './analytics';

const TOOL_IDS = new Set(TOOLS.map(t => t.id));

const COMING_SOON = [
  { icon: '📜', label: 'Detailed Jyotish Reports' },
  { icon: '💎', label: 'TredevStore — Gemstones & Rudraksha' },
  { icon: '🎓', label: 'TredevAstro Gurukul' },
];

// Real brand marks (not emoji) — inline so there's no extra asset request.
function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M12 2c-2.72 0-3.06.01-4.12.06-1.06.05-1.79.22-2.43.47a4.9 4.9 0 0 0-1.77 1.15A4.9 4.9 0 0 0 2.53 5.45c-.25.64-.42 1.37-.47 2.43C2.01 8.94 2 9.28 2 12s.01 3.06.06 4.12c.05 1.06.22 1.79.47 2.43a4.9 4.9 0 0 0 1.15 1.77 4.9 4.9 0 0 0 1.77 1.15c.64.25 1.37.42 2.43.47C8.94 21.99 9.28 22 12 22s3.06-.01 4.12-.06c1.06-.05 1.79-.22 2.43-.47a4.9 4.9 0 0 0 1.77-1.15 4.9 4.9 0 0 0 1.15-1.77c.25-.64.42-1.37.47-2.43.05-1.06.06-1.4.06-4.12s-.01-3.06-.06-4.12c-.05-1.06-.22-1.79-.47-2.43a4.9 4.9 0 0 0-1.15-1.77 4.9 4.9 0 0 0-1.77-1.15c-.64-.25-1.37-.42-2.43-.47C15.06 2.01 14.72 2 12 2Zm0 1.8c2.67 0 2.99.01 4.04.06.97.04 1.5.2 1.85.34.47.18.8.4 1.15.75.35.35.57.68.75 1.15.14.35.3.88.34 1.85.05 1.05.06 1.37.06 4.04s-.01 2.99-.06 4.04c-.04.97-.2 1.5-.34 1.85-.18.47-.4.8-.75 1.15-.35.35-.68.57-1.15.75-.35.14-.88.3-1.85.34-1.05.05-1.37.06-4.04.06s-2.99-.01-4.04-.06c-.97-.04-1.5-.2-1.85-.34a3.1 3.1 0 0 1-1.15-.75 3.1 3.1 0 0 1-.75-1.15c-.14-.35-.3-.88-.34-1.85C3.81 14.99 3.8 14.67 3.8 12s.01-2.99.06-4.04c.04-.97.2-1.5.34-1.85.18-.47.4-.8.75-1.15.35-.35.68-.57 1.15-.75.35-.14.88-.3 1.85-.34C9.01 3.81 9.33 3.8 12 3.8Zm0 3.06a5.14 5.14 0 1 0 0 10.28 5.14 5.14 0 0 0 0-10.28Zm0 8.48a3.34 3.34 0 1 1 0-6.68 3.34 3.34 0 0 1 0 6.68Zm6.54-8.68a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0Z" />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true">
      <path d="M21.58 7.2a2.75 2.75 0 0 0-1.94-1.95C17.94 4.75 12 4.75 12 4.75s-5.94 0-7.64.5A2.75 2.75 0 0 0 2.42 7.2 28.6 28.6 0 0 0 1.92 12a28.6 28.6 0 0 0 .5 4.8 2.75 2.75 0 0 0 1.94 1.95c1.7.5 7.64.5 7.64.5s5.94 0 7.64-.5a2.75 2.75 0 0 0 1.94-1.95c.33-1.58.5-3.19.5-4.8a28.6 28.6 0 0 0-.5-4.8ZM9.88 15.02V8.98L15.4 12l-5.52 3.02Z" />
    </svg>
  );
}

// Hash-based so a specific calculator is a real shareable/bookmarkable link
// (e.g. #free-kundli) without needing a router library or a server rewrite.
function AppShell() {
  const { theme, page, setPage, currentUser, isLoggedIn, logout } = useAppContext();
  const [toolId, setToolId] = useState(() => window.location.hash.slice(1) || null);
  const [showWishModal, setShowWishModal] = useState(false);

  // Every trackEvent() call anywhere in this app (this file, WishCustomizer,
  // etc.) picks up whoever's currently logged in via analytics.ts's
  // module-level cache — kept in sync here rather than threaded through
  // every call site.
  useEffect(() => {
    setAnalyticsUser(currentUser ? { name: currentUser.name, email: currentUser.email, phone: currentUser.phoneNumber ?? undefined } : null);
  }, [currentUser]);

  // The reused calculator pages (CalculatorPageShell's ivoryPage/darkPage
  // classes) style themselves off CSS custom properties that only resolve
  // correctly once this attribute is set — the real App.tsx does the same.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const onHashChange = () => setToolId(window.location.hash.slice(1) || null);
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  // One hook point for every tool open, however the user got there (a
  // FreeTools card click, a shared #free-kundli link, browser back/forward)
  // — all of those end up changing `toolId`, so logging here instead of at
  // each individual entry point can't miss one.
  useEffect(() => {
    if (toolId) trackEvent('tool_open', toolId);
  }, [toolId]);

  // Bridges the REAL FreeTools component (below) into this app's own
  // hash-based routing. FreeTools navigates the normal main-site way —
  // calling the shared AppContext's setPage(route) — which this app
  // otherwise never looks at (it only reacts to the URL hash). Tool ids in
  // data/tools.ts are kept identical to FreeTools' own route targets
  // specifically so this one-line bridge works with no translation table.
  useEffect(() => {
    if (TOOL_IDS.has(page)) {
      window.location.hash = page;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [page]);

  // The real FreeTools' "Explore All Tools" button (featured mode) calls
  // setPage('astrology-tools') — a real main-site route, not a tool id in
  // this app. Here there's no separate page to navigate to, so treat it as
  // "scroll to the full tool grid" instead, then reset `page` so the effect
  // above doesn't also try (and fail) to treat 'astrology-tools' as a hash.
  useEffect(() => {
    if (page === 'astrology-tools') {
      document.getElementById('all-tools')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setPage('home');
    }
  }, [page, setPage]);

  // Plays as soon as the user lands on the site. Browsers block audio
  // autoplay before any user gesture, so if the initial attempt is rejected,
  // fall back to firing on the very first click/key/touch instead.
  useEffect(() => {
    const bell = new Audio('/sounds/temple-bell.mp3');
    bell.play().catch(() => {
      const playOnce = () => {
        bell.play().catch(() => {});
        events.forEach(evt => window.removeEventListener(evt, playOnce));
      };
      const events = ['pointerdown', 'keydown', 'touchstart'];
      events.forEach(evt => window.addEventListener(evt, playOnce, { once: true }));
    });
  }, []);

  // Resets `page` away from whatever tool it last held — without this,
  // clicking the SAME tool card again after going home would call
  // setPage('free-kundli') with no actual change from its current value,
  // React bails out with no re-render, and the page->hash bridge effect
  // above never fires (it only reacts to page changing), leaving the hash
  // cleared but the tool never opening.
  const goHome = () => { window.location.hash = ''; setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const tool = toolId ? TOOLS.find(t => t.id === toolId) : null;

  return (
    <div className="chromeRoot">
      <header className="chromeHeader">
        <a href="#" className="chromeBrand" onClick={e => { e.preventDefault(); goHome(); }}>
          <img src="/logo.png" alt="" className="chromeLogo" />
          <span>TredevAstro</span>
        </a>
        <div className="chromeSocials">
          <a href="https://www.instagram.com/raghu_astrologer_" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><InstagramIcon /></a>
          <a href="https://youtube.com/@raghav_tredev" target="_blank" rel="noopener noreferrer" aria-label="YouTube"><YouTubeIcon /></a>
        </div>
        <button type="button" className="chromeBadge chromeBadgeBtn" onClick={() => { setShowWishModal(true); trackEvent('wish_modal_open', 'header_button'); }}>
          🎉 Customize Your Wishes
        </button>
        {/* Testing/QA affordance — this campaign has no account area of its
            own to log out from otherwise, so a returning logged-in visitor
            (or someone re-testing the onboarding gate) had no way back to the
            logged-out state short of clearing browser storage by hand. */}
        {isLoggedIn && (
          <button type="button" className="chromeLogoutBtn" onClick={logout} title={currentUser?.email}>
            Logout
          </button>
        )}
      </header>

      <main>
        {tool ? (
          <>
            <button className="calcBack" onClick={goHome} type="button">← All calculators</button>
            {tool.render()}
          </>
        ) : (
          <>
            {/* id="hero" (not just the class) is required — the real site's
                globals.css has `section:not(#hero) { background: transparent
                !important }` as a dark-mode reset, and only exempts sections
                with this exact id (see Hero.tsx). */}
            <section className="hero" id="hero">
              <img src="/images/hero-banner.jpg" alt="Ganesh Chaturthi Special — Free Vedic astrology calculators from TredevAstro" className="heroBannerImg" />
            </section>

            {/* Free Kundli is the hero product — `featured` is the exact
                same curated large-card treatment the main site's own
                homepage gives it (FreeTools.tsx's other display mode), not
                a custom campaign-only highlight, so it stays visually
                consistent with the rest of the reused UI. */}
            <div className="container">
              <FreeTools featured />
            </div>

            <div className="container" id="all-tools">
              <FreeTools />
            </div>

            <section className="comingSoon">
              <h2 className="comingSoonTitle">The Full TredevAstro Experience — Coming Soon</h2>
              <div className="comingSoonGrid">
                {COMING_SOON.map(item => (
                  <div key={item.label} className="comingSoonCard">
                    <span className="comingSoonIcon">{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="chromeFooter">
        <p>&copy; {new Date().getFullYear()} TredevAstro — Ganesh Chaturthi Special</p>
      </footer>

      <LoginModal />
      <OnboardingModal />
      {showWishModal && <WishCustomizer onClose={() => setShowWishModal(false)} />}
    </div>
  );
}

// AppProvider is the real main-site context — needed because KundliSection
// (the Free Kundli tool) uses it directly for saving birth details, PDF
// download, and login-gating, exactly as it does on the main site.
export default function App() {
  // Headless-browser-only path (see PrintKundliPage.tsx) — never navigated
  // to by a real visitor, so it deliberately skips AppProvider/AppShell
  // entirely rather than paying for chrome no one will ever see.
  if (window.location.pathname === '/print-kundli') {
    return <PrintKundliPage />;
  }
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
