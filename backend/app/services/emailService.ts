import { config } from '../core/config.ts';

// {{key}} substitution for template bodies/subjects — intentionally just
// this, not a templating engine: no loops/conditionals are needed for a
// one-recipient transactional email.
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

// Thin wrapper around ZeptoMail's send API — no SDK needed, it's one POST.
// https://www.zoho.com/zeptomail/help/api/email-sending.html
// Returns whether it actually sent (rather than throwing) so callers that
// want to log the outcome (notificationService.ts) can without a try/catch,
// while every pre-existing fire-and-forget caller can keep ignoring it.
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<boolean> {
  if (!config.zeptomail.apiKey) {
    console.warn(`[emailService] ZEPTOMAIL_API_KEY not set — skipping email to ${to}: ${subject}`);
    return false;
  }
  const res = await fetch('https://api.zeptomail.in/v1.1/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: config.zeptomail.apiKey },
    body: JSON.stringify({
      from: { address: config.zeptomail.fromAddress, name: config.zeptomail.fromName },
      to: [{ email_address: { address: to } }],
      subject,
      htmlbody: htmlBody,
    }),
  });
  if (!res.ok) {
    console.error(`[emailService] ZeptoMail send failed (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}
