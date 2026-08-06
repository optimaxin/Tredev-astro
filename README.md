# AstroTredev

Astrology consultation platform — Next.js 16 (App Router) frontend with a real backend: Prisma + SQLite (dev) / Postgres (production), phone-OTP auth, and a from-scratch Vedic astrology engine (Kundli, Panchang, Guna Milan matching, Numerology).

## Getting started

```bash
npm install        # also runs `prisma generate` via postinstall
cp .env.example .env
npx prisma migrate dev   # creates the local dev.db SQLite file
npx prisma db seed       # loads mock-data.ts astrologers into the DB
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Phone-OTP login codes are printed to the server console (no SMS provider is configured yet).

## What's real vs. stubbed

- **Real**: Kundli/Panchang/Guna-Milan/Numerology calculations (`src/lib/astro/`, `src/lib/numerology.ts`), phone-OTP auth + sessions, database-backed astrologers/bookings/wallet.
- **Stubbed, ready to wire up**: SMS delivery for OTP, live voice/video calling (provider-agnostic token endpoint at `src/app/api/consultation/[id]/token`), payment capture (wallet top-up and bookings currently self-credit/self-mark-paid).

See `.env.example` for every secret needed to take a stub live, and the note at the top of `prisma/schema.prisma` for switching the dev SQLite database to production Postgres.

## Stack

Next.js 16, TypeScript, Tailwind CSS v4, shadcn/ui (Base UI), Prisma 7, Three.js, Framer Motion, Lenis.
