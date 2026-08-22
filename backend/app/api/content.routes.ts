import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.ts';
import { findBlogPostById, listBlogPosts } from '../repositories/blogRepository.ts';
import { toPublicBlogPost } from '../models/blogPost.ts';
import { listTestimonials } from '../repositories/testimonialRepository.ts';
import { toPublicTestimonial } from '../models/testimonial.ts';
import { findAstrologyReportById, listAstrologyReports } from '../repositories/astrologyReportRepository.ts';
import { toPublicAstrologyReport } from '../models/astrologyReport.ts';
import { listActiveBroadcasts } from '../repositories/broadcastRepository.ts';
import { toPublicBroadcast } from '../models/broadcast.ts';
import { createReportPurchase, listPurchasesForUser } from '../repositories/reportPurchaseRepository.ts';
import { REPORT_BUNDLE_SURCHARGE, toPublicReportPurchase, type ReportBundle } from '../models/reportPurchase.ts';

// Read-only public content (journal posts, testimonials, the paid-report
// catalog) — no auth, no writes. Editing this content is an admin/CMS
// concern for later; today it's seeded once from the original mock data
// (see core/seedContent.ts) and the DB is the source of truth from then on.
export const contentRouter = Router();

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

contentRouter.get('/blog', async (_req, res) => {
  res.json({ success: true, data: (await listBlogPosts()).map(toPublicBlogPost) });
});

contentRouter.get('/blog/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const row = await findBlogPostById(id);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Blog post not found');
  res.json({ success: true, data: toPublicBlogPost(row) });
});

contentRouter.get('/testimonials', async (_req, res) => {
  res.json({ success: true, data: (await listTestimonials()).map(toPublicTestimonial) });
});

contentRouter.get('/reports', async (_req, res) => {
  res.json({ success: true, data: (await listAstrologyReports()).map(toPublicAstrologyReport) });
});

contentRouter.get('/broadcasts/active', async (_req, res) => {
  res.json({ success: true, data: (await listActiveBroadcasts()).map(toPublicBroadcast) });
});

// A user's own purchased reports ("My Reports") — real records, not the
// fake 2-entry mock this used to be. Registered before /reports/:id so
// "mine" is never mistaken for a numeric id.
contentRouter.get('/reports/mine', requireAuth, async (req, res) => {
  const rows = await listPurchasesForUser(req.user!.id);
  res.json({ success: true, data: rows.map(toPublicReportPurchase) });
});

contentRouter.get('/reports/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const row = await findAstrologyReportById(id);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Report not found');
  res.json({ success: true, data: toPublicAstrologyReport(row) });
});

// Buying a report is an instant access grant, same trust model as the rest
// of this app (no real payment gateway exists — see ChatMessage/consultation
// booking). The bundle surcharge is computed server-side from a fixed table,
// never trusted from the client, so the recorded amount is always real.
const purchaseSchema = z.object({ bundle: z.enum(['report-only', 'report-qa', 'report-consult']) });

contentRouter.post('/reports/:id/purchase', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const parsed = purchaseSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const report = await findAstrologyReportById(id);
  if (!report) return fail(res, 404, 'NOT_FOUND', 'Report not found');
  const bundle = parsed.data.bundle as ReportBundle;
  const amount = report.price + REPORT_BUNDLE_SURCHARGE[bundle];
  const row = await createReportPurchase(req.user!.id, id, bundle, amount);
  res.status(201).json({ success: true, data: toPublicReportPurchase({ ...row, report_title: report.title }) });
});
