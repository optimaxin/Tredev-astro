import { NextResponse } from "next/server";
import { getAstrologers } from "@/lib/astrologers";

export async function GET() {
  const astrologers = await getAstrologers();
  return NextResponse.json({ astrologers });
}
