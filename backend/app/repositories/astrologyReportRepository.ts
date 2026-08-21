import { query, queryOne } from '../core/db.ts';
import type { AstrologyReportRow } from '../models/astrologyReport.ts';

export function listAstrologyReports(): Promise<AstrologyReportRow[]> {
  return query<AstrologyReportRow>('SELECT * FROM astrology_reports ORDER BY display_order ASC');
}

export function findAstrologyReportById(id: number): Promise<AstrologyReportRow | undefined> {
  return queryOne<AstrologyReportRow>('SELECT * FROM astrology_reports WHERE id = $1', [id]);
}
