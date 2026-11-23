import { query, queryOne } from '../core/db.ts';
import type { AstrologyReportRow } from '../models/astrologyReport.ts';

export function listAstrologyReports(): Promise<AstrologyReportRow[]> {
  return query<AstrologyReportRow>('SELECT * FROM astrology_reports ORDER BY display_order ASC');
}

export function findAstrologyReportById(id: number): Promise<AstrologyReportRow | undefined> {
  return queryOne<AstrologyReportRow>('SELECT * FROM astrology_reports WHERE id = $1', [id]);
}

// Admin/staff catalog editing (see admin.routes.ts's /reports CRUD) — a
// STAFF-submitted change goes through report_change_requests instead of
// calling these directly (see reportChangeRequestRepository.ts); only an
// ADMIN action, or an approved change request, calls these.
export interface AstrologyReportInput {
  title: string; subtitle: string; description: string;
  pages: number; sections: number; price: number; originalPrice: number | null;
  popular: boolean; color: string; icon: string; category: string; displayOrder: number;
  coverColor: string | null; coverPattern: string | null; coverImage: string | null;
}

export async function createAstrologyReport(input: AstrologyReportInput): Promise<AstrologyReportRow> {
  const rows = await query<AstrologyReportRow>(
    `INSERT INTO astrology_reports
      (title, subtitle, description, pages, sections, price, original_price, popular, color, icon, category, display_order, created_at, cover_color, cover_pattern, cover_image)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
     RETURNING *`,
    [input.title, input.subtitle, input.description, input.pages, input.sections, input.price, input.originalPrice,
      input.popular ? 1 : 0, input.color, input.icon, input.category, input.displayOrder, Date.now(),
      input.coverColor, input.coverPattern, input.coverImage]
  );
  return rows[0];
}

export async function updateAstrologyReport(id: number, input: AstrologyReportInput): Promise<AstrologyReportRow | undefined> {
  const rows = await query<AstrologyReportRow>(
    `UPDATE astrology_reports SET
       title = $1, subtitle = $2, description = $3, pages = $4, sections = $5, price = $6, original_price = $7,
       popular = $8, color = $9, icon = $10, category = $11, display_order = $12,
       cover_color = $13, cover_pattern = $14, cover_image = $15
     WHERE id = $16 RETURNING *`,
    [input.title, input.subtitle, input.description, input.pages, input.sections, input.price, input.originalPrice,
      input.popular ? 1 : 0, input.color, input.icon, input.category, input.displayOrder,
      input.coverColor, input.coverPattern, input.coverImage, id]
  );
  return rows[0];
}

export async function deleteAstrologyReport(id: number): Promise<boolean> {
  const rows = await query('DELETE FROM astrology_reports WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}
