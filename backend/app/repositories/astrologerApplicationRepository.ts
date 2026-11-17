import { randomUUID } from 'node:crypto';
import { query, queryOne } from '../core/db.ts';
import type { ApplicationStatus, AstrologerApplicationRow, PublicAstrologerApplication } from '../models/astrologerApplication.ts';

export async function createApplication(userId: string, expertise: string, experience: string): Promise<AstrologerApplicationRow> {
  const row: AstrologerApplicationRow = {
    id: randomUUID(),
    user_id: userId,
    expertise,
    experience,
    status: 'PENDING',
    submitted_at: Date.now(),
    decided_at: null,
  };
  await query(
    'INSERT INTO astrologer_applications (id, user_id, expertise, experience, status, submitted_at, decided_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
    [row.id, row.user_id, row.expertise, row.experience, row.status, row.submitted_at, row.decided_at]
  );
  return row;
}

export function findApplicationById(id: string): Promise<AstrologerApplicationRow | undefined> {
  return queryOne<AstrologerApplicationRow>('SELECT * FROM astrologer_applications WHERE id = $1', [id]);
}

export function findPendingApplicationForUser(userId: string): Promise<AstrologerApplicationRow | undefined> {
  return queryOne<AstrologerApplicationRow>(
    "SELECT * FROM astrologer_applications WHERE user_id = $1 AND status = 'PENDING'",
    [userId]
  );
}

// The applicant's own most recent application, whatever its status — lets
// their "Become an Astrologer" form show "pending"/"approved"/"rejected"
// without needing admin-list access.
export function findLatestApplicationForUser(userId: string): Promise<AstrologerApplicationRow | undefined> {
  return queryOne<AstrologerApplicationRow>(
    'SELECT * FROM astrologer_applications WHERE user_id = $1 ORDER BY submitted_at DESC LIMIT 1',
    [userId]
  );
}

export async function listApplicationsWithUsers(): Promise<PublicAstrologerApplication[]> {
  const rows = await query<AstrologerApplicationRow & { user_name: string; user_email: string }>(
    `SELECT aa.*, u.name AS user_name, u.email AS user_email
     FROM astrologer_applications aa
     JOIN users u ON u.id = aa.user_id
     ORDER BY aa.submitted_at DESC`
  );
  return rows.map(r => ({
    id: r.id, userId: r.user_id, userName: r.user_name, userEmail: r.user_email,
    expertise: r.expertise, experience: r.experience, status: r.status,
    submittedAt: r.submitted_at, decidedAt: r.decided_at,
  }));
}

export async function decideApplication(id: string, status: Exclude<ApplicationStatus, 'PENDING'>) {
  await query('UPDATE astrologer_applications SET status = $1, decided_at = $2 WHERE id = $3', [status, Date.now(), id]);
}
