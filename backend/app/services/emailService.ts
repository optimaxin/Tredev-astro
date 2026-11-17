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

// A handful of the site's own zodiac icon assets (public/images/zodiac/),
// shown as a plain decorative row — not tied to any user's actual sign,
// and deliberately real artwork rather than emoji/unicode glyphs.
const ZODIAC_SAMPLE = ['Aries', 'Leo', 'Libra', 'Scorpio', 'Capricorn', 'Pisces'];

// A light, parchment-and-gold themed shell for the two emails every user
// actually sees often enough to care about look-and-feel (welcome +
// welcome-back) — same warm ivory/gold palette as the site's own light
// theme (globals.css), the site's real zodiac icon set instead of emoji,
// and the astrologer photo shown at its real aspect ratio (no object-fit,
// which most email clients don't honor and which was distorting/breaking
// it). Deliberately not a re-skin of the plain letter plainTextToEmailHtml
// gives every other (staff-edited, rarely-seen) template. Still takes the
// same plain-text body staff type/edit, just dresses it up more.
export function renderCreativeEmailHtml(opts: { title: string; bodyText: string; ctaLabel: string; ctaUrl: string; siteOrigin: string }): string {
  const { title, bodyText, ctaLabel, ctaUrl, siteOrigin } = opts;
  const paragraphs = escapeHtml(bodyText.trim())
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  const logoUrl = `${siteOrigin}/logo.png`;
  const photoUrl = `${siteOrigin}/Astrologist/A2.png`;
  const zodiacRow = ZODIAC_SAMPLE.map(sign => `
    <td style="padding:0 6px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="width:30px;height:30px;border-radius:50%;background:#F2EBD9;border:1px solid rgba(181,138,59,0.35);">
        <tr><td style="text-align:center;vertical-align:middle;"><img src="${siteOrigin}/images/zodiac/${sign}.png" width="18" height="18" style="display:inline-block;vertical-align:middle;" alt="${sign}"></td></tr>
      </table>
    </td>`).join('');
  return `
    <div style="background:#ECE4D6;padding:28px 12px;font-family:Georgia,'Times New Roman',serif;">
      <div style="max-width:560px;margin:0 auto;background:#FAF7F0;border-radius:14px;overflow:hidden;border:1px solid rgba(181,138,59,0.3);box-shadow:0 2px 20px rgba(23,37,58,0.08);">

        <div style="background:#F2EBD9;padding:28px 24px 24px;text-align:center;border-bottom:1px solid rgba(181,138,59,0.3);">
          <img src="${logoUrl}" width="44" height="44" style="border-radius:50%;border:1px solid #B58A3B;display:inline-block;vertical-align:middle;" alt="TredevaAstro">
          <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:1.1rem;font-weight:700;color:#182333;letter-spacing:0.02em;">TredevaAstro</span>
          <div style="margin-top:4px;font-size:0.64rem;letter-spacing:0.14em;color:#8F6A22;text-transform:uppercase;">Jyotish &middot; Dharma &middot; Grahas &middot; Nakshatras</div>

          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:18px auto 20px;"><tr>${zodiacRow}</tr></table>

          <img src="${photoUrl}" width="118" height="157" style="border-radius:10px;border:3px solid #FAF7F0;outline:1px solid rgba(181,138,59,0.4);display:block;margin:0 auto;box-shadow:0 4px 16px rgba(23,37,58,0.12);" alt="TredevaAstro">
        </div>

        <div style="padding:28px 28px 32px;color:#182333;">
          <h1 style="margin:0 0 16px;font-size:1.3rem;color:#182333;text-align:center;font-weight:600;">${escapeHtml(title)}</h1>
          <div style="font-size:0.95rem;line-height:1.65;">${paragraphs}</div>
          <div style="text-align:center;margin:28px 0 4px;">
            <a href="${ctaUrl}" style="display:inline-block;background:#B58A3B;color:#FAF7F0;font-weight:700;text-decoration:none;padding:13px 34px;border-radius:6px;font-size:0.9rem;letter-spacing:0.02em;">${escapeHtml(ctaLabel)}</a>
          </div>
          <div style="text-align:center;font-size:0.78rem;color:#68717A;margin-top:22px;">
            Questions? Reply to this email or contact us at <a href="mailto:${config.zeptomail.identities.support.address}" style="color:#8F6A22;">${config.zeptomail.identities.support.address}</a>
          </div>
        </div>

        <div style="background:#F2EBD9;padding:16px 24px;text-align:center;border-top:1px solid rgba(181,138,59,0.3);">
          <div style="font-size:0.72rem;color:#8F6A22;">Powered by TredevaAstro &middot; &copy; ${new Date().getFullYear()}</div>
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
