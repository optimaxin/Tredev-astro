// Transport layer for the Stage 6 Premium Report service (kb_report/api.py,
// FastAPI). This is the ONLY place in the system that knows that service's
// URL or speaks its wire format.
//
// Security posture: the Stage 6 service has no authentication and no concept
// of a user — anyone who can reach it and guess a 16-hex report id can read
// that report's birth details and full content. It is therefore expected to
// be bound to localhost (or a private network) and is never reachable from a
// browser. Authentication and ownership are enforced one layer up, in
// api/premiumReports.routes.ts, before any function here is called.
import { config } from '../core/config.ts';

export class PremiumReportUpstreamError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Stage 6 speaks three different error shapes depending on where the failure
// happened, so normalize all of them into one before anything upstream of
// this file has to care:
//   its own handlers   -> {success: false, error: {code, message}}
//   fastapi HTTPException -> {detail: "..."}
//   pydantic validation   -> {detail: [{loc, msg, type}, ...]}
function normalizeError(status: number, body: any): PremiumReportUpstreamError {
  if (body?.error?.code) return new PremiumReportUpstreamError(body.error.code, body.error.message ?? 'Upstream error', status);
  const detail = body?.detail;
  if (typeof detail === 'string') return new PremiumReportUpstreamError(status === 404 ? 'REPORT_NOT_FOUND' : 'UPSTREAM_ERROR', detail, status);
  if (Array.isArray(detail)) {
    const msg = detail.map((d: any) => `${(d.loc ?? []).slice(1).join('.') || 'body'}: ${d.msg}`).join('; ');
    return new PremiumReportUpstreamError('INVALID_REQUEST', msg || 'Invalid request', 422);
  }
  return new PremiumReportUpstreamError('UPSTREAM_ERROR', `Report service returned HTTP ${status}`, status);
}

async function upstream<T>(path: string, options: { method?: string; body?: unknown; bearerToken?: string | null } = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.premiumReport.timeoutMs);
  let res: Response;
  try {
    res = await fetch(`${config.premiumReport.baseUrl}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Forwarded ONLY for chart_id generation, where Stage 6 has to call
        // the Kundli Engine's authenticated kundli-history endpoint on this
        // user's behalf. It is the user's own token, used for the user's own
        // data, over a private hop — and it is never persisted or logged.
        ...(options.bearerToken ? { Authorization: `Bearer ${options.bearerToken}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
  } catch (e) {
    // An abort and a genuine connection failure are different operator
    // problems, so they get different codes — but neither leaks the URL.
    if ((e as Error)?.name === 'AbortError') {
      throw new PremiumReportUpstreamError('REPORT_SERVICE_TIMEOUT', 'The report service did not respond in time. Please try again.', 504);
    }
    throw new PremiumReportUpstreamError('REPORT_SERVICE_UNAVAILABLE', 'The report service is currently unavailable. Please try again shortly.', 503);
  } finally {
    clearTimeout(timer);
  }
  // res.json() is typed `unknown` — this is an untrusted upstream payload, so
  // it is only ever narrowed through normalizeError's optional chaining and
  // the success check below.
  const body = (await res.json().catch(() => null)) as { success?: boolean } | null;
  if (!res.ok) throw normalizeError(res.status, body);
  // Stage 6's error handlers return a JSONResponse carrying success:false;
  // treat that as an error whatever status code came with it.
  if (body && body.success === false) throw normalizeError(res.status, body);
  return body as T;
}

export interface UpstreamBirthDetails {
  date: string;
  time: string;
  timezone_offset_minutes: number;
  latitude: number;
  longitude: number;
  place?: string;
}

export interface GenerateUpstreamResponse {
  success: boolean;
  report_id: string;
  status: string;
  sections: number;
}

export interface StatusUpstreamResponse {
  report_id: string;
  status: string;
  progress: { done: number; total: number };
  section_status: Record<string, string>;
  counts: Record<string, number>;
  error: unknown;
  created_at: string;
  updated_at: string;
}

export const premiumReportService = {
  generate: (body: Record<string, unknown>, bearerToken?: string | null) =>
    upstream<GenerateUpstreamResponse>('/api/reports/generate', { method: 'POST', body, bearerToken }),

  // No bearer token: a resume re-reads the chart from disk (the Stage 6
  // orchestrator only calls the Kundli Engine when chart_context.json is
  // missing), so a resume of an already-started report never needs one.
  resume: (reportId: string, bearerToken?: string | null) =>
    upstream<{ success: boolean; report_id: string; status: string }>(`/api/reports/${reportId}/resume`, { method: 'POST', bearerToken }),

  status: (reportId: string) => upstream<StatusUpstreamResponse>(`/api/reports/${reportId}/status`),

  // Never pass include_evidence: raw retrieval evidence, chunk ids and
  // internal planning data are not user-facing, and the debug gate for them
  // lives on the Stage 6 side. This proxy simply never offers the option.
  report: (reportId: string) => upstream<Record<string, unknown>>(`/api/reports/${reportId}`),

  section: (reportId: string, sectionId: string) =>
    upstream<Record<string, unknown>>(`/api/reports/${reportId}/sections/${sectionId}`),

  blueprint: () => upstream<{ sections: Array<{ section_id: string; title: string; kind: string; priority: string; profiles: string[] }>; premium_enabled: boolean }>('/api/reports/blueprint'),
};
