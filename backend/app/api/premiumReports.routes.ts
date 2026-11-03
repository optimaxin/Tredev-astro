import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.ts';
import { rateLimit } from '../middleware/rateLimit.ts';
import { premiumReportService, PremiumReportUpstreamError } from '../services/premiumReportService.ts';
import { toClientReport } from '../services/premiumReportView.ts';
import {
  createPremiumReport,
  findByIdempotencyKey,
  findOwnedReport,
  listPremiumReports,
  updateCachedStatus,
} from '../repositories/premiumReportRepository.ts';

// Authenticated, ownership-enforcing gateway to the Stage 6 Premium Report
// service. Every route here is requireAuth, and every route that names a
// report id resolves it through findOwnedReport(req.user.id, ...) FIRST — a
// report id is never forwarded upstream until this backend has established
// that the caller owns it. A frontend-supplied user id is never read.
export const premiumReportsRouter = Router();

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// Same 404 for "no such report" and "someone else's report". Distinguishing
// them would turn this endpoint into an oracle for which report ids exist.
function notFound(res: import('express').Response) {
  return fail(res, 404, 'REPORT_NOT_FOUND', 'No such report.');
}

// Stage 6 ids are uuid4().hex[:16] and its store rejects anything else before
// touching the filesystem. Validating here too means a malformed id never
// even reaches the upstream URL.
const REPORT_ID = /^[a-f0-9]{16}$/;
const SECTION_ID = /^[a-z0-9_]{1,60}$/;

// Mirrors kb_report's BirthDetailsIn, and the same constraints the Kundli
// Engine's own birthSchema (calculators.routes.ts) enforces. Frontend
// validation is for usability; this is the authority.
//
// timezoneOffsetMinutes uses this project's single convention throughout:
// "UTC = local - offset", so India (UTC+5:30) is +330 — the same value
// BirthDetailsForm.TIMEZONES sends and the same one toUtcDate() subtracts.
const birthDetailsSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:MM (24h)'),
  timezoneOffsetMinutes: z.coerce.number().min(-720).max(840),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  placeLabel: z.string().trim().max(200).nullish(),
});

const generateSchema = z.object({
  birthDetails: birthDetailsSchema.optional(),
  chartId: z.coerce.number().int().positive().optional(),
  subjectName: z.string().trim().max(200).optional(),
  reportType: z.enum(['vertical_slice', 'premium']).default('premium'),
  language: z.string().trim().max(10).default('en'),
  userNotes: z.string().trim().max(1000).optional(),
  // Stable per filled-in form. See migrations/049 — this is what makes a
  // double click, a retry, or a refresh mid-submit resolve to the report
  // that already exists instead of starting a second LLM run.
  idempotencyKey: z.string().trim().min(8).max(128).optional(),
}).refine(
  v => (v.birthDetails === undefined) !== (v.chartId === undefined),
  { message: 'provide exactly one of birthDetails or chartId' }
);

// A premium report is a long, expensive LLM job. This cap is per IP and
// deliberately low; the idempotency key handles honest retries, so anything
// that trips this is either a bug or abuse.
const generateLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });

function upstreamFail(res: import('express').Response, e: unknown) {
  if (e instanceof PremiumReportUpstreamError) {
    // An upstream 404 on an id we already proved ownership of means the
    // Stage 6 store lost it — real, and worth saying plainly rather than
    // pretending the report was never theirs.
    const status = e.status === 404 ? 410 : e.status;
    const code = e.status === 404 ? 'REPORT_UNAVAILABLE' : e.code;
    return fail(res, status, code, e.message);
  }
  throw e;
}

