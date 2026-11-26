import { Router } from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.ts';
import { findBlogPostById, listBlogPosts } from '../repositories/blogRepository.ts';
import { toPublicBlogPost } from '../models/blogPost.ts';
import { listTestimonials } from '../repositories/testimonialRepository.ts';
import { toPublicTestimonial } from '../models/testimonial.ts';
import { findAstrologyReportById, listAstrologyReports } from '../repositories/astrologyReportRepository.ts';
import { toPublicAstrologyReport } from '../models/astrologyReport.ts';
import { listActiveBroadcasts } from '../repositories/broadcastRepository.ts';
import { toPublicBroadcast } from '../models/broadcast.ts';
import { listPurchasesForUser } from '../repositories/reportPurchaseRepository.ts';
import { toPublicReportPurchase } from '../models/reportPurchase.ts';
import { findShlokForDate } from '../repositories/dailyShlokRepository.ts';
import { toPublicDailyShlok } from '../models/dailyShlok.ts';
import { listContentOverrideValues } from '../repositories/contentOverrideRepository.ts';

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

// The Panchang card's footer shlok for one day, set by staff (see the
// 'shlok' section in admin.routes.ts). Answers with null rather than 404
// when that day has none — the card then shows its own built-in line, so
// "no shlok queued for today" is an ordinary state, not a client error.
contentRouter.get('/daily-shlok', async (req, res) => {
  const date = String(req.query.date || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return fail(res, 422, 'VALIDATION_ERROR', 'date must be YYYY-MM-DD');
  const row = await findShlokForDate(date);
  res.json({ success: true, data: row ? toPublicDailyShlok(row) : null });
});

contentRouter.get('/testimonials', async (_req, res) => {
  res.json({ success: true, data: (await listTestimonials()).map(toPublicTestimonial) });
});

contentRouter.get('/reports', async (_req, res) => {
  res.json({ success: true, data: (await listAstrologyReports()).map(toPublicAstrologyReport) });
});

// optionalAuth so an anonymous visitor's own (USER-targeted) broadcasts
// still come back, while a logged-in staff/astrologer/admin only gets the
// ones actually targeted at their role — see broadcastRepository.ts.
contentRouter.get('/broadcasts/active', optionalAuth, async (req, res) => {
  res.json({ success: true, data: (await listActiveBroadcasts(req.user?.role ?? null)).map(toPublicBroadcast) });
});

// Staff/admin-edited site text + image overrides (see admin.routes.ts's
// 'content' section) — fetched once at app bootstrap and merged over every
// hardcoded default, regardless of the visitor's selected language. No auth:
// this is public site content, same trust level as /reports or /testimonials.
contentRouter.get('/content/overrides', async (_req, res) => {
  res.json({ success: true, data: await listContentOverrideValues() });
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

// Report purchase creation moved to payments.routes.ts (POST
// /api/payments/orders with purpose: 'REPORT_PURCHASE') — a real Cashfree
// payment now gates it, so a report_purchases row is only ever created from
// a paid intent's fulfillment, never directly from a client POST.
