import { config } from '../core/config.ts';

// Thin wrapper around ZeptoMail's send API — no SDK needed, it's one POST.
// https://www.zoho.com/zeptomail/help/api/email-sending.html
export async function sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
  if (!config.zeptomail.apiKey) {
    console.warn(`[emailService] ZEPTOMAIL_API_KEY not set — skipping email to ${to}: ${subject}`);
    return;
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
  }
}
