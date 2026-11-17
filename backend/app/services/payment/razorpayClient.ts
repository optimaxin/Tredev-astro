import crypto from 'node:crypto';
import { config } from '../../core/config.ts';

// Thin wrapper over Razorpay's Payment Links API — no SDK dependency, same
// shape as cashfreeClient.ts. Payment Links (not Razorpay's usual Checkout.js
// overlay) because this app's whole payment flow is "redirect to a real,
// separate hosted page and come back" (see paymentService.pay's Cashfree
// _self redirect) — Payment Links is Razorpay's equivalent of that, a plain
// hosted URL with a callback_url, no client-side SDK needed at all.
// See https://razorpay.com/docs/api/payments/payment-links/create-standard/
const BASE_URL = 'https://api.razorpay.com/v1';

function authHeader() {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new Error('Razorpay is not configured (missing RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)');
  }
  const basic = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  return { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' };
}

export interface RazorpayCustomer {
  name: string;
  email: string;
  contact: string;
}

export interface RazorpayPaymentLink {
  id: string;
  short_url: string;
  status: 'created' | 'partially_paid' | 'paid' | 'expired' | 'cancelled';
}

export async function createPaymentLink(referenceId: string, amount: number, customer: RazorpayCustomer, callbackUrl: string): Promise<RazorpayPaymentLink> {
  // `contact` is optional on Razorpay's side — omit it entirely for accounts
  // without a real phone_number instead of sending a placeholder. A made-up
  // number like +919999999999 gets rejected outright ("Recurring digits in
  // customer contact are disallowed" — Razorpay blocks obviously-fake
  // all-same-digit numbers), so there's no safe placeholder to fall back to.
  const customerPayload: Record<string, string> = { name: customer.name, email: customer.email };
  if (/^\d{10}$/.test(customer.contact)) customerPayload.contact = `+91${customer.contact}`;

  const res = await fetch(`${BASE_URL}/payment_links`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify({
      // Razorpay wants the amount in paise (currency subunits), unlike
      // Cashfree's plain-rupees order_amount — this codebase's `amount`
      // fields are always integer rupees, hence the *100 here only.
      amount: amount * 100,
      currency: 'INR',
      reference_id: referenceId,
      customer: customerPayload,
      notify: { sms: false, email: false },
      callback_url: callbackUrl,
      callback_method: 'get',
    }),
  });
  const body = await res.json() as { error?: { description?: string } } & Partial<RazorpayPaymentLink>;
  if (!res.ok) throw new Error(body?.error?.description || `Razorpay payment link creation failed (${res.status})`);
  return body as RazorpayPaymentLink;
}

export async function fetchPaymentLink(id: string): Promise<RazorpayPaymentLink> {
  const res = await fetch(`${BASE_URL}/payment_links/${encodeURIComponent(id)}`, { headers: authHeader() });
  const body = await res.json() as { error?: { description?: string } } & Partial<RazorpayPaymentLink>;
  if (!res.ok) throw new Error(body?.error?.description || `Could not fetch Razorpay payment link (${res.status})`);
  return body as RazorpayPaymentLink;
}

// Not currently wired to a webhook route (no RAZORPAY_WEBHOOK_SECRET
// configured) — kept for when one is added. The status-poll path in
// payments.routes.ts (fetchPaymentLink, called from the return redirect)
// already re-verifies directly against Razorpay's API, which is the same
// trust model this app uses for Cashfree's self-heal path.
export function verifyPaymentLinkSignature(paymentLinkId: string, referenceId: string, status: string, paymentId: string, signature: string, webhookSecret: string): boolean {
  const payload = `${paymentLinkId}|${referenceId}|${status}|${paymentId}`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
}
