import path from "node:path";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  // ponytail: SQLite adapter for local dev. Swap for @prisma/adapter-pg
  // pointed at the real Neon DATABASE_URL when Postgres credentials land.
  // prisma.config.ts resolves DATABASE_URL ("file:./dev.db") relative to
  // the project root, so the runtime adapter points at the same place.
  const url = path.resolve(process.cwd(), "dev.db");
  const adapter = new PrismaBetterSqlite3({ url });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
