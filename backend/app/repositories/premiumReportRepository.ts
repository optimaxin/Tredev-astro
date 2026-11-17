import { query, queryOne, type Executor } from '../core/db.ts';

// Ownership ledger for Stage 6 Premium Reports — see
// migrations/049_premium_reports.sql for why it exists. Every function here
// is scoped by user_id on purpose: there is deliberately no "get by report_id
// alone" helper, so no route can accidentally read a report it has not proved
// ownership of.

export interface PremiumReportRow {
  reportId: string;
  userId: string;
  status: string;
  sectionsDone: number;
  sectionsTotal: number;
  reportType: string;
  language: string;
  subjectName: string | null;
  subjectDate: string | null;
  subjectPlace: string | null;
  createdAt: number;
  updatedAt: number;
}

interface DbRow {
  report_id: string;
  user_id: string;
  status: string;
  sections_done: number;
  sections_total: number;
  report_type: string;
  language: string;
  subject_name: string | null;
  subject_date: string | null;
  subject_place: string | null;
  created_at: string | number;
  updated_at: string | number;
}

// pg returns BIGINT as a string (it does not fit a JS number safely in
// general) — these columns are epoch millis, which do, so coerce once here
// rather than leaking strings into the API response.
function toRow(r: DbRow): PremiumReportRow {
  return {
    reportId: r.report_id,
    userId: r.user_id,
    status: r.status,
    sectionsDone: Number(r.sections_done),
    sectionsTotal: Number(r.sections_total),
    reportType: r.report_type,
    language: r.language,
    subjectName: r.subject_name,
    subjectDate: r.subject_date,
    subjectPlace: r.subject_place,
    createdAt: Number(r.created_at),
    updatedAt: Number(r.updated_at),
  };
}

export interface CreatePremiumReportInput {
  reportId: string;
  userId: string;
  idempotencyKey: string | null;
  sectionsTotal: number;
  reportType: string;
  language: string;
  subjectName: string | null;
  subjectDate: string | null;
  subjectPlace: string | null;
}

export async function createPremiumReport(input: CreatePremiumReportInput, executor?: Executor): Promise<PremiumReportRow> {
  const now = Date.now();
  const rows = await query<DbRow>(
    `INSERT INTO premium_reports
       (report_id, user_id, idempotency_key, status, sections_done, sections_total,
        report_type, language, subject_name, subject_date, subject_place, created_at, updated_at)
     VALUES ($1, $2, $3, 'queued', 0, $4, $5, $6, $7, $8, $9, $10, $10)
     RETURNING *`,
    [input.reportId, input.userId, input.idempotencyKey, input.sectionsTotal, input.reportType,
     input.language, input.subjectName, input.subjectDate, input.subjectPlace, now],
    executor
  );
  return toRow(rows[0]);
}

// The duplicate-submission lookup. Scoped by user so one user's idempotency
// key can never match — or reveal the existence of — another user's report.
export async function findByIdempotencyKey(userId: string, key: string, executor?: Executor): Promise<PremiumReportRow | undefined> {
  const row = await queryOne<DbRow>(
    'SELECT * FROM premium_reports WHERE user_id = $1 AND idempotency_key = $2',
    [userId, key],
    executor
  );
  return row ? toRow(row) : undefined;
}

// THE ownership check. Returns undefined both when the report does not exist
// and when it belongs to someone else — the caller cannot tell the two apart,
// and neither can the user, which is the point.
export async function findOwnedReport(userId: string, reportId: string, executor?: Executor): Promise<PremiumReportRow | undefined> {
  const row = await queryOne<DbRow>(
    'SELECT * FROM premium_reports WHERE user_id = $1 AND report_id = $2',
    [userId, reportId],
    executor
  );
  return row ? toRow(row) : undefined;
}

export async function listPremiumReports(userId: string, executor?: Executor): Promise<PremiumReportRow[]> {
  const rows = await query<DbRow>(
    'SELECT * FROM premium_reports WHERE user_id = $1 ORDER BY created_at DESC',
    [userId],
    executor
  );
  return rows.map(toRow);
}

// Refreshes the cached status mirror after a status poll. Also scoped by
// user_id: a mis-wired caller still cannot touch another user's row.
export async function updateCachedStatus(
  userId: string,
  reportId: string,
  status: string,
  sectionsDone: number,
  sectionsTotal: number,
  executor?: Executor
): Promise<void> {
  await query(
    `UPDATE premium_reports
        SET status = $3, sections_done = $4, sections_total = $5, updated_at = $6
      WHERE user_id = $1 AND report_id = $2`,
    [userId, reportId, status, sectionsDone, sectionsTotal, Date.now()],
    executor
  );
}
