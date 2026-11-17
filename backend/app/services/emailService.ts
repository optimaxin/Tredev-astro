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

// The 12 zodiac glyphs, used purely as a decorative strip (not tied to any
// user's actual sign) — a quick recognizable "astrology" motif for the
// welcome emails below.
const ZODIAC_STRIP = '&#9800; &#9801; &#9802; &#9803; &#9804; &#9805; &#9806; &#9807; &#9808; &#9809; &#9810; &#9811;';

// A cosmic, astrology-themed shell for the two emails every user actually
// sees often enough to care about look-and-feel (welcome + welcome-back) —
// starfield header, zodiac-wheel motif, glowing photo medallion, gold
// "portal" CTA — deliberately not just a re-skinned version of the plain
// letter plainTextToEmailHtml gives every other (staff-edited, rarely-seen)
// template. Still takes the same plain-text body staff type/edit, just
// dresses it up a lot more.
export function renderCreativeEmailHtml(opts: { title: string; bodyText: string; ctaLabel: string; ctaUrl: string; siteOrigin: string }): string {
  const { title, bodyText, ctaLabel, ctaUrl, siteOrigin } = opts;
  const paragraphs = escapeHtml(bodyText.trim())
    .split(/\n{2,}/)
    .map(p => `<p style="margin:0 0 14px;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  const logoUrl = `${siteOrigin}/logo.png`;
  const photoUrl = `${siteOrigin}/Astrologist/A2.png`;
  const starfield = 'radial-gradient(1px 1px at 12% 22%, #f0c987 50%, transparent 52%), '
    + 'radial-gradient(1px 1px at 28% 68%, #f0c987 50%, transparent 52%), '
    + 'radial-gradient(1.5px 1.5px at 44% 15%, #ffe8b8 50%, transparent 52%), '
    + 'radial-gradient(1px 1px at 58% 78%, #f0c987 50%, transparent 52%), '
    + 'radial-gradient(1.5px 1.5px at 72% 32%, #ffe8b8 50%, transparent 52%), '
    + 'radial-gradient(1px 1px at 85% 60%, #f0c987 50%, transparent 52%), '
    + 'radial-gradient(1px 1px at 93% 20%, #f0c987 50%, transparent 52%), '
    + 'radial-gradient(1.5px 1.5px at 8% 85%, #ffe8b8 50%, transparent 52%), '
    + 'linear-gradient(160deg, #1b1033, #2a1245 55%, #170c29)';
  return `
    <div style="background:#0d0718;padding:28px 12px;font-family:Georgia,'Times New Roman',serif;">
      <div style="max-width:560px;margin:0 auto;background:#120a1e;border-radius:18px;overflow:hidden;border:1px solid #3a2a5c;box-shadow:0 0 24px rgba(240,201,135,0.12);">

        <div style="background:${starfield};padding:26px 24px 22px;text-align:center;position:relative;">
          <img src="${logoUrl}" width="36" height="36" style="border-radius:50%;border:1px solid #d4a24c;display:inline-block;vertical-align:middle;" alt="TredevaAstro">
          <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:1.05rem;font-weight:700;color:#f5ecd8;letter-spacing:0.02em;">TredevaAstro</span>
          <div style="margin-top:4px;font-size:0.64rem;letter-spacing:0.14em;color:#c9a86a;text-transform:uppercase;">Jyotish &middot; Dharma &middot; Grahas &middot; Nakshatras</div>

          <div style="margin:18px 0 4px;font-size:0.95rem;letter-spacing:0.15em;color:#8a6fc9;">${ZODIAC_STRIP}</div>

          <div style="margin:18px auto 4px;width:112px;height:112px;border-radius:50%;background:radial-gradient(circle,rgba(240,201,135,0.35),rgba(240,201,135,0) 70%);padding:6px;">
            <img src="${photoUrl}" width="100" height="100" style="border-radius:50%;object-fit:cover;border:3px solid #f0c987;display:block;margin:0 auto;" alt="TredevaAstro">
          </div>
          <div style="font-size:0.72rem;letter-spacing:0.08em;color:#d4a24c;margin-top:10px;">&#9728;&nbsp;&nbsp;&#9770;&nbsp;&nbsp;&#9789;</div>
        </div>

        <div style="text-align:center;padding:14px 0 0;color:#5c3fa8;font-size:0.9rem;letter-spacing:0.3em;background:#120a1e;">&#10022;&nbsp;&nbsp;&#10022;&nbsp;&nbsp;&#10022;&nbsp;&nbsp;&#10022;&nbsp;&nbsp;&#10022;</div>

        <div style="background:#fdfaf3;padding:28px 28px 32px;color:#2b2420;">
          <h1 style="margin:0 0 16px;font-size:1.3rem;color:#4a1f73;text-align:center;">${escapeHtml(title)}</h1>
          <div style="font-size:0.95rem;line-height:1.65;">${paragraphs}</div>
          <div style="text-align:center;margin:28px 0 4px;">
            <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,#f0c987,#d4a24c);color:#3c1a05;font-weight:700;text-decoration:none;padding:13px 34px;border-radius:30px;font-size:0.9rem;letter-spacing:0.02em;box-shadow:0 4px 14px rgba(212,162,76,0.4);">&#10022;&nbsp; ${escapeHtml(ctaLabel)} &nbsp;&#10022;</a>
          </div>
          <div style="text-align:center;font-size:0.78rem;color:#8a8373;margin-top:22px;">
            Questions? Reply to this email or contact us at <a href="mailto:${config.zeptomail.identities.support.address}" style="color:#8c6d32;">${config.zeptomail.identities.support.address}</a>
          </div>
        </div>

        <div style="background:#120a1e;padding:16px 24px;text-align:center;">
          <div style="font-size:0.85rem;letter-spacing:0.1em;color:#5c3fa8;margin-bottom:6px;">${ZODIAC_STRIP}</div>
          <div style="font-size:0.72rem;color:#c9a86a;">Powered by TredevaAstro &middot; &copy; ${new Date().getFullYear()}</div>
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