// ── create ────────────────────────────────────────────────────────────────
premiumReportsRouter.post('/generate', requireAuth, generateLimiter, async (req, res) => {
  const parsed = generateSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const input = parsed.data;
  const userId = req.user!.id;

  // Duplicate-submission guard, checked before anything expensive happens.
  if (input.idempotencyKey) {
    const existing = await findByIdempotencyKey(userId, input.idempotencyKey);
    if (existing) {
      return res.status(200).json({
        success: true,
        data: { reportId: existing.reportId, status: existing.status, sections: existing.sectionsTotal, duplicate: true },
      });
    }
  }

  // Translate this project's camelCase into Stage 6's snake_case wire shape.
  // The timezone offset is passed through UNCHANGED: kb_kundli forwards it
  // verbatim to the Kundli Engine, which applies the same +330-for-India
  // convention used everywhere else here.
  const upstreamBody: Record<string, unknown> = {
    report_type: input.reportType,
    language: input.language,
    sections: 'default',
    ...(input.userNotes ? { user_notes: input.userNotes } : {}),
  };
  if (input.birthDetails) {
    const b = input.birthDetails;
    upstreamBody.birth_details = {
      date: b.date,
      time: b.time,
      timezone_offset_minutes: b.timezoneOffsetMinutes,
      latitude: b.latitude,
      longitude: b.longitude,
      ...(b.placeLabel ? { place: b.placeLabel } : {}),
    };
  } else {
    upstreamBody.chart_id = input.chartId;
  }

  let created;
  try {
    // The access token is forwarded only on the chart_id path, where Stage 6
    // must call the authenticated kundli-history endpoint as this user.
    const bearer = input.chartId !== undefined ? req.headers.authorization?.slice('Bearer '.length) ?? null : null;
    created = await premiumReportService.generate(upstreamBody, bearer);
  } catch (e) {
    return upstreamFail(res, e);
  }

  try {
    const row = await createPremiumReport({
      reportId: created.report_id,
      userId,
      idempotencyKey: input.idempotencyKey ?? null,
      sectionsTotal: created.sections ?? 0,
      reportType: input.reportType,
      language: input.language,
      subjectName: input.subjectName ?? null,
      subjectDate: input.birthDetails?.date ?? null,
      subjectPlace: input.birthDetails?.placeLabel ?? null,
    });
    return res.status(202).json({ success: true, data: { reportId: row.reportId, status: row.status, sections: row.sectionsTotal, duplicate: false } });
  } catch (e) {
    // Two concurrent submits with the same key: one INSERT wins, the other
    // hits the unique index. Return the winner rather than erroring — that
    // is precisely the duplicate this guard exists to absorb.
    if (input.idempotencyKey) {
      const existing = await findByIdempotencyKey(userId, input.idempotencyKey);
      if (existing) {
        return res.status(200).json({ success: true, data: { reportId: existing.reportId, status: existing.status, sections: existing.sectionsTotal, duplicate: true } });
      }
    }
    // A unique violation we could NOT resolve into the caller's own row —
    // the report id the service handed back is already owned by someone
    // else. That should be impossible (Stage 6 mints a fresh uuid4 per
    // report), so it means the upstream is misbehaving. Answer in this
    // API's JSON envelope rather than letting Express render an HTML 500,
    // and say nothing about whose row it collided with.
    if ((e as { code?: string })?.code === '23505') {
      return fail(res, 502, 'REPORT_ID_CONFLICT', 'The report service returned an unusable report reference. Please try again.');
    }
    throw e;
  }
});

