// Domains treated as "real" mainstream email providers — shared by signup
// validation (auth.routes.ts, blocks disposable/throwaway addresses at
// registration) and the campaign analytics dashboard (filters out
// dev/test-seed accounts — @example.com, @tredevastro.local, etc. — from
// the visitor list, since those aren't real campaign users).
export const MAINSTREAM_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'outlook.com', 'hotmail.com', 'live.com', 'msn.com',
  'yahoo.com', 'yahoo.co.in', 'yahoo.co.uk', 'ymail.com', 'rocketmail.com',
  'icloud.com', 'me.com', 'mac.com',
  'aol.com',
  'protonmail.com', 'proton.me',
  'zoho.com', 'zohomail.com',
  'rediffmail.com',
  'optimaxin.com', 'tredevastro.com', 'tredevlearn.com',
]);

export function isMainstreamEmail(email: string): boolean {
  return MAINSTREAM_EMAIL_DOMAINS.has(email.split('@')[1] ?? '');
}
