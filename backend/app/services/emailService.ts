import { config } from '../core/config.ts';

// {{key}} substitution for template bodies/subjects — intentionally just
// this, not a templating engine: no loops/conditionals are needed for a
// one-recipient transactional email.
export function renderTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Staff write and edit templates as plain text — the same thing they'd type
// into any ordinary email client, no HTML knowledge needed. This turns that
// plain text into a clean, professional-looking HTML email: a blank line
// starts a new paragraph, a single line break stays a line break within one.
// escapeHtml first so a stray '<' or '&' the staff typed can't break the
// layout (or, for a templated send, so a variable's value can't inject markup).
export function plainTextToEmailHtml(text: string): string {
  const paragraphs = escapeHtml(text.trim())
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `
    <div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#2b2420;">
      <div style="font-size:1.1rem;font-weight:700;color:#8c6d32;margin-bottom:24px;letter-spacing:0.02em;">TredevAastro</div>
      <div style="font-size:0.95rem;line-height:1.6;">${paragraphs}</div>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e0d8;font-size:0.78rem;color:#8a8373;">
        This email was sent by TredevAastro. If you weren't expecting it, you can safely ignore it.
      </div>
    </div>
  `;
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
