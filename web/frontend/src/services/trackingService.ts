// Fire-and-forget page-view logging (backend/app/api/routes.ts's POST
// /track/pageview) — feeds the admin/staff Users drawer's activity trail,
// the Overview page's traffic feed, and the Leads page. Never throws, never
// blocks navigation: a dropped page-view ping is not worth a console error
// or a retry.
import { API_URL } from './apiUrl';

const VISITOR_ID_KEY = 'anon_visitor_id';

// A random id persisted once per browser so an anonymous (not-logged-in)
// visitor's repeat visits are recognized as the same "lead" instead of
// looking like a new stranger every page load (see admin.routes.ts's
// /leads, which groups page views by this id when there's no logged-in
// user). Logged-in visits don't need it — they're already grouped by
// user_id — but it's sent regardless so a user who later logs in still has
// their pre-login visits on the same device linkable by support if needed.
export function getVisitorId(): string | null {
  try {
    let id = localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    return null;
  }
}

export const trackingService = {
  pageView(path: string): void {
    const token = localStorage.getItem('auth_access_token');
    fetch(`${API_URL}/api/track/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ path, visitorId: getVisitorId() }),
    }).catch(() => {});
  },

  // Fire-and-forget lead capture — called when an anonymous (not logged in)
  // visitor submits a calculator form (see BirthDetailsForm.tsx), so their
  // name/email/phone show up on the admin Leads page instead of "Anonymous".
  // No-op for a logged-in visitor (the backend ignores it anyway; skipped
  // here too so there's no pointless network call).
  lead(name: string, email: string, phone: string | undefined, source: string): void {
    const token = localStorage.getItem('auth_access_token');
    if (token) return;
    fetch(`${API_URL}/api/track/lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId: getVisitorId(), name, email, phone, source }),
    }).catch(() => {});
  },
};
