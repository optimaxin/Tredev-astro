import { randomUUID } from 'node:crypto';
import { query, queryOne } from '../core/db.ts';

export interface EmailTemplateRow {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: number;
  updated_at: number;
}

export function listEmailTemplates(): Promise<EmailTemplateRow[]> {
  return query<EmailTemplateRow>('SELECT * FROM email_templates ORDER BY name ASC');
}

export function findEmailTemplateById(id: string): Promise<EmailTemplateRow | undefined> {
  return queryOne<EmailTemplateRow>('SELECT * FROM email_templates WHERE id = $1', [id]);
}

export async function createEmailTemplate(input: { name: string; subject: string; body: string }): Promise<EmailTemplateRow> {
  const row: EmailTemplateRow = { id: randomUUID(), ...input, created_at: Date.now(), updated_at: Date.now() };
  await query(
    'INSERT INTO email_templates (id, name, subject, body, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [row.id, row.name, row.subject, row.body, row.created_at, row.updated_at]
  );
  return row;
}

export async function updateEmailTemplate(id: string, input: { name: string; subject: string; body: string }): Promise<EmailTemplateRow | undefined> {
  const rows = await query<EmailTemplateRow>(
    'UPDATE email_templates SET name = $1, subject = $2, body = $3, updated_at = $4 WHERE id = $5 RETURNING *',
    [input.name, input.subject, input.body, Date.now(), id]
  );
  return rows[0];
}

export async function deleteEmailTemplate(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM email_templates WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}
