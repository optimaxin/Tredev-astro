import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

// Provider-agnostic room-token endpoint. No Agora/100ms/Twilio key is
// configured yet, so this degrades gracefully instead of the call UI
// crashing — wire a real provider SDK here once CALL_PROVIDER_* env vars
// are supplied.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id } = await params;
  const consultation = await db.consultationSession.findUnique({ where: { id } });
  if (!consultation || consultation.seekerId !== session.userId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const providerConfigured = Boolean(process.env.CALL_PROVIDER_APP_ID);
  if (!providerConfigured) {
    return NextResponse.json(
      { configured: false, message: "Live calling isn't connected yet — add CALL_PROVIDER_APP_ID to enable it." },
      { status: 200 }
    );
  }

  // Real token minting would happen here using the configured provider's SDK.
  return NextResponse.json({ configured: true, roomId: consultation.providerRoomId, token: null });
}
