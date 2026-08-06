import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/auth";

export async function POST(req: Request) {
  const { phone, code } = await req.json();
  if (typeof phone !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "Phone and code are required" }, { status: 400 });
  }
  const result = await verifyOtp(phone, code);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ user: { id: result.user.id, phone: result.user.phone, role: result.user.role } });
}
