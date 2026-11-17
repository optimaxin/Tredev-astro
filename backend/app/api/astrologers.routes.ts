import { Router } from 'express';
import { z } from 'zod';
import { findAstrologerById, findAstrologerByUserId, listAstrologers, setActiveOfferPercent } from '../repositories/astrologerRepository.ts';
import { toPublicAstrologerProfile } from '../models/astrologer.ts';
import { optionalAuth, requireAuth } from '../middleware/auth.ts';
import { getLoyalty } from '../repositories/loyaltyRepository.ts';
import { applyRegionMultiplier, computePriceWithOverride } from '../services/pricingEngine.ts';
import { getRegionForCountry } from '../repositories/pricingRegionRepository.ts';
import { getOverride, listOverridesMap, type AstrologerRegionPriceRow } from '../repositories/astrologerRegionPriceRepository.ts';
import { countryFromRequest } from '../services/geoLocation.ts';
import type { PublicAstrologerProfile } from '../models/astrologer.ts';
import { findReviewByConsultation, insertReviewAndUpdateRating, listReviewsForAstrologer } from '../repositories/reviewRepository.ts';
import { toPublicReview } from '../models/review.ts';
import { findConsultationById } from '../repositories/consultationRepository.ts';
import { findUserById } from '../repositories/userRepository.ts';
import { addFavorite, isFavorite, removeFavorite } from '../repositories/favoriteRepository.ts';
import { createApplication, findLatestApplicationForUser, findPendingApplicationForUser } from '../repositories/astrologerApplicationRepository.ts';
import { canActivateOffer } from '../services/pricingEngine.ts';
import { activateBoost, boostDisplayId, getActiveBoost, listBoostHistory } from '../repositories/boostRepository.ts';
import { getBoostPayoutSharePercent } from '../repositories/platformSettingsRepository.ts';

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

// Applies a region's price multiplier to the 3 advertised price fields —
// used so browsing the catalog already shows a visitor their real region
// price, not just the final booking-confirmation step. A multiplier of 1
// (no matching region, the default) returns the profile untouched.
function withRegionPricing(profile: PublicAstrologerProfile, multiplier: number, override?: AstrologerRegionPriceRow): PublicAstrologerProfile {
  if (override) {
    return { ...profile, chatPrice: override.chat_price, callPrice: override.call_price, videoPrice: override.video_price };
  }
  if (multiplier === 1) return profile;
  return {
    ...profile,
    chatPrice: applyRegionMultiplier(profile.chatPrice, multiplier),
    callPrice: applyRegionMultiplier(profile.callPrice, multiplier),
    videoPrice: applyRegionMultiplier(profile.videoPrice, multiplier),
  };
}

astrologersCatalogRouter.get('/catalog', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
  }
  const { rows, total } = await listAstrologers(parsed.data);
  const region = await getRegionForCountry(countryFromRequest(req));
  const overrides = region ? await listOverridesMap() : null;
  res.json({
    success: true,
    data: rows.map(r => withRegionPricing(
      toPublicAstrologerProfile(r),
      region ? Number(region.price_multiplier) : 1,
      region && overrides ? overrides.get(`${r.id}:${region.id}`) : undefined,
    )),
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
  const region = await getRegionForCountry(countryFromRequest(req));
  const override = region ? await getOverride(id, region.id) : undefined;
  res.json({ success: true, data: withRegionPricing(toPublicAstrologerProfile(row), region ? Number(region.price_multiplier) : 1, override) });
});

