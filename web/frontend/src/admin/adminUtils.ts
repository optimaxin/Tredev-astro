export function formatMsg(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

// Accepts an ISO string, or an epoch-ms value — as either a number or a
// numeric string (Postgres BIGINT columns, e.g. astrologer_applications'
// submitted_at, come back from node-pg as strings, not numbers). Callers
// used to pre-convert with `new Date(x).toISOString()` before calling this,
// which throws on exactly those BIGINT-string values ("1700000000000" isn't
// a valid date string) and blanked the whole page with no error boundary to
// catch it — so this parses the raw value itself instead.
function toDate(value: string | number): Date {
  if (typeof value === 'string' && /^-?\d+$/.test(value)) return new Date(Number(value));
  return new Date(value);
}

export function formatDate(value: string | number): string {
  const d = toDate(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(value: string | number): string {
  const d = toDate(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function accountStatus(status?: 'ACTIVE' | 'SUSPENDED'): 'ACTIVE' | 'SUSPENDED' {
  return status ?? 'ACTIVE';
}

// A quick "browser on OS" summary from the raw User-Agent header — enough
// to tell traffic apart by device at a glance, not a full UA-parsing
// library. Order matters: Edge/Chrome UAs both contain "Safari", and
// Android UAs contain "Linux", so the more specific checks go first.
function browserFrom(ua: string): string {
  if (/edg\//i.test(ua)) return 'Edge';
  if (/opr\/|opera/i.test(ua)) return 'Opera';
  if (/chrome\//i.test(ua)) return 'Chrome';
  if (/crios\//i.test(ua)) return 'Chrome';
  if (/fxios\/|firefox\//i.test(ua)) return 'Firefox';
  if (/safari\//i.test(ua)) return 'Safari';
  return 'Unknown browser';
}
function osFrom(ua: string): string {
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/windows/i.test(ua)) return 'Windows';
  if (/mac os x/i.test(ua)) return 'macOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Unknown OS';
}

// The per-visit "fingerprint" shown to staff/admin: IP + a plain-language
// device summary + country, e.g. "103.21.x.x · Chrome on Android · IN".
export function visitFingerprint(v: { ip: string | null; userAgent: string | null; country: string | null }): string {
  const parts = [
    v.ip || 'Unknown IP',
    v.userAgent ? `${browserFrom(v.userAgent)} on ${osFrom(v.userAgent)}` : 'Unknown device',
    v.country || 'Unknown location',
  ];
  return parts.join(' · ');
}
