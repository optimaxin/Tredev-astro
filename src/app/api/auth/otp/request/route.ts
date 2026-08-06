import { NextResponse } from "next/server";
import { requestOtp } from "@/lib/auth";

const PHONE_RE = /^\+?[1-9]\d{7,14}$/;

export async function POST(req: Request) {
  const { phone } = await req.json();
  if (typeof phone !== "string" || !PHONE_RE.test(phone)) {
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
  }
  const result = await requestOtp(phone);
  return NextResponse.json(result);
}