// The exact per-minute price a booking would lock in RIGHT NOW for this
// type — offer/loyalty-adjusted, matching what createConsultation computes
// server-side. Works for anonymous visitors too (shows the advertised,
// non-loyal rate); a logged-in user sees their real loyalty-adjusted price.
astrologersCatalogRouter.get('/:id/effective-price', optionalAuth, async (req, res) => {
  const id = Number(req.params.id);
  const type = String(req.query.type || 'chat');
  if (!Number.isInteger(id) || !['chat', 'voice', 'video'].includes(type)) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id must be an integer and type must be chat/voice/video' } });
  }
  const row = await findAstrologerById(id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Astrologer not found' } });

  let isLoyal = false;
  if (req.user) {
    const user = await findUserById(req.user.id);
    if (user) isLoyal = (await getLoyalty(user.email, id)).isLoyal;
  }
  const countryCode = countryFromRequest(req);
  const region = await getRegionForCountry(countryCode);
  const override = region ? await getOverride(id, region.id) : undefined;
  const regionMultiplier = region ? Number(region.price_multiplier) : 1;
  const { pricePerMin, appliedOfferPercent } = computePriceWithOverride(row, type as 'chat' | 'voice' | 'video', isLoyal, regionMultiplier, override ?? null);
  res.json({ success: true, data: { pricePerMin, appliedOfferPercent, isLoyal, countryCode, regionMultiplier } });
});

// Lets a logged-in astrologer resolve their own catalog row (id + pricing +
// rating) without needing to search the public catalog by name — the
// astrologer dashboard's Requests/Consultations/Earnings/Reviews tabs all
// need this id to query their own real data.
astrologersCatalogRouter.get('/me', requireAuth, async (req, res) => {
  const row = await findAstrologerByUserId(req.user!.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No astrologer catalog entry for this account' } });
  res.json({ success: true, data: toPublicAstrologerProfile(row) });
});

// ── Offers (percentage discounts) ───────────────────────────────────────
// Astrologer self-service — turn a promotional discount on/off for their
// own catalog row. The auto "Price Increase Offer" isn't toggled here; it's
// set automatically by updateAstrologerProfile when a price goes up.

const offerSchema = z.object({ percent: z.union([z.literal(0), z.literal(20), z.literal(50), z.literal(75)]) });

astrologersCatalogRouter.patch('/me/offer', requireAuth, async (req, res) => {
  const astro = await findAstrologerByUserId(req.user!.id);
  if (!astro) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No astrologer catalog entry for this account' } });
  const parsed = offerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });

  const check = canActivateOffer(astro, parsed.data.percent, JSON.parse(astro.consultation_types));
  if (!check.ok) return res.status(400).json({ success: false, error: { code: 'OFFER_NOT_ALLOWED', message: check.reason } });

  const updated = await setActiveOfferPercent(astro.id, parsed.data.percent);
  res.json({ success: true, data: toPublicAstrologerProfile(updated!) });
});

// ── Boost (visibility feature — astrologer-only, never user-facing) ─────

astrologersCatalogRouter.get('/me/boost', requireAuth, async (req, res) => {
  const astro = await findAstrologerByUserId(req.user!.id);
  if (!astro) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No astrologer catalog entry for this account' } });
  const [active, history] = await Promise.all([getActiveBoost(astro.id), listBoostHistory(astro.id)]);
  res.json({
    success: true,
    data: {
      active: active ? { id: active.id, displayId: boostDisplayId(active.id), startedAt: Number(active.started_at), endsAt: Number(active.ends_at), payoutSharePercent: active.payout_share_percent } : null,
      history: history.map(b => ({ id: b.id, displayId: boostDisplayId(b.id), startedAt: Number(b.started_at), endsAt: Number(b.ends_at), payoutSharePercent: b.payout_share_percent })),
      // What the astrologer would get if they activate a Boost right now —
      // their own staff-set override if there is one, else the platform
      // default — so the dashboard can show this in the "are you sure?"
      // confirmation before they actually activate.
      pendingPayoutSharePercent: astro.boost_payout_override_percent ?? await getBoostPayoutSharePercent(),
    },
  });
});

astrologersCatalogRouter.post('/me/boost', requireAuth, async (req, res) => {
  const astro = await findAstrologerByUserId(req.user!.id);
  if (!astro) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'No astrologer catalog entry for this account' } });
  try {
    const boost = await activateBoost(astro.id, astro.boost_payout_override_percent);
    res.status(201).json({ success: true, data: { id: boost.id, displayId: boostDisplayId(boost.id), startedAt: Number(boost.started_at), endsAt: Number(boost.ends_at), payoutSharePercent: boost.payout_share_percent } });
  } catch (err) {
    res.status(409).json({ success: false, error: { code: 'BOOST_ALREADY_ACTIVE', message: (err as Error).message } });
  }
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
