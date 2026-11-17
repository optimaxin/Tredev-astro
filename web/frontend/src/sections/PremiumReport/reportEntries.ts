// The reading order of a Premium Report as displayed and printed: the report's
// own sections, in the exact order the backend returned them and numbered
// 1..N, plus two chart pages that are NOT sections (so they never take or
// shift a section number):
//   • the Birth Chart plate, after Panchang — the attached Kundli PDF's own
//     "01 Basic → 02 Kundli" order;
//   • the Divisional Charts appendix, just before the closing Disclaimer.
// Pure and React-free so it can be unit-tested (reportEntries.test.ts).
import type { ChartView, PremiumReport, ReportSection } from '../../services/premiumReportService';
import { BIRTH_CHART_AFTER, VARGA_APPENDIX_BEFORE, availableVargas, hasD1 } from './charts/chartModel';

export type ReportEntry =
  | { kind: 'section'; key: string; number: number; title: string; section: ReportSection }
  | { kind: 'birth-chart'; key: 'birth-chart'; number: null; title: string; section?: undefined }
  | { kind: 'appendix'; key: 'divisional-charts'; number: null; title: string; section?: undefined };

export function buildReportEntries(report: Pick<PremiumReport, 'sections' | 'chart'>): ReportEntry[] {
  const sections = report.sections ?? [];
  const chart: ChartView | null = report.chart ?? null;
  const entries: ReportEntry[] = sections.map((s, i) => ({ kind: 'section', key: s.section_id, number: i + 1, title: s.title, section: s }));

  // The plate is shown whenever the report has a chart object, even a broken
  // one — it then states plainly that the chart is unavailable, which a
  // reader of a "premium" report should be told rather than left to wonder.
  if (chart) {
    const plate: ReportEntry = { kind: 'birth-chart', key: 'birth-chart', number: null, title: hasD1(chart) ? 'Birth Chart' : 'Birth Chart (unavailable)' };
    const after = entries.findIndex(e => e.kind === 'section' && e.section.section_id === BIRTH_CHART_AFTER);
    const fallback = entries.findIndex(e => e.kind === 'section' && e.section.section_id === 'birth_details');
    const at = after !== -1 ? after + 1 : fallback !== -1 ? fallback + 1 : Math.min(1, entries.length);
    entries.splice(at, 0, plate);
  }

  // The appendix is pure reference: added only when there is real varga
  // data beyond D9 (which the plate already shows), never as an empty page.
  if (availableVargas(chart).some(c => c !== 'D9')) {
    const appendix: ReportEntry = { kind: 'appendix', key: 'divisional-charts', number: null, title: 'Divisional Charts' };
    const before = entries.findIndex(e => e.kind === 'section' && e.section.section_id === VARGA_APPENDIX_BEFORE);
    entries.splice(before !== -1 ? before : entries.length, 0, appendix);
  }
  return entries;
}
