import { Router } from 'express';
import { requireAuth } from '../middleware/auth.ts';
import { listFavoriteAstrologers } from '../repositories/favoriteRepository.ts';
import { toPublicAstrologerProfile } from '../models/astrologer.ts';

export const favoritesRouter = Router();

favoritesRouter.get('/', requireAuth, async (req, res) => {
  const rows = await listFavoriteAstrologers(req.user!.id);
  res.json({ success: true, data: rows.map(toPublicAstrologerProfile) });
});
