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
