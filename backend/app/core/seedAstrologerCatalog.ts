import { db, withTransaction } from './db.ts';
import { ASTROLOGERS } from './seedAstrologers.ts';

// One-time idempotent seed: populates the astrologers table from the
// original mock roster the first time this runs. After that, the DB is the
// source of truth — this function no-ops on every later startup.
export function seedAstrologerCatalog() {
  const existing = (db.prepare('SELECT COUNT(*) AS n FROM astrologers').get() as { n: number }).n;
  if (existing > 0) return;

  withTransaction(() => {
    const insert = db.prepare(`
      INSERT INTO astrologers
        (id, name, title, bio, avatar, languages, categories, expertise, consultation_types,
         chat_price, call_price, video_price, rating, review_count, experience_years, consultation_count, is_active, created_at)
      VALUES
        (@id, @name, @title, @bio, @avatar, @languages, @categories, @expertise, @consultation_types,
         @chat_price, @call_price, @video_price, @rating, @review_count, @experience_years, @consultation_count, @is_active, @created_at)
    `);
    for (const a of ASTROLOGERS) {
      insert.run({
        id: a.id,
        name: a.name,
        title: a.title,
        bio: a.about,
        avatar: a.avatar,
        languages: JSON.stringify(a.languages),
        categories: JSON.stringify(a.category),
        expertise: JSON.stringify(a.specialization),
        consultation_types: JSON.stringify(['chat', 'voice', 'video']),
        // No distinct per-channel pricing in the original mock data — seed
        // all three the same; a real pricing model can differentiate later.
        chat_price: a.price,
        call_price: a.price,
        video_price: a.price,
        rating: a.rating,
        review_count: a.reviews,
        experience_years: a.experience,
        consultation_count: a.consultations,
        is_active: 1,
        created_at: Date.now(),
      });
    }
  });
  console.log(`[db] seeded ${ASTROLOGERS.length} astrologers into the catalog table`);
}
