import { API_URL } from '../../frontend/src/services/apiUrl';

// Fire-and-forget click analytics for the campaign site — feeds the
// password-gated dashboard at <backend>/campaign-analytics (see
// backend/app/api/campaignAnalytics.routes.ts). Never awaited by callers
// and never throws: a dropped event is a missed data point, not something
// that should visibly affect the visitor's experience.

interface AnalyticsUser { name?: string; email?: string; phone?: string }

// Module-level rather than threaded through every trackEvent() call site —
// App.tsx sets this once (in a useEffect watching currentUser) and every
// later trackEvent() call anywhere in the app picks it up automatically, so
// individual call sites (WishCustomizer, tool-open tracking, etc.) don't
// each need their own useAppContext() just to attach the visitor's identity.
let currentAnalyticsUser: AnalyticsUser | null = null;

export function setAnalyticsUser(user: AnalyticsUser | null) {
  currentAnalyticsUser = user;
}

export function trackEvent(eventType: string, eventLabel: string, meta?: Record<string, unknown>) {
  fetch(`${API_URL}/api/campaign-analytics/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType, eventLabel, meta,
      userName: currentAnalyticsUser?.name,
      userEmail: currentAnalyticsUser?.email,
      userPhone: currentAnalyticsUser?.phone,
    }),
    keepalive: true,
  }).catch(() => {});
}
