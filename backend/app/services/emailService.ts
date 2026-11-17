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
      <div style="font-size:1.1rem;font-weight:700;color:#8c6d32;margin-bottom:24px;letter-spacing:0.02em;">TredevaAstro</div>
      <div style="font-size:0.95rem;line-height:1.6;">${paragraphs}</div>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e0d8;font-size:0.78rem;color:#8a8373;">
        This email was sent by TredevaAstro. If you weren't expecting it, you can safely ignore it.
      </div>
    </div>
  `;
}

// A fancier shell for the two emails every user actually sees often enough
// to care about look-and-feel (welcome + welcome-back) — logo/photo banner,
// gold CTA button — instead of the plain letter plainTextToEmailHtml gives
// every other (staff-edited, rarely-seen) template. Still takes the same
// plain-text body staff type/edit, just dresses it up more.
export function renderCreativeEmailHtml(opts: { title: string; bodyText: string; ctaLabel: string; ctaUrl: string; siteOrigin: string }): string {
  const { title, bodyText, ctaLabel, ctaUrl, siteOrigin } = opts;
  const paragraphs = escapeHtml(bodyText.trim())
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  const logoUrl = `${siteOrigin}/logo.png`;
  const photoUrl = `${siteOrigin}/Astrologist/A2.png`;
  return `
    <div style="background:#f3efe6;padding:28px 12px;font-family:Georgia,'Times New Roman',serif;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e0d8;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#5c1a2b,#3c0f1c);">
          <tr>
            <td style="padding:20px 10px 20px 24px;vertical-align:middle;">
              <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                <td style="vertical-align:middle;"><img src="${logoUrl}" width="46" height="46" style="border-radius:50%;display:block;" alt="TredevaAstro"></td>
                <td style="vertical-align:middle;padding-left:12px;">
                  <div style="font-size:1.1rem;font-weight:700;color:#f5ecd8;">TredevaAstro</div>
                  <div style="font-size:0.68rem;letter-spacing:0.08em;color:#d4a24c;text-transform:uppercase;">Jyotish &middot; Dharma &middot; Grahas</div>
                </td>
              </tr></table>
            </td>
            <td style="padding:16px 20px 0 0;text-align:right;width:84px;">
              <img src="${photoUrl}" width="72" height="72" style="border-radius:50%;object-fit:cover;border:2px solid #d4a24c;display:inline-block;" alt="TredevaAstro">
            </td>
          </tr>
        </table>
        <div style="height:4px;background:linear-gradient(90deg,#d4a24c,#f0c987,#d4a24c);"></div>
        <div style="padding:32px 28px;color:#2b2420;">
          <h1 style="margin:0 0 16px;font-size:1.3rem;color:#5c1a2b;">${escapeHtml(title)}</h1>
          <div style="font-size:0.95rem;line-height:1.65;">${paragraphs}</div>
          <div style="text-align:center;margin:28px 0 4px;">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#f0c987,#d4a24c);color:#3c1a05;font-weight:700;text-decoration:none;padding:13px 34px;border-radius:6px;font-size:0.9rem;letter-spacing:0.02em;">${escapeHtml(ctaLabel)}</a>
          </div>
          <div style="text-align:center;font-size:0.78rem;color:#8a8373;margin-top:20px;">
            Questions? Reply to this email or contact us at <a href="mailto:${config.zeptomail.identities.support.address}" style="color:#8c6d32;">${config.zeptomail.identities.support.address}</a>
          </div>
        </div>
        <div style="background:#2b141a;padding:16px 24px;text-align:center;">
          <div style="font-size:0.72rem;color:#d4a24c;">Powered by TredevaAstro &middot; &copy; ${new Date().getFullYear()}</div>
        </div>
      </div>
    </div>
  `;
}

export type EmailIdentityKey = keyof typeof config.zeptomail.identities;
export const EMAIL_IDENTITY_KEYS = Object.keys(config.zeptomail.identities) as EmailIdentityKey[];

// Thin wrapper around ZeptoMail's send API — no SDK needed, it's one POST.
// https://www.zoho.com/zeptomail/help/api/email-sending.html
// Returns whether it actually sent (rather than throwing) so callers that
// want to log the outcome (notificationService.ts) can without a try/catch,
// while every pre-existing fire-and-forget caller can keep ignoring it.
// `from` picks which configured identity (support/hiring/notifications) the
// message is sent as — defaults to the single generic address when omitted,
// same as before this existed.
export async function sendEmail(to: string, subject: string, htmlBody: string, from: { address: string; name: string } = { address: config.zeptomail.fromAddress, name: config.zeptomail.fromName }): Promise<boolean> {
  if (!config.zeptomail.apiKey) {
    console.warn(`[emailService] ZEPTOMAIL_API_KEY not set — skipping email to ${to}: ${subject}`);
    return false;
  }
  const res = await fetch('https://api.zeptomail.in/v1.1/email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: config.zeptomail.apiKey },
    body: JSON.stringify({
      from: { address: from.address, name: from.name },
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
