import "server-only";
import { db } from "@/lib/db";
import type { Astrologer } from "@/lib/mock-data";

function toAstrologer(a: {
  id: string; slug: string; name: string; tier: string; experience: number; languages: string;
  specialties: string; rating: number; reviewsCount: number; pricePerMin: number; online: boolean;
  consultationsLabel: string; initials: string; city: string | null; gender: string | null; bio: string | null; gurukul: string | null;
}): Astrologer {
  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    tier: a.tier as Astrologer["tier"],
    experience: a.experience,
    languages: a.languages.split(","),
    specialties: a.specialties.split(","),
    rating: a.rating,
    reviews: a.reviewsCount,
    price: a.pricePerMin,
    online: a.online,
    consultations: a.consultationsLabel,
    initials: a.initials,
    city: a.city ?? undefined,
    gender: a.gender as Astrologer["gender"],
    bio: a.bio ?? undefined,
    gurukul: a.gurukul ?? undefined,
  };
}

export async function getAstrologers(): Promise<Astrologer[]> {
  const rows = await db.astrologer.findMany({ orderBy: { rating: "desc" } });
  return rows.map(toAstrologer);
}

export async function getAstrologerBySlug(slug: string): Promise<Astrologer | null> {
  const row = await db.astrologer.findUnique({ where: { slug } });
  return row ? toAstrologer(row) : null;
}
