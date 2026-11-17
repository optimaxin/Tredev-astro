export type ReportBundle = 'report-only' | 'report-qa' | 'report-consult';

export const REPORT_BUNDLE_SURCHARGE: Record<ReportBundle, number> = {
  'report-only': 0,
  'report-qa': 300,
  'report-consult': 900,
};

export interface ReportPurchaseRow {
  id: string;
  user_id: string;
  report_id: number;
  bundle: string;
  amount: number;
  purchased_at: number;
}

export interface PublicReportPurchase {
  id: string;
  reportId: number;
  reportTitle: string;
  bundle: string;
  amount: number;
  purchasedAt: number;
}

export function toPublicReportPurchase(row: ReportPurchaseRow & { report_title: string }): PublicReportPurchase {
  return {
    id: row.id,
    reportId: row.report_id,
    reportTitle: row.report_title,
    bundle: row.bundle,
    amount: row.amount,
    purchasedAt: Number(row.purchased_at),
  };
}
