import { queryOne, withTransaction } from './db.ts';
import { ASTROLOGERS } from './seedAstrologers.ts';

// One-time idempotent seed: populates the astrologers table from the
// original mock roster the first time this runs. After that, the DB is the
// source of truth — this function no-ops on every later startup.
export async function seedAstrologerCatalog() {
  const existing = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM astrologers');
  if (Number(existing?.n ?? 0) > 0) return;

  await withTransaction(async client => {
    for (const a of ASTROLOGERS) {
      await client.query(
        `INSERT INTO astrologers
          (id, name, title, bio, avatar, languages, categories, expertise, consultation_types,
           chat_price, call_price, video_price, rating, review_count, experience_years, consultation_count, is_active, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        [
          a.id,
          a.name,
          a.title,
          a.about,
          a.avatar,
          JSON.stringify(a.languages),
          JSON.stringify(a.category),
          JSON.stringify(a.specialization),
          JSON.stringify(['chat', 'voice', 'video']),
          // No distinct per-channel pricing in the original mock data — seed
          // all three the same; a real pricing model can differentiate later.
          a.price,
          a.price,
          a.price,
          a.rating,
          a.reviews,
          a.experience,
          a.consultations,
          1,
          Date.now(),
        ]
      );
    }
  });
  console.log(`[db] seeded ${ASTROLOGERS.length} astrologers into the catalog table`);
}
