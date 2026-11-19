// Fire-and-forget page-view logging (backend/app/api/routes.ts's POST
// /track/pageview) — feeds the admin/staff Users drawer's activity trail.
// Never throws, never blocks navigation: a dropped page-view ping is not
// worth a console error or a retry.
import { API_URL } from './apiUrl';

export const trackingService = {
  pageView(path: string): void {
    const token = localStorage.getItem('auth_access_token');
    fetch(`${API_URL}/api/track/pageview`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ path }),
    }).catch(() => {});
  },
};
