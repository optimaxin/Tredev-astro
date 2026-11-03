import { randomUUID } from 'node:crypto';
import { query, queryOne } from '../core/db.ts';
import type { ApplicationStatus, AstrologerApplicationRow, PublicAstrologerApplication } from '../models/astrologerApplication.ts';

export interface NewApplicationInput {
  userId: string;
  expertise: string;
  experience: string;
  fullName: string;
  phoneNumber: string;
  email: string;
  languages: string;
  bio: string;
  resumeData: string | null;
  driveLink: string | null;
}

export async function createApplication(input: NewApplicationInput): Promise<AstrologerApplicationRow> {
  const row: AstrologerApplicationRow = {
    id: randomUUID(),
    user_id: input.userId,
    expertise: input.expertise,
    experience: input.experience,
    status: 'PENDING',
    submitted_at: Date.now(),
    decided_at: null,
    full_name: input.fullName,
    phone_number: input.phoneNumber,
    email: input.email,
    languages: input.languages,
    bio: input.bio,
    resume_data: input.resumeData,
    drive_link: input.driveLink,
  };
  await query(
    `INSERT INTO astrologer_applications
       (id, user_id, expertise, experience, status, submitted_at, decided_at,
        full_name, phone_number, email, languages, bio, resume_data, drive_link)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
    [
      row.id, row.user_id, row.expertise, row.experience, row.status, row.submitted_at, row.decided_at,
      row.full_name, row.phone_number, row.email, row.languages, row.bio, row.resume_data, row.drive_link,
    ]
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

function toPublic(r: AstrologerApplicationRow & { user_name: string; user_email: string }): PublicAstrologerApplication {
  return {
    id: r.id, userId: r.user_id, userName: r.user_name, userEmail: r.user_email,
    expertise: r.expertise, experience: r.experience, status: r.status,
    submittedAt: r.submitted_at, decidedAt: r.decided_at,
    fullName: r.full_name, phoneNumber: r.phone_number, email: r.email,
    languages: r.languages, bio: r.bio, resumeData: r.resume_data, driveLink: r.drive_link,
  };
}

export async function listApplicationsWithUsers(): Promise<PublicAstrologerApplication[]> {
  const rows = await query<AstrologerApplicationRow & { user_name: string; user_email: string }>(
    `SELECT aa.*, u.name AS user_name, u.email AS user_email
     FROM astrologer_applications aa
     JOIN users u ON u.id = aa.user_id
     ORDER BY aa.submitted_at DESC`
  );
  return rows.map(toPublic);
}

// Only flips PENDING -> APPROVED/REJECTED and reports whether it actually
// did — same idempotency shape as paymentRepository's markPaymentPaid. A
// double-click (or two staff racing) on Approve previously had no guard
// here at all: both calls would pass the route's own separate PENDING
// check, then both attempt the downstream role/catalog-row side effects
// (admin.routes.ts), which aren't designed to run twice for the same
// application.
export async function decideApplication(id: string, status: Exclude<ApplicationStatus, 'PENDING'>): Promise<boolean> {
  const rows = await query(
    `UPDATE astrologer_applications SET status = $1, decided_at = $2 WHERE id = $3 AND status = 'PENDING' RETURNING id`,
    [status, Date.now(), id]
  );
  return rows.length > 0;
}
