import { randomUUID } from 'node:crypto';
import { query, queryOne } from '../core/db.ts';
import type { ReportPurchaseRow } from '../models/reportPurchase.ts';

export async function createReportPurchase(userId: string, reportId: number, bundle: string, amount: number): Promise<ReportPurchaseRow> {
  const row: ReportPurchaseRow = { id: randomUUID(), user_id: userId, report_id: reportId, bundle, amount, purchased_at: Date.now() };
  await query(
    'INSERT INTO report_purchases (id, user_id, report_id, bundle, amount, purchased_at) VALUES ($1, $2, $3, $4, $5, $6)',
    [row.id, row.user_id, row.report_id, row.bundle, row.amount, row.purchased_at]
  );
  return row;
}

// Joins in the report's title at read time (report_purchases only ever
// stores report_id) so history still makes sense even if the catalog entry
// changes later.
export function listPurchasesForUser(userId: string) {
  return query<ReportPurchaseRow & { report_title: string }>(
    `SELECT rp.*, ar.title AS report_title
     FROM report_purchases rp
     JOIN astrology_reports ar ON ar.id = rp.report_id
     WHERE rp.user_id = $1
     ORDER BY rp.purchased_at DESC`,
    [userId]
  );
}

export async function listAllPurchases(page: number, limit: number) {
  const totalRow = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM report_purchases');
  const rows = await query<ReportPurchaseRow & { report_title: string; user_name: string; user_email: string }>(
    `SELECT rp.*, ar.title AS report_title, u.name AS user_name, u.email AS user_email
     FROM report_purchases rp
     JOIN astrology_reports ar ON ar.id = rp.report_id
     JOIN users u ON u.id = rp.user_id
     ORDER BY rp.purchased_at DESC
     LIMIT $1 OFFSET $2`,
    [limit, (page - 1) * limit]
  );
  return { rows, total: Number(totalRow?.n ?? 0) };
}
