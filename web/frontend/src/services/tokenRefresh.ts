// Shared by every client that needs a bearer token still valid by the time
// its request lands (realtime/api.ts's sockets/heartbeats run for hours;
// the admin console is often left open well past the 15min access-token
// TTL) — proactively refreshes a token that's about to expire instead of
// waiting for a 401 to do anything about it. One shared in-flight refresh:
// refresh tokens are single-use, so two parallel refreshes would make the
// second one fail.
import { authService } from './authService';

let refreshing: Promise<string | null> | null = null;

function expiresSoon(token: string) {
  try {
    const { exp } = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof exp !== 'number' || exp * 1000 - Date.now() < 30_000;
  } catch {
    return true;
  }
}

export async function getAccessToken(): Promise<string | null> {
  const token = localStorage.getItem('auth_access_token');
  if (token && !expiresSoon(token)) return token;
  const refreshToken = localStorage.getItem('auth_refresh_token');
  if (!refreshToken) return token;
  refreshing ??= authService.refresh(refreshToken)
    .then(t => {
      localStorage.setItem('auth_access_token', t.accessToken);
      localStorage.setItem('auth_refresh_token', t.refreshToken);
      return t.accessToken;
    })
    .catch(() => token)
    .finally(() => { refreshing = null; });
  return refreshing;
}
