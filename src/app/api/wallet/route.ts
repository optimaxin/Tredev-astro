import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const wallet = await db.wallet.upsert({
    where: { userId: session.userId },
    update: {},
    create: { userId: session.userId },
    include: { transactions: { orderBy: { createdAt: "desc" }, take: 20 } },
  });

  return NextResponse.json({ balancePaise: wallet.balancePaise, transactions: wallet.transactions });
}
