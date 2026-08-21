import { Router } from 'express';
import { z } from 'zod';
import { findAstrologerById, listAstrologers } from '../repositories/astrologerRepository.ts';
import { toPublicAstrologerProfile } from '../models/astrologer.ts';
import { requireAuth } from '../middleware/auth.ts';
import { findReviewByConsultation, insertReviewAndUpdateRating, listReviewsForAstrologer } from '../repositories/reviewRepository.ts';
import { toPublicReview } from '../models/review.ts';
import { findConsultationById } from '../repositories/consultationRepository.ts';
import { findUserById } from '../repositories/userRepository.ts';
import { addFavorite, isFavorite, removeFavorite } from '../repositories/favoriteRepository.ts';
import { createApplication, findLatestApplicationForUser, findPendingApplicationForUser } from '../repositories/astrologerApplicationRepository.ts';

// Discovery/catalog API (spec §9-10). Separate from the existing
// GET /api/astrologers in routes.ts, which returns bare live-availability
// state for the realtime engine and is already an established contract the
// frontend depends on — this is additive, not a replacement.
export const astrologersCatalogRouter = Router();

const listQuerySchema = z.object({
  category: z.string().trim().min(1).optional(),
  language: z.string().trim().min(1).optional(),
  consultationType: z.enum(['chat', 'voice', 'video']).optional(),
  minRating: z.coerce.number().min(0).max(5).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['rating', 'experience', 'price', 'relevance']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

astrologersCatalogRouter.get('/catalog', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
  }
  const { rows, total } = await listAstrologers(parsed.data);
  res.json({
    success: true,
    data: rows.map(toPublicAstrologerProfile),
    pagination: { page: parsed.data.page, limit: parsed.data.limit, total },
  });
});

astrologersCatalogRouter.get('/catalog/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id must be an integer' } });
  }
  const row = await findAstrologerById(id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Astrologer not found' } });
  res.json({ success: true, data: toPublicAstrologerProfile(row) });
});

// ── Reviews ──────────────────────────────────────────────────────────────
// Real reviews, tied to an actual completed consultation — you can't review
// an astrologer you never actually consulted.

const reviewQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

astrologersCatalogRouter.get('/:id/reviews', async (req, res) => {
  const astrologerId = Number(req.params.id);
  if (!Number.isInteger(astrologerId)) return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id must be an integer' } });
  const parsed = reviewQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });

  const { rows, total } = await listReviewsForAstrologer(astrologerId, parsed.data.page, parsed.data.limit);
  const withAuthors = await Promise.all(rows.map(async r => {
    const user = await findUserById(r.user_id);
    return toPublicReview(r, user?.name || 'A user');
  }));
  res.json({ success: true, data: withAuthors, pagination: { ...parsed.data, total } });
});

const submitReviewSchema = z.object({
  consultationId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  text: z.string().trim().max(2000).default(''),
});

astrologersCatalogRouter.post('/:id/reviews', requireAuth, async (req, res) => {
  const astrologerId = Number(req.params.id);
  if (!Number.isInteger(astrologerId)) return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id must be an integer' } });
  const parsed = submitReviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });

  const consultation = await findConsultationById(parsed.data.consultationId);
  if (!consultation || consultation.astrologerId !== astrologerId) {
    return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Consultation not found for this astrologer' } });
  }
  if (consultation.status !== 'COMPLETED') {
    return res.status(400).json({ success: false, error: { code: 'NOT_COMPLETED', message: 'You can only review a completed consultation' } });
  }
  const user = await findUserById(req.user!.id);
  if (!user || user.email !== consultation.userEmail) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'This is not your consultation' } });
  }
  if (await findReviewByConsultation(consultation.id)) {
    return res.status(409).json({ success: false, error: { code: 'ALREADY_REVIEWED', message: 'You already reviewed this consultation' } });
  }

  const row = await insertReviewAndUpdateRating({
    astrologerId, userId: user.id, consultationId: consultation.id, rating: parsed.data.rating, text: parsed.data.text,
  });
  res.status(201).json({ success: true, data: toPublicReview(row, user.name) });
});

// ── Favorites ("Saved Astrologers") ─────────────────────────────────────

astrologersCatalogRouter.get('/:id/favorite', requireAuth, async (req, res) => {
  const astrologerId = Number(req.params.id);
  res.json({ success: true, data: { favorited: await isFavorite(req.user!.id, astrologerId) } });
});

astrologersCatalogRouter.post('/:id/favorite', requireAuth, async (req, res) => {
  const astrologerId = Number(req.params.id);
  if (!(await findAstrologerById(astrologerId))) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Astrologer not found' } });
  await addFavorite(req.user!.id, astrologerId);
  res.json({ success: true, data: { favorited: true } });
});

astrologersCatalogRouter.delete('/:id/favorite', requireAuth, async (req, res) => {
  const astrologerId = Number(req.params.id);
  await removeFavorite(req.user!.id, astrologerId);
  res.json({ success: true, data: { favorited: false } });
});

// ── Become an astrologer ─────────────────────────────────────────────────

const applicationSchema = z.object({
  expertise: z.string().trim().min(2).max(200),
  experience: z.string().trim().min(1).max(200),
});

astrologersCatalogRouter.post('/applications', requireAuth, async (req, res) => {
  const parsed = applicationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
  if (await findPendingApplicationForUser(req.user!.id)) {
    return res.status(409).json({ success: false, error: { code: 'ALREADY_PENDING', message: 'You already have a pending application' } });
  }
  const row = await createApplication(req.user!.id, parsed.data.expertise, parsed.data.experience);
  res.status(201).json({ success: true, data: row });
});

astrologersCatalogRouter.get('/applications/mine', requireAuth, async (req, res) => {
  const row = await findLatestApplicationForUser(req.user!.id);
  res.json({ success: true, data: row || null });
});
