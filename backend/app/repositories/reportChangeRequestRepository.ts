import { randomUUID } from 'node:crypto';
import { query, queryOne } from '../core/db.ts';
import type { AstrologyReportInput } from './astrologyReportRepository.ts';

export type ReportChangeAction = 'CREATE' | 'UPDATE' | 'DELETE';
export type ReportChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReportChangeRequestRow {
  id: string;
  action: ReportChangeAction;
  report_id: number | null;
  payload: string | null; // JSON AstrologyReportInput — null for DELETE
  requested_by: string;
  status: ReportChangeStatus;
  created_at: number;
  decided_at: number | null;
  decided_by: string | null;
}

export async function createReportChangeRequest(action: ReportChangeAction, reportId: number | null, payload: AstrologyReportInput | null, requestedBy: string): Promise<ReportChangeRequestRow> {
  const row: ReportChangeRequestRow = {
    id: randomUUID(), action, report_id: reportId, payload: payload ? JSON.stringify(payload) : null,
    requested_by: requestedBy, status: 'PENDING', created_at: Date.now(), decided_at: null, decided_by: null,
  };
  await query(
    `INSERT INTO report_change_requests (id, action, report_id, payload, requested_by, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [row.id, row.action, row.report_id, row.payload, row.requested_by, row.status, row.created_at]
  );
  return row;
}

export function listPendingReportChangeRequests(): Promise<ReportChangeRequestRow[]> {
  return query<ReportChangeRequestRow>("SELECT * FROM report_change_requests WHERE status = 'PENDING' ORDER BY created_at ASC");
}

export function findReportChangeRequestById(id: string): Promise<ReportChangeRequestRow | undefined> {
  return queryOne<ReportChangeRequestRow>('SELECT * FROM report_change_requests WHERE id = $1', [id]);
}

export async function decideReportChangeRequest(id: string, status: 'APPROVED' | 'REJECTED', decidedBy: string): Promise<void> {
  await query(
    `UPDATE report_change_requests SET status = $1, decided_at = $2, decided_by = $3 WHERE id = $4`,
    [status, Date.now(), decidedBy, id]
  );
}
