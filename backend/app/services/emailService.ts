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
const ZODIAC_SAMPLE = ['Aries', 'Leo', 'Libra', 'Scorpio'];

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
  // One row, one table (was 6 nested tables, one per icon) — some clients
  // add their own "clipped message" affordance around deeply nested table
  // markup, which is what was showing up as a stray "..." button under the
  // header; this flatter version avoids that.
  const zodiacRow = ZODIAC_SAMPLE.map((sign, i) => `
    ${i > 0 ? '<td style="width:4px;"></td>' : ''}
    <td style="width:24px;height:24px;border-radius:50%;background:#F2EBD9;border:1px solid rgba(181,138,59,0.35);text-align:center;vertical-align:middle;padding:0;">
      <img src="${siteOrigin}/images/zodiac/${sign}.png" width="14" height="14" style="display:block;margin:5px auto;" alt="${sign}">
    </td>`).join('');
  return `
    <div style="background:#ECE4D6;padding:28px 12px;font-family:Georgia,'Times New Roman',serif;">
      <div style="max-width:560px;margin:0 auto;background:#FAF7F0;border-radius:14px;overflow:hidden;border:1px solid rgba(181,138,59,0.3);box-shadow:0 2px 20px rgba(23,37,58,0.08);">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F2EBD9;border-bottom:1px solid rgba(181,138,59,0.3);">
          <tr>
            <td style="padding:24px 16px 24px 24px;vertical-align:middle;text-align:left;">
              <img src="${logoUrl}" width="40" height="40" style="border-radius:50%;border:1px solid #B58A3B;display:inline-block;vertical-align:middle;" alt="TredevaAstro">
              <span style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:1.05rem;font-weight:700;color:#182333;letter-spacing:0.02em;">TredevaAstro</span>
              <div style="margin-top:4px;font-size:0.6rem;letter-spacing:0.12em;color:#8F6A22;text-transform:uppercase;">Jyotish &middot; Dharma &middot; Grahas &middot; Nakshatras</div>
            </td>
            <td style="padding:20px 24px 20px 0;vertical-align:top;text-align:right;width:118px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 10px auto;"><tr>${zodiacRow}</tr></table>
              <img src="${photoUrl}" width="118" height="157" style="border-radius:10px;border:3px solid #FAF7F0;outline:1px solid rgba(181,138,59,0.4);display:block;box-shadow:0 4px 16px rgba(23,37,58,0.12);" alt="TredevaAstro">
            </td>
          </tr>
        </table>

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

// A plain, professional invoice email — sent for every paid transaction
// (report purchase, consultation, wallet recharge, store order) straight
// from fulfillPayment, not staff-edited like the templates above. Shows a
// line-item table, the total, and (when relevant, e.g. a wallet recharge)
// the wallet balance before/after so the user has a receipt-style record.
export function renderInvoiceEmailHtml(opts: {
  toName: string;
  title: string;
  invoiceId: string;
  dateStr: string;
  lines: { label: string; amount: number }[];
  total: number;
  walletBalance: number;
  previousWalletBalance?: number;
  siteOrigin: string;
}): string {
  const { toName, title, invoiceId, dateStr, lines, total, walletBalance, previousWalletBalance } = opts;
  const rows = lines.map(l => `
    <tr>
      <td style="padding:8px 0;border-bottom:1px solid #e5e0d8;">${escapeHtml(l.label)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #e5e0d8;text-align:right;">₹${l.amount.toLocaleString('en-IN')}</td>
    </tr>`).join('');
  const balanceRows = previousWalletBalance !== undefined ? `
      <tr><td style="padding:4px 0;color:#68717A;">Previous Wallet Balance</td><td style="padding:4px 0;text-align:right;color:#68717A;">₹${previousWalletBalance.toLocaleString('en-IN')}</td></tr>
      <tr><td style="padding:4px 0;font-weight:700;">New Wallet Balance</td><td style="padding:4px 0;text-align:right;font-weight:700;">₹${walletBalance.toLocaleString('en-IN')}</td></tr>`
    : `<tr><td style="padding:4px 0;color:#68717A;">Current Wallet Balance</td><td style="padding:4px 0;text-align:right;color:#68717A;">₹${walletBalance.toLocaleString('en-IN')}</td></tr>`;
  return `
    <div style="font-family:Georgia,'Times New Roman',serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#2b2420;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;">
        <span style="font-size:1.1rem;font-weight:700;color:#8c6d32;letter-spacing:0.02em;">TredevaAstro</span>
      </div>
      <h2 style="font-size:1.1rem;margin:0 0 4px;">Invoice — ${escapeHtml(title)}</h2>
      <div style="font-size:0.8rem;color:#68717A;margin-bottom:20px;">Invoice #${escapeHtml(invoiceId)} &middot; ${escapeHtml(dateStr)}</div>
      <p style="margin:0 0 16px;font-size:0.95rem;">Dear ${escapeHtml(toName)}, thank you for your payment. Here is your invoice:</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:0.9rem;margin-bottom:8px;">
        ${rows}
        <tr><td style="padding:12px 0 4px;font-weight:700;font-size:1rem;">Total Paid</td><td style="padding:12px 0 4px;text-align:right;font-weight:700;font-size:1rem;">₹${total.toLocaleString('en-IN')}</td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:0.88rem;margin:12px 0 0;border-top:1px dashed #d8d1c4;padding-top:10px;">
        ${balanceRows}
      </table>
      <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e0d8;font-size:0.78rem;color:#8a8373;">
        This is an automated invoice from TredevaAstro. Questions? Reply to this email or contact us at <a href="mailto:${config.zeptomail.identities.support.address}" style="color:#8F6A22;">${config.zeptomail.identities.support.address}</a>.
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
