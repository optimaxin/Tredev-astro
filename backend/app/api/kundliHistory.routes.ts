import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.ts';
import { saveKundliHistoryEntry, listKundliHistory, deleteKundliHistoryEntry } from '../repositories/kundliHistoryRepository.ts';

export const kundliHistoryRouter = Router();

function fail(res: import('express').Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

const saveSchema = z.object({
  name: z.string().trim().min(1).max(200),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'time must be HH:MM'),
  timezoneOffsetMinutes: z.coerce.number().min(-720).max(840),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  placeLabel: z.string().trim().max(200).nullish(),
});

kundliHistoryRouter.post('/', requireAuth, async (req, res) => {
  const parsed = saveSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));
  const entry = await saveKundliHistoryEntry(req.user!.id, { ...parsed.data, placeLabel: parsed.data.placeLabel ?? null });
  res.json({ success: true, data: entry });
});

kundliHistoryRouter.get('/', requireAuth, async (req, res) => {
  const entries = await listKundliHistory(req.user!.id);
  res.json({ success: true, data: entries });
});

kundliHistoryRouter.delete('/:id', requireAuth, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return fail(res, 422, 'VALIDATION_ERROR', 'id must be an integer');
  await deleteKundliHistoryEntry(req.user!.id, id);
  res.json({ success: true, data: null });
});
