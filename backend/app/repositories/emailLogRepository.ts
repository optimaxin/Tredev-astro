import { randomUUID } from 'node:crypto';
import { query } from '../core/db.ts';

export interface EmailLogRow {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  template_id: string | null;
  event_key: string | null;
  status: 'SENT' | 'FAILED';
  error: string | null;
  sent_by: string | null;
  sent_at: number;
}

export async function insertEmailLog(input: {
  toEmail: string; toName?: string | null; subject: string; templateId?: string | null;
  eventKey?: string | null; status: 'SENT' | 'FAILED'; error?: string | null; sentBy?: string | null;
}): Promise<EmailLogRow> {
  const row: EmailLogRow = {
    id: randomUUID(),
    to_email: input.toEmail,
    to_name: input.toName ?? null,
    subject: input.subject,
    template_id: input.templateId ?? null,
    event_key: input.eventKey ?? null,
    status: input.status,
    error: input.error ?? null,
    sent_by: input.sentBy ?? null,
    sent_at: Date.now(),
  };
  await query(
    `INSERT INTO email_log (id, to_email, to_name, subject, template_id, event_key, status, error, sent_by, sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [row.id, row.to_email, row.to_name, row.subject, row.template_id, row.event_key, row.status, row.error, row.sent_by, row.sent_at]
  );
  return row;
}

export function listEmailLog(limit = 200): Promise<EmailLogRow[]> {
  return query<EmailLogRow>('SELECT * FROM email_log ORDER BY sent_at DESC LIMIT $1', [limit]);
}
