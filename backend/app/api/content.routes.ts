import { Router } from 'express';
import { findBlogPostById, listBlogPosts } from '../repositories/blogRepository.ts';
import { toPublicBlogPost } from '../models/blogPost.ts';
import { listTestimonials } from '../repositories/testimonialRepository.ts';
import { toPublicTestimonial } from '../models/testimonial.ts';
import { findAstrologyReportById, listAstrologyReports } from '../repositories/astrologyReportRepository.ts';
import { toPublicAstrologyReport } from '../models/astrologyReport.ts';
import { listActiveBroadcasts } from '../repositories/broadcastRepository.ts';
import { toPublicBroadcast } from '../models/broadcast.ts';

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

contentRouter.get('/reports/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  const row = await findAstrologyReportById(id);
  if (!row) return fail(res, 404, 'NOT_FOUND', 'Report not found');
  res.json({ success: true, data: toPublicAstrologyReport(row) });
});
