import { Router } from 'express';
import { z } from 'zod';
import { findAstrologerById, listAstrologers } from '../repositories/astrologerRepository.ts';
import { toPublicAstrologerProfile } from '../models/astrologer.ts';

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

astrologersCatalogRouter.get('/catalog', (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues.map(i => i.message).join('; ') } });
  }
  const { rows, total } = listAstrologers(parsed.data);
  res.json({
    success: true,
    data: rows.map(toPublicAstrologerProfile),
    pagination: { page: parsed.data.page, limit: parsed.data.limit, total },
  });
});

astrologersCatalogRouter.get('/catalog/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(422).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'id must be an integer' } });
  }
  const row = findAstrologerById(id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Astrologer not found' } });
  res.json({ success: true, data: toPublicAstrologerProfile(row) });
});
