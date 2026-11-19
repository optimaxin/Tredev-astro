// Shared by every form on the site that asks a visitor to type their own
// email (BirthDetailsForm's calculators, ApplyAstrologerPage) — catches
// disposable/temp-mail addresses outright, and flags a likely typo of a
// well-known provider (e.g. "ginail.com") by edit-distance to the closest
// trusted domain. Doesn't block real custom/business domains, since those
// are usually nowhere near that close to a known provider.

// Disposable/temp-mail providers — a curated list, not an exhaustive
// detector service; catches the common ones people actually try.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com', 'tempmail.com', 'temp-mail.org', '10minutemail.com', 'guerrillamail.com',
  'yopmail.com', 'trashmail.com', 'throwawaymail.com', 'getnada.com', 'dispostable.com',
  'fakeinbox.com', 'maildrop.cc', 'sharklasers.com', 'discard.email', 'mintemail.com',
  'mailnesia.com', 'moakt.com', 'emailondeck.com', '33mail.com', 'mohmal.com', 'mailcatch.com',
  'tempinbox.com', 'spamgourmet.com', 'trbvm.com', 'mailsac.com', 'tempmailo.com',
]);

const TRUSTED_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'live.com',
  'aol.com', 'protonmail.com', 'rediffmail.com', 'zoho.com', 'yahoo.co.in', 'hotmail.co.in',
];

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

export function emailDomainIssue(email: string): string | null {
  const at = email.lastIndexOf('@');
  if (at === -1) return null; // malformed address — type="email" already handles this
  const domain = email.slice(at + 1).trim().toLowerCase();
  if (!domain) return null;
  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
    return 'Please use a valid, permanent email address — temporary/disposable email addresses are not accepted.';
  }
  if (TRUSTED_EMAIL_DOMAINS.includes(domain)) return null;
  let closest = '';
  let closestDist = Infinity;
  for (const d of TRUSTED_EMAIL_DOMAINS) {
    const dist = levenshtein(domain, d);
    if (dist < closestDist) { closestDist = dist; closest = d; }
  }
  if (closestDist > 0 && closestDist <= 2) {
    return `Please use a valid email ID — did you mean "${closest}"?`;
  }
  return null;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Full check for a required email field: format, then the domain heuristics
// above. Empty is reported as its own message so callers can distinguish
// "nothing typed yet" from "typed something invalid" if they want to.
export function validateRequiredEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Please enter your email address.';
  if (!EMAIL_RE.test(trimmed)) return 'Please enter a valid email address.';
  return emailDomainIssue(trimmed);
}
