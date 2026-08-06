import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const COOKIE_NAME = "astrotredev_session";
const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ponytail: no SMS provider configured yet — logs the code so the flow is
// fully testable today. Swap the console.log for a real provider call
// (MSG91/Twilio) once the user supplies an API key.
export async function requestOtp(phone: string) {
  const code = generateCode();
  await db.otpCode.create({
    data: { phone, code, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  console.log(`[otp] ${phone} -> ${code} (expires in 5 min)`);
  return { sent: true };
}

export async function verifyOtp(phone: string, code: string) {
  const otp = await db.otpCode.findFirst({
    where: { phone, code, consumed: false, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) return { ok: false as const, error: "Invalid or expired code" };

  await db.otpCode.update({ where: { id: otp.id }, data: { consumed: true } });

  let user = await db.user.findUnique({ where: { phone } });
  if (!user) {
    user = await db.user.create({ data: { phone } });
    await db.wallet.create({ data: { userId: user.id } });
  }

  const token = await new SignJWT({ userId: user.id, phone: user.phone, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secretKey());

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });

  return { ok: true as const, user };
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

export async function getSession() {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as { userId: string; phone: string; role: string };
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId }, include: { wallet: true, astrologer: true } });
}
