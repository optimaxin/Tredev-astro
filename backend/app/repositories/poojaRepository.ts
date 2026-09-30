import { query, queryOne } from '../core/db.ts';

export interface PoojaVideo {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdAt: number;
}

export interface PoojaGroupSession {
  id: string;
  title: string;
  panditName: string;
  scheduledAt: number;
  meetingUrl: string | null;
  pricePaise: number | null;
  capacity: number | null;
  createdAt: number;
}

export interface PoojaBook {
  id: string;
  title: string;
  author: string | null;
  category: string;
  content: string | null;
  pdfUrl: string | null;
  coverImageUrl: string | null;
  createdAt: number;
}

interface VideoRow {
  id: string; title: string; category: string; video_url: string; thumbnail_url: string | null; created_at: string;
}
interface SessionRow {
  id: string; title: string; pandit_name: string; scheduled_at: string; meeting_url: string | null;
  price_paise: string | null; capacity: number | null; created_at: string;
}
interface BookRow {
  id: string; title: string; author: string | null; category: string; content: string | null; pdf_url: string | null; cover_image_url: string | null; created_at: string;
}

const videoFromRow = (r: VideoRow): PoojaVideo => ({
  id: r.id, title: r.title, category: r.category, videoUrl: r.video_url, thumbnailUrl: r.thumbnail_url, createdAt: Number(r.created_at),
});
const sessionFromRow = (r: SessionRow): PoojaGroupSession => ({
  id: r.id, title: r.title, panditName: r.pandit_name, scheduledAt: Number(r.scheduled_at), meetingUrl: r.meeting_url,
  pricePaise: r.price_paise === null ? null : Number(r.price_paise), capacity: r.capacity, createdAt: Number(r.created_at),
});
const bookFromRow = (r: BookRow): PoojaBook => ({
  id: r.id, title: r.title, author: r.author, category: r.category, content: r.content, pdfUrl: r.pdf_url, coverImageUrl: r.cover_image_url, createdAt: Number(r.created_at),
});

// ── Recorded pooja videos ───────────────────────────────────────────────
export async function listPoojaVideos(): Promise<PoojaVideo[]> {
  return (await query<VideoRow>('SELECT * FROM pooja_videos ORDER BY created_at DESC')).map(videoFromRow);
}

export async function insertPoojaVideo(v: Omit<PoojaVideo, 'createdAt'> & { createdAt: number }): Promise<PoojaVideo> {
  const row = await queryOne<VideoRow>(
    `INSERT INTO pooja_videos (id, title, category, video_url, thumbnail_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [v.id, v.title, v.category, v.videoUrl, v.thumbnailUrl, v.createdAt]
  );
  return videoFromRow(row!);
}

export async function deletePoojaVideo(id: string): Promise<boolean> {
  return (await query('DELETE FROM pooja_videos WHERE id = $1 RETURNING id', [id])).length > 0;
}

// ── Live group pooja sessions ───────────────────────────────────────────
export async function listUpcomingPoojaSessions(now: number): Promise<PoojaGroupSession[]> {
  return (await query<SessionRow>('SELECT * FROM pooja_group_sessions WHERE scheduled_at > $1 ORDER BY scheduled_at ASC', [now])).map(sessionFromRow);
}

export async function listAllPoojaSessions(): Promise<PoojaGroupSession[]> {
  return (await query<SessionRow>('SELECT * FROM pooja_group_sessions ORDER BY scheduled_at DESC')).map(sessionFromRow);
}

export async function findPoojaSession(id: string): Promise<PoojaGroupSession | undefined> {
  const row = await queryOne<SessionRow>('SELECT * FROM pooja_group_sessions WHERE id = $1', [id]);
  return row ? sessionFromRow(row) : undefined;
}

export async function insertPoojaSession(s: Omit<PoojaGroupSession, 'createdAt'> & { createdAt: number }): Promise<PoojaGroupSession> {
  const row = await queryOne<SessionRow>(
    `INSERT INTO pooja_group_sessions (id, title, pandit_name, scheduled_at, meeting_url, price_paise, capacity, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [s.id, s.title, s.panditName, s.scheduledAt, s.meetingUrl, s.pricePaise, s.capacity, s.createdAt]
  );
  return sessionFromRow(row!);
}

export async function deletePoojaSession(id: string): Promise<boolean> {
  return (await query('DELETE FROM pooja_group_sessions WHERE id = $1 RETURNING id', [id])).length > 0;
}

export async function countPoojaSessionRegistrations(sessionId: string): Promise<number> {
  const row = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM pooja_session_registrations WHERE session_id = $1', [sessionId]);
  return Number(row?.n ?? 0);
}

// Idempotent — joining twice is a no-op, not an error, since the button
// stays visible/clickable after a page refresh.
export async function registerForPoojaSession(sessionId: string, userEmail: string, now: number): Promise<void> {
  await query(
    `INSERT INTO pooja_session_registrations (id, session_id, user_email, created_at)
     VALUES ($1, $2, $3, $4) ON CONFLICT (session_id, user_email) DO NOTHING`,
    [`${sessionId}:${userEmail}`, sessionId, userEmail, now]
  );
}

export async function isRegisteredForPoojaSession(sessionId: string, userEmail: string): Promise<boolean> {
  const row = await queryOne('SELECT 1 FROM pooja_session_registrations WHERE session_id = $1 AND user_email = $2', [sessionId, userEmail]);
  return !!row;
}

// ── Aarti / book library ────────────────────────────────────────────────
export async function listPoojaBooks(): Promise<PoojaBook[]> {
  return (await query<BookRow>('SELECT * FROM pooja_books ORDER BY created_at DESC')).map(bookFromRow);
}

export async function insertPoojaBook(b: Omit<PoojaBook, 'createdAt'> & { createdAt: number }): Promise<PoojaBook> {
  const row = await queryOne<BookRow>(
    `INSERT INTO pooja_books (id, title, author, category, content, pdf_url, cover_image_url, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
    [b.id, b.title, b.author, b.category, b.content, b.pdfUrl, b.coverImageUrl, b.createdAt]
  );
  return bookFromRow(row!);
}

export async function deletePoojaBook(id: string): Promise<boolean> {
  return (await query('DELETE FROM pooja_books WHERE id = $1 RETURNING id', [id])).length > 0;
}