// ── list (the user's own reports only) ────────────────────────────────────
premiumReportsRouter.get('/', requireAuth, async (req, res) => {
  const rows = await listPremiumReports(req.user!.id);
  res.json({
    success: true,
    data: rows.map(r => ({
      reportId: r.reportId,
      status: r.status,
      sectionsDone: r.sectionsDone,
      sectionsTotal: r.sectionsTotal,
      reportType: r.reportType,
      language: r.language,
      subjectName: r.subjectName,
      subjectDate: r.subjectDate,
      subjectPlace: r.subjectPlace,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});

// ── blueprint (not report-scoped; no ownership to check) ──────────────────
premiumReportsRouter.get('/blueprint', requireAuth, async (_req, res) => {
  try {
    const bp = await premiumReportService.blueprint();
    res.json({ success: true, data: bp });
  } catch (e) {
    return upstreamFail(res, e);
  }
});

// ── status ────────────────────────────────────────────────────────────────
premiumReportsRouter.get('/:reportId/status', requireAuth, async (req, res) => {
  // Express 5 types a route param as `string | string[]`. Coercing here
  // is safe: an array stringifies to a comma-joined value that the id
  // pattern below rejects, so a crafted duplicate param can never pass.
  const reportId = String(req.params.reportId);
  if (!REPORT_ID.test(reportId)) return notFound(res);
  const owned = await findOwnedReport(req.user!.id, reportId);
  if (!owned) return notFound(res);

  let status;
  try {
    status = await premiumReportService.status(reportId);
  } catch (e) {
    return upstreamFail(res, e);
  }
  const done = status.progress?.done ?? 0;
  const total = status.progress?.total ?? owned.sectionsTotal;
  await updateCachedStatus(req.user!.id, reportId, status.status, done, total);

  const upstreamError = status.error as { code?: string; message?: string } | null;
  res.json({
    success: true,
    data: {
      reportId,
      status: status.status,
      progress: { done, total },
      sectionStatus: status.section_status ?? {},
      counts: status.counts ?? {},
      // Upstream `error` can carry an internal stage name and provider
      // detail. Surface only what a user can act on; the rest stays
      // server-side.
      error: upstreamError
        ? { code: upstreamError.code ?? 'GENERATION_FAILED', message: upstreamError.message ?? 'Report generation failed.' }
        : null,
      createdAt: status.created_at,
      updatedAt: status.updated_at,
    },
  });
});

// ── the completed report ──────────────────────────────────────────────────
premiumReportsRouter.get('/:reportId', requireAuth, async (req, res) => {
  // Express 5 types a route param as `string | string[]`. Coercing here
  // is safe: an array stringifies to a comma-joined value that the id
  // pattern below rejects, so a crafted duplicate param can never pass.
  const reportId = String(req.params.reportId);
  if (!REPORT_ID.test(reportId)) return notFound(res);
  const owned = await findOwnedReport(req.user!.id, reportId);
  if (!owned) return notFound(res);

  try {
    const report = await premiumReportService.report(reportId);
    // Allowlisted, never spread: see services/premiumReportView.ts for what
    // is kept (display fields + a minimal chart view) and why the rest of
    // Stage 6's response — engine URL, usage/cost, validation internals —
    // stays server-side.
    res.json({
      success: true,
      data: toClientReport(report, { name: owned.subjectName, date: owned.subjectDate, place: owned.subjectPlace }),
    });
  } catch (e) {
    return upstreamFail(res, e);
  }
});

// ── a single section ──────────────────────────────────────────────────────
premiumReportsRouter.get('/:reportId/sections/:sectionId', requireAuth, async (req, res) => {
  // See the note on String() coercion above.
  const reportId = String(req.params.reportId);
  const sectionId = String(req.params.sectionId);
  if (!REPORT_ID.test(reportId)) return notFound(res);
  if (!SECTION_ID.test(sectionId)) return fail(res, 404, 'SECTION_NOT_FOUND', 'No such section.');
  const owned = await findOwnedReport(req.user!.id, reportId);
  if (!owned) return notFound(res);

  try {
    const section = await premiumReportService.section(reportId, sectionId);
    res.json({ success: true, data: section });
  } catch (e) {
    return upstreamFail(res, e);
  }
});

// ── resume a partial/failed report ────────────────────────────────────────
// Resume is safe to call repeatedly: the Stage 6 orchestrator holds a
// per-report lock and never regenerates a section that already completed.
premiumReportsRouter.post('/:reportId/resume', requireAuth, rateLimit({ windowMs: 10 * 60 * 1000, max: 20 }), async (req, res) => {
  // Express 5 types a route param as `string | string[]`. Coercing here
  // is safe: an array stringifies to a comma-joined value that the id
  // pattern below rejects, so a crafted duplicate param can never pass.
  const reportId = String(req.params.reportId);
  if (!REPORT_ID.test(reportId)) return notFound(res);
  const owned = await findOwnedReport(req.user!.id, reportId);
  if (!owned) return notFound(res);

  try {
    const result = await premiumReportService.resume(reportId);
    await updateCachedStatus(req.user!.id, reportId, result.status ?? 'queued', owned.sectionsDone, owned.sectionsTotal);
    res.status(202).json({ success: true, data: { reportId, status: result.status ?? 'queued' } });
  } catch (e) {
    return upstreamFail(res, e);
  }
});
