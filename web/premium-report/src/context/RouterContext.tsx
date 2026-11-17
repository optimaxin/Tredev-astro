import React, { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// This app has exactly four screens — its own tiny history-backed router,
// not the main site's page-string switch (which also carries 40+ unrelated
// pages, cart/admin/consultation state, etc.). Same pushState/popstate
// pattern as the main site's AppContext, scaled down to what this app
// actually needs, so Back/Forward and a refresh behave the same way.
export type View = 'list' | 'create' | 'status' | 'view';

interface RouterState {
  view: View;
  reportId: string | null;
}

interface RouterContextValue extends RouterState {
  goTo: (view: View, reportId?: string | null) => void;
}

const RouterContext = createContext<RouterContextValue | null>(null);

export function useRouter(): RouterContextValue {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}

function readState(): RouterState {
  const s = window.history.state as Partial<RouterState> | null;
  const view: View = s?.view === 'create' || s?.view === 'status' || s?.view === 'view' ? s.view : 'list';
  return { view, reportId: s?.reportId ?? null };
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RouterState>(() => readState());

  useEffect(() => {
    const onPopState = () => setState(readState());
    window.addEventListener('popstate', onPopState);
    if (!window.history.state) window.history.replaceState(state, '', '');
    return () => window.removeEventListener('popstate', onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only, matches the main site's AppContext pattern
  }, []);

  const goTo = (view: View, reportId: string | null = null) => {
    const next = { view, reportId };
    setState(next);
    window.history.pushState(next, '', '');
  };

  return <RouterContext.Provider value={{ ...state, goTo }}>{children}</RouterContext.Provider>;
}
