// Thin client for the Premium Report API (backend/app/api/premiumReports.routes.ts).
// Nothing else in the frontend should fetch /api/premium-reports directly —
// this is the one place that knows the request/response shape.
//
// Note on what this does NOT know: the Stage 6 report service's own URL. That
// service has no authentication, so the backend proxies it and enforces login
// plus per-user report ownership. The browser only ever talks to API_URL.

import { API_URL } from './apiUrl';

export class PremiumReportApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status = 0) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, accessToken: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/premium-reports${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
    });
  } catch {
    throw new PremiumReportApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new PremiumReportApiError(
      body?.error?.code || (res.status === 401 ? 'UNAUTHORIZED' : 'UNKNOWN'),
      body?.error?.message || 'Something went wrong.',
      res.status
    );
  }
  return body.data as T;
}

// ── wire types (mirroring the backend's responses exactly) ────────────────

export interface PremiumBirthDetails {
  date: string;              // YYYY-MM-DD
  time: string;              // HH:MM, 24h
  // "UTC = local - offset", so India (UTC+5:30) is +330 — the same
  // convention BirthDetailsForm.TIMEZONES uses. Passed through unchanged.
  timezoneOffsetMinutes: number;
  latitude: number;
  longitude: number;
  placeLabel?: string | null;
}

export interface GenerateReportInput {
  birthDetails?: PremiumBirthDetails;
  chartId?: number;
  subjectName?: string;
  reportType?: 'premium' | 'vertical_slice';
  language?: string;
  userNotes?: string;
  idempotencyKey?: string;
}

export interface GenerateReportResult {
  reportId: string;
  status: string;
  sections: number;
  // True when this request matched an earlier submission's idempotency key,
  // i.e. no new generation was started. The UI uses it to resume the
  // existing report quietly instead of announcing a new one.
  duplicate: boolean;
}

// Section lifecycle, from kb_report/schemas.py.
export type SectionStatus = 'pending' | 'generating' | 'completed' | 'invalid' | 'failed' | 'skipped';
// Report lifecycle. 'completed' | 'partial' | 'failed' are terminal.
export type ReportStatus = 'queued' | 'generating' | 'completed' | 'partial' | 'failed';

export const TERMINAL_STATUSES: ReportStatus[] = ['completed', 'partial', 'failed'];

export function isTerminal(status: string): boolean {
  return (TERMINAL_STATUSES as string[]).includes(status);
}

export interface ReportStatusResult {
  reportId: string;
  status: ReportStatus;
  progress: { done: number; total: number };
  sectionStatus: Record<string, SectionStatus>;
  counts: Record<string, number>;
  error: { code: string; message: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSection {
  section_id: string;
  title: string;
  kind: 'structured' | 'llm' | 'summary';
  status: SectionStatus;
  content: string | null;
  key_points?: string[];
  chart_facts_used?: Array<{ id: string; statement: string }>;
  unavailable_factors?: string[];
  validation?: { valid: boolean; issues: Array<{ code: string; message: string }>; warnings: Array<{ code: string; message: string }>; repairs: string[] };
  error?: { code?: string; message?: string } | null;
  started_at?: string;
  completed_at?: string;
}

export interface PremiumReport {
  report_id: string;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
  error: { code?: string; message?: string } | null;
  // Section ORDER in this array is the report's defined reading order and is
  // rendered as-is. The viewer never sorts, filters or rewrites it.
  sections: ReportSection[];
  section_status: Record<string, SectionStatus>;
  // The drawable chart the report was written from (null if the engine's
  // chart is unavailable). See ChartView below.
  chart: ChartView | null;
  // Added by this project's backend from its own ownership ledger, so the
  // cover can say whose chart this is.
  subject?: { name: string | null; date: string | null; place: string | null };
}

// ── Chart view (backend/app/services/premiumReportView.ts) ─────────────────
// The minimum the viewer needs to DRAW the chart, copied unchanged from the
// Kundli Engine chart that Stage 6 persisted alongside the report — so the
// charts always agree with the text written from that same chart. Every
// optional part is null when the engine did not return it; the viewer then
// shows it as unavailable rather than drawing anything in its place.
export interface ChartPlanetView {
  planet: string;              // "Sun", "Moon", ... "Rahu", "Ketu", "Uranus", ...
  classical: boolean | null;   // the 9 grahas; Uranus/Neptune/Pluto are false
  rashi: string;
  degree_in_sign: number | null;
  house: number;               // the engine's own whole-sign house, 1-12
  nakshatra: string | null;
  nakshatra_pada: number | null;
  nakshatra_lord: string | null;
  retrograde: boolean | null;
}

export interface PeriodView { lord: string; starts_at: string; ends_at: string } // YYYY-MM-DD
export interface MahadashaView extends PeriodView { antardashas: PeriodView[] }
export interface YoginiView extends PeriodView { yogini: string | null }
export interface VargaView { ascendant_rashi: string; placements: { planet: string; rashi: string; house: number }[] }

export interface ChartView {
  birth: { date: string | null; time: string | null; place: string | null; timezone_offset_minutes: number | null } | null;
  lagna: { rashi: string; degree_in_sign: number | null };
  planets: ChartPlanetView[];
  moon_nakshatra: { name: string | null; pada: number | null; lord: string | null } | null;
  vimshottari: MahadashaView[] | null;
  yogini: YoginiView[] | null;
  divisional_charts: Record<string, VargaView> | null;   // D2..D60, D9 included
  planet_strength: { planet: string; shadbala_rupas: number; min_required_rupas: number; is_strong: boolean | null }[] | null;
  doshas: {
    kaal_sarp: { present: boolean | null } | null;
    sade_sati: { active: boolean | null; phase: string | null } | null;
    pitra: { present: boolean | null } | null;
  } | null;
  as_of: string | null;        // when time-dependent facts (Sade Sati) were computed
}

export interface PremiumReportListEntry {
  reportId: string;
  status: ReportStatus;
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

export interface BlueprintSection {
  section_id: string;
  title: string;
  kind: string;
  priority: string;
  profiles: string[];
}

export const premiumReportService = {
  generate: (accessToken: string, input: GenerateReportInput) =>
    request<GenerateReportResult>('/generate', accessToken, { method: 'POST', body: JSON.stringify(input) }),

  status: (accessToken: string, reportId: string) =>
    request<ReportStatusResult>(`/${reportId}/status`, accessToken, { method: 'GET' }),

  get: (accessToken: string, reportId: string) =>
    request<PremiumReport>(`/${reportId}`, accessToken, { method: 'GET' }),

  section: (accessToken: string, reportId: string, sectionId: string) =>
    request<ReportSection>(`/${reportId}/sections/${sectionId}`, accessToken, { method: 'GET' }),

  // Continues a partial/failed report. Completed sections are never
  // regenerated upstream, so this is safe to call more than once.
  resume: (accessToken: string, reportId: string) =>
    request<{ reportId: string; status: ReportStatus }>(`/${reportId}/resume`, accessToken, { method: 'POST' }),

  list: (accessToken: string) => request<PremiumReportListEntry[]>('/', accessToken, { method: 'GET' }),

  blueprint: (accessToken: string) =>
    request<{ sections: BlueprintSection[]; premium_enabled: boolean }>('/blueprint', accessToken, { method: 'GET' }),
};
