import { config } from '../core/config.ts';
import { plainTextToEmailHtml, renderTemplate, sendEmail, type EmailIdentityKey } from './emailService.ts';
import { insertEmailLog } from '../repositories/emailLogRepository.ts';
import { getNotifyEmails } from '../repositories/platformSettingsRepository.ts';
import type { EmailTemplateRow } from '../repositories/emailTemplateRepository.ts';

// Sends one rendered email and logs the outcome (SENT/FAILED) — the one
// path both the staff "compose" screen and notifyEvent below go through, so
// every email this app sends through a template shows up in the same log.
// `body` is plain text (what staff actually typed/edited) — this is the one
// place it gets turned into the HTML ZeptoMail actually sends. `from`
// defaults to 'support' (general TredevaAstro address) when not given.
export async function sendAndLog(input: {
  toEmail: string; toName?: string | null; subject: string; body: string;
  templateId?: string | null; eventKey?: string | null; sentBy?: string | null;
  from?: EmailIdentityKey;
}): Promise<void> {
  const identity = config.zeptomail.identities[input.from ?? 'support'];
  const ok = await sendEmail(input.toEmail, input.subject, plainTextToEmailHtml(input.body), identity).catch(() => false);
  await insertEmailLog({
    toEmail: input.toEmail, toName: input.toName, subject: input.subject,
    templateId: input.templateId, eventKey: input.eventKey, sentBy: input.sentBy,
    status: ok ? 'SENT' : 'FAILED',
    error: ok ? null : 'See server logs for the ZeptoMail response.',
  });
}

// Fires a templated notification about something that just happened to a
// user (e.g. their report finished) to the user themselves, plus whichever
// of the staff-configured head-astrologer/admin addresses are set — each
// recipient gets its own logged send, so a failure for one doesn't hide the
// others. `vars` is shared across all recipients; the user's own message
// always gets a `name` var merged in automatically.
export async function notifyEvent(params: {
  eventKey: string;
  template: EmailTemplateRow;
  vars: Record<string, string>;
  user: { email: string; name: string };
  alsoHeadAstrologer?: boolean;
  alsoAdmin?: boolean;
  from?: EmailIdentityKey;
}): Promise<void> {
  const { eventKey, template, vars, user } = params;
  const recipients: { email: string; name: string }[] = [{ email: user.email, name: user.name }];
  if (params.alsoHeadAstrologer || params.alsoAdmin) {
    const { adminEmail, headAstrologerEmail } = await getNotifyEmails();
    if (params.alsoHeadAstrologer && headAstrologerEmail) recipients.push({ email: headAstrologerEmail, name: 'Head Astrologer' });
    if (params.alsoAdmin && adminEmail) recipients.push({ email: adminEmail, name: 'Admin' });
  }
  for (const r of recipients) {
    const mergedVars = { name: r.name, ...vars };
    await sendAndLog({
      toEmail: r.email, toName: r.name,
      subject: renderTemplate(template.subject, mergedVars),
      body: renderTemplate(template.body, mergedVars),
      templateId: template.id, eventKey, from: params.from,
    });
  }
}
