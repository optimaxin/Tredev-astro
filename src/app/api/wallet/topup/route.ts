import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// ponytail: no payment gateway wired yet — this credits the wallet directly
// (payment stub). Swap for a real Razorpay/Stripe capture-then-credit flow
// once the user supplies gateway keys.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { amountPaise } = (await req.json()) as { amountPaise: number };
  if (!Number.isFinite(amountPaise) || amountPaise <= 0 || amountPaise > 10_000_00) {
    return NextResponse.json({ error: "Enter a valid amount" }, { status: 400 });
  }

  const wallet = await db.wallet.upsert({
    where: { userId: session.userId },
    update: {},
    create: { userId: session.userId },
  });

  const [updated] = await db.$transaction([
    db.wallet.update({ where: { id: wallet.id }, data: { balancePaise: { increment: amountPaise } } }),
    db.walletTransaction.create({
      data: { walletId: wallet.id, type: "credit", amountPaise, reason: "Wallet top-up (stub payment)" },
    }),
  ]);

  return NextResponse.json({ balancePaise: updated.balancePaise });
}
