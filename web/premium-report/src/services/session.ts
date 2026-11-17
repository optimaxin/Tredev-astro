// Minimal access-token lifecycle for this standalone app. Reuses the main
// frontend's authService (a plain fetch client, no React/context coupling)
// directly via relative import rather than duplicating the request shape —
// see vite.config.ts's comment on what is and isn't reused that way.
import { authService } from '../../../frontend/src/services/authService';

const ACCESS_KEY = 'auth_access_token';
const REFRESH_KEY = 'auth_refresh_token';

export function getStoredAccessToken(): string | null {
  return localStorage.getItem(ACCESS_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function saveSession(accessToken: string, refreshToken: string): void {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearSession(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

function expiresSoon(token: string): boolean {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof exp !== 'number' || exp * 1000 - Date.now() < 30_000;
  } catch {
    return true;
  }
}

// One shared in-flight refresh: refresh tokens are single-use (rotated on
// every call), so two parallel refreshes would make the second one fail.
let refreshing: Promise<string | null> | null = null;

// Returns a valid access token, transparently refreshing one that is about
// to expire. A 43-section report generation easily outlives a 15-minute
// access token, so every Premium Report API call goes through this rather
// than reading localStorage directly.
export async function getAccessToken(): Promise<string | null> {
  const token = getStoredAccessToken();
  if (token && !expiresSoon(token)) return token;
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return token;
  refreshing ??= authService
    .refresh(refreshToken)
    .then(t => {
      saveSession(t.accessToken, t.refreshToken);
      return t.accessToken;
    })
    .catch(() => {
      clearSession();
      return null;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
