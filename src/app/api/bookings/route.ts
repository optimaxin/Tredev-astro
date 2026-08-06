import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

const VALID_KINDS = ["consultation", "puja", "course", "report"];

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const bookings = await db.booking.findMany({
    where: { userId: session.userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ bookings });
}

// ponytail: paymentStatus defaults to "stub_paid" (no gateway wired yet).
// Once Razorpay/Stripe keys are provided, capture payment first and only
// create the booking (or flip paymentStatus) after a successful charge.
export async function POST(req: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { kind, refId, amountPaise } = (await req.json()) as { kind: string; refId?: string; amountPaise: number };
  if (!VALID_KINDS.includes(kind)) {
    return NextResponse.json({ error: "Invalid booking kind" }, { status: 400 });
  }
  if (!Number.isFinite(amountPaise) || amountPaise < 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const booking = await db.booking.create({
    data: { userId: session.userId, kind, refId, amountPaise },
  });

  if (kind === "consultation" && refId) {
    await db.consultationSession.create({
      data: { seekerId: session.userId, astrologerId: refId, type: "voice", status: "pending" },
    });
  }

  return NextResponse.json({ booking });
}
