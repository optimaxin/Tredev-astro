import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { authService, ApiRequestError } from '../../../frontend/src/services/authService';
import type { ApiUser } from '../../../frontend/src/services/authService';
import { clearSession, getAccessToken, getStoredRefreshToken, saveSession } from '../services/session';

// The whole of this app's auth surface: email/password register, login,
// logout, and the signed-in user. No Firebase, no Google/Phone sign-in — a
// single-feature app only needs the plainest path to an authenticated
// request, and this app's users are the exact same accounts as the main
// TredevAstro site's (same backend, same `users` table).
interface AuthContextValue {
  currentUser: ApiUser | null;
  authLoading: boolean;
  authError: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phoneNumber: string) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Restores a session that already exists in this browser (a returning
  // visitor) rather than showing the sign-in form on every load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getAccessToken();
      if (!token) {
        if (!cancelled) setAuthLoading(false);
        return;
      }
      try {
        const user = await authService.me(token);
        if (!cancelled) setCurrentUser(user);
      } catch {
        clearSession();
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAuthError(null);
    try {
      const { user, accessToken, refreshToken } = await authService.login(email, password);
      saveSession(accessToken, refreshToken);
      setCurrentUser(user);
    } catch (e) {
      setAuthError(e instanceof ApiRequestError ? e.message : 'Could not sign in. Please try again.');
      throw e;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string, phoneNumber: string) => {
    setAuthError(null);
    try {
      const { user, accessToken, refreshToken } = await authService.register(name, email, password, phoneNumber);
      saveSession(accessToken, refreshToken);
      setCurrentUser(user);
    } catch (e) {
      setAuthError(e instanceof ApiRequestError ? e.message : 'Could not create your account. Please try again.');
      throw e;
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = getStoredRefreshToken();
    clearSession();
    setCurrentUser(null);
    if (refreshToken) {
      // Best-effort: an already-expired or already-revoked refresh token
      // failing here must never block the user from actually being signed
      // out on this device.
      try {
        await authService.logout(refreshToken);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const clearAuthError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider value={{ currentUser, authLoading, authError, login, register, logout, clearAuthError }}>
      {children}
    </AuthContext.Provider>
  );
}
