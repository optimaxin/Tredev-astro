import { query, queryOne } from '../core/db.ts';
import type { ConsultationType } from '../models/types.ts';

export interface ConsultationSlot {
  id: string;
  astrologerId: number;
  scheduledAt: number;
  durationMinutes: number;
  type: ConsultationType;
  price: number;
  bookedByUserId: string | null;
  bookedAt: number | null;
  createdAt: number;
}

export interface MyConsultationSlot extends ConsultationSlot {
  astrologerName: string;
  astrologerTitle: string;
}

interface SlotRow {
  id: string; astrologer_id: number; scheduled_at: string; duration_minutes: number; type: ConsultationType;
  price: string; booked_by_user_id: string | null; booked_at: string | null; created_at: string;
}

const fromRow = (r: SlotRow): ConsultationSlot => ({
  id: r.id, astrologerId: r.astrologer_id, scheduledAt: Number(r.scheduled_at), durationMinutes: r.duration_minutes,
  type: r.type, price: Number(r.price), bookedByUserId: r.booked_by_user_id,
  bookedAt: r.booked_at === null ? null : Number(r.booked_at), createdAt: Number(r.created_at),
});

export async function listUpcomingSlots(astrologerId: number, now: number): Promise<ConsultationSlot[]> {
  const rows = await query<SlotRow>(
    'SELECT * FROM consultation_slots WHERE astrologer_id = $1 AND scheduled_at > $2 ORDER BY scheduled_at ASC',
    [astrologerId, now]
  );
  return rows.map(fromRow);
}

export async function listAllSlotsForAstrologer(astrologerId: number): Promise<ConsultationSlot[]> {
  const rows = await query<SlotRow>('SELECT * FROM consultation_slots WHERE astrologer_id = $1 ORDER BY scheduled_at DESC', [astrologerId]);
  return rows.map(fromRow);
}

export async function findSlot(id: string): Promise<ConsultationSlot | undefined> {
  const row = await queryOne<SlotRow>('SELECT * FROM consultation_slots WHERE id = $1', [id]);
  return row ? fromRow(row) : undefined;
}

export async function insertSlot(s: Omit<ConsultationSlot, 'bookedByUserId' | 'bookedAt'>): Promise<ConsultationSlot> {
  const row = await queryOne<SlotRow>(
    `INSERT INTO consultation_slots (id, astrologer_id, scheduled_at, duration_minutes, type, price, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
    [s.id, s.astrologerId, s.scheduledAt, s.durationMinutes, s.type, s.price, s.createdAt]
  );
  return fromRow(row!);
}

// Only lets staff remove a slot nobody has paid for yet — deleting a booked
// slot out from under a paying customer is never something an admin action
// alone should be able to do silently.
export async function deleteUnbookedSlot(id: string): Promise<boolean> {
  const rows = await query('DELETE FROM consultation_slots WHERE id = $1 AND booked_by_user_id IS NULL RETURNING id', [id]);
  return rows.length > 0;
}

// Atomic claim — the WHERE guards against two payments racing for the same
// slot; only the first UPDATE finds it still unbooked and returns a row.
// Callers (fulfillPayment) refund to wallet when this returns undefined.
export async function claimSlot(id: string, userId: string, now: number): Promise<ConsultationSlot | undefined> {
  const row = await queryOne<SlotRow>(
    `UPDATE consultation_slots SET booked_by_user_id = $2, booked_at = $3
     WHERE id = $1 AND booked_by_user_id IS NULL RETURNING *`,
    [id, userId, now]
  );
  return row ? fromRow(row) : undefined;
}

export async function listMySlots(userId: string): Promise<MyConsultationSlot[]> {
  const rows = await query<SlotRow & { astrologer_name: string; astrologer_title: string }>(
    `SELECT s.*, a.name AS astrologer_name, a.title AS astrologer_title
     FROM consultation_slots s JOIN astrologers a ON a.id = s.astrologer_id
     WHERE s.booked_by_user_id = $1 ORDER BY s.scheduled_at ASC`,
    [userId]
  );
  return rows.map(r => ({ ...fromRow(r), astrologerName: r.astrologer_name, astrologerTitle: r.astrologer_title }));
}
