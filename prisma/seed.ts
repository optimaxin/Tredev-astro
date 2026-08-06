import path from "node:path";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { astrologers, testimonials } from "../src/lib/mock-data";

const adapter = new PrismaBetterSqlite3({ url: path.resolve(process.cwd(), "dev.db") });
const db = new PrismaClient({ adapter });

async function main() {
  for (const a of astrologers) {
    const phone = `+91${9000000000 + Number(a.id)}`;
    const user = await db.user.upsert({
      where: { phone },
      update: {},
      create: { phone, name: a.name, role: "astrologer" },
    });

    await db.astrologer.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        userId: user.id,
        slug: a.slug,
        name: a.name,
        initials: a.initials,
        tier: a.tier,
        experience: a.experience,
        languages: a.languages.join(","),
        specialties: a.specialties.join(","),
        rating: a.rating,
        reviewsCount: a.reviews,
        pricePerMin: a.price,
        online: a.online,
        consultationsLabel: a.consultations,
        city: a.city,
        gender: a.gender,
        bio: a.bio,
        gurukul: a.gurukul,
      },
    });
  }

  for (const [i, t] of testimonials.entries()) {
    const phone = `+91${9100000000 + i}`;
    const user = await db.user.upsert({
      where: { phone },
      update: {},
      create: { phone, name: t.name },
    });
    const astrologer = await db.astrologer.findFirst();
    if (!astrologer) continue;
    const existing = await db.review.findFirst({ where: { userId: user.id, astrologerId: astrologer.id } });
    if (!existing) {
      await db.review.create({
        data: { astrologerId: astrologer.id, userId: user.id, rating: t.rating, comment: t.quote },
      });
    }
  }

  console.log(`Seeded ${astrologers.length} astrologers and ${testimonials.length} reviews.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
