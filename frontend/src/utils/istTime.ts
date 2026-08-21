// Panchang-family tools (Panchang, Choghadiya, Muhurat Finder, Abhijit
// Muhurat) are India-focused, so times are always shown in IST regardless of
// the viewer's browser timezone — showing them in the *viewer's* local zone
// would be wrong for a Mumbai/Delhi panchang viewed from anywhere else.
const IST_OFFSET_MIN = 330;

export function toIst(iso: string): Date {
  return new Date(new Date(iso).getTime() + IST_OFFSET_MIN * 60_000);
}

export function formatIst(iso: string | null): string {
  if (!iso) return '—';
  return toIst(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
}

export function istHourFraction(iso: string): number {
  const d = toIst(iso);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}
