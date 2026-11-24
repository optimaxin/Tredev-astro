import crypto from 'node:crypto';
import { config } from '../../core/config.ts';

// Thin wrapper over Cashfree's Orders REST API (PG API version 2023-08-01) —
// no SDK dependency, just the two calls this app needs (create + fetch) plus
// webhook signature verification. See https://docs.cashfree.com/reference/pg-new-apis-endpoint
const BASE_URL = config.cashfree.env === 'production' ? 'https://api.cashfree.com/pg' : 'https://sandbox.cashfree.com/pg';

function headers() {
  if (!config.cashfree.appId || !config.cashfree.secretKey) {
    throw new Error('Cashfree is not configured (missing CASHFREE_APP_ID/CASHFREE_SECRET_KEY)');
  }
  return {
    'Content-Type': 'application/json',
    'x-api-version': '2023-08-01',
    'x-client-id': config.cashfree.appId,
    'x-client-secret': config.cashfree.secretKey,
  };
}

export interface CashfreeCustomer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

export interface CashfreeOrder {
  order_id: string;
  order_status: string;
  payment_session_id: string;
}

export async function createCashfreeOrder(orderId: string, amount: number, customer: CashfreeCustomer, returnUrl: string): Promise<CashfreeOrder> {
  // Cashfree production API strictly requires order_meta.return_url to begin with https://
  const safeReturnUrl = (config.cashfree.env === 'production' && returnUrl.startsWith('http://'))
    ? returnUrl.replace(/^http:\/\//, 'https://')
    : returnUrl;

  const cleanPhone = (customer.phone || '').replace(/\D/g, '').slice(-10);
  // Cashfree rejects all-repeating-digit numbers ("Recurring digits in
  // customer contact are disallowed") — a silent fallback like '9999999999'
  // would guarantee that same rejection for every user with a missing/
  // malformed phone, instead of a clear actionable error (see QA notes: the
  // reusable test account's placeholder phone hits exactly this).
  if (cleanPhone.length !== 10) {
    throw new Error('Please add a valid 10-digit phone number to your account before continuing with payment.');
  }

  const res = await fetch(`${BASE_URL}/orders`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: 'INR',
      customer_details: {
        customer_id: customer.id || `cust_${Date.now()}`,
        customer_name: (customer.name || 'Valued Customer').trim() || 'Valued Customer',
        customer_email: customer.email && customer.email.includes('@') ? customer.email : 'support@tredevaastro.com',
        customer_phone: cleanPhone,
      },
      order_meta: { return_url: safeReturnUrl },
    }),
  });
  const body = await res.json() as { message?: string };
  if (!res.ok) throw new Error(body?.message || `Cashfree order creation failed (${res.status})`);
  return body as CashfreeOrder;
}

export async function fetchCashfreeOrder(orderId: string): Promise<CashfreeOrder> {
  const res = await fetch(`${BASE_URL}/orders/${encodeURIComponent(orderId)}`, { headers: headers() });
  const body = await res.json() as { message?: string };
  if (!res.ok) throw new Error(body?.message || `Could not fetch Cashfree order (${res.status})`);
  return body as CashfreeOrder;
}

// Per Cashfree's webhook spec: signature = base64(HMAC_SHA256(secretKey, timestamp + rawBody)).
export function verifyWebhookSignature(rawBody: string, timestamp: string, signature: string): boolean {
  if (!config.cashfree.secretKey) return false;
  const expected = crypto.createHmac('sha256', config.cashfree.secretKey).update(timestamp + rawBody).digest('base64');
  const expectedBuf = Buffer.from(expected);
  const actualBuf = Buffer.from(signature);
  return expectedBuf.length === actualBuf.length && crypto.timingSafeEqual(expectedBuf, actualBuf);
}
