import { query, queryOne } from '../core/db.ts';

export type PaymentPurpose = 'STORE_ORDER' | 'REPORT_PURCHASE' | 'WALLET_RECHARGE' | 'CONSULTATION' | 'CONSULTATION_EXTEND' | 'SLOT_BOOKING';
export type PaymentStatus = 'CREATED' | 'PAID' | 'FAILED';
export type PaymentGateway = 'cashfree' | 'razorpay';

export interface PaymentRow {
  id: string;
  user_id: string;
  purpose: PaymentPurpose;
  payload: unknown;
  amount: number;
  status: PaymentStatus;
  gateway: PaymentGateway;
  cf_payment_id: string | null;
  gateway_ref: string | null;
  created_at: string;
  updated_at: string;
}

export async function createPaymentIntent(input: { id: string; userId: string; purpose: PaymentPurpose; payload: unknown; amount: number; gateway: PaymentGateway }): Promise<PaymentRow> {
  const now = Date.now();
  const rows = await query<PaymentRow>(
    `INSERT INTO payments (id, user_id, purpose, payload, amount, gateway, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'CREATED', $7, $7) RETURNING *`,
    [input.id, input.userId, input.purpose, JSON.stringify(input.payload), input.amount, input.gateway, now]
  );
  return rows[0]!;
}

export function findPaymentById(id: string) {
  return queryOne<PaymentRow>('SELECT * FROM payments WHERE id = $1', [id]);
}

// The gateway's own id for looking up this payment's status later — e.g.
// Razorpay's Payment Link id ("plink_xxx"), which is NOT the same as the
// reference_id we passed in. Set once, right after the gateway order/link
// is created (see payments.routes.ts's POST /orders).
export async function setGatewayRef(id: string, gatewayRef: string): Promise<void> {
  await query('UPDATE payments SET gateway_ref = $2, updated_at = $3 WHERE id = $1', [id, gatewayRef, Date.now()]);
}

// Only flips CREATED -> PAID and returns the row when it actually did —
// returns null if the payment was already PAID/FAILED, which is what makes
// calling fulfillPayment() after this safe to call from both the webhook
// and the client's status-poll fallback without double-fulfilling.
export async function markPaymentPaid(id: string, cfPaymentId: string | null): Promise<PaymentRow | null> {
  const rows = await query<PaymentRow>(
    `UPDATE payments SET status = 'PAID', cf_payment_id = $2, updated_at = $3 WHERE id = $1 AND status = 'CREATED' RETURNING *`,
    [id, cfPaymentId, Date.now()]
  );
  return rows[0] ?? null;
}

export async function markPaymentFailed(id: string): Promise<void> {
  await query(`UPDATE payments SET status = 'FAILED', updated_at = $2 WHERE id = $1 AND status = 'CREATED'`, [id, Date.now()]);
}

export function listPaymentsForUser(userId: string) {
  return query<PaymentRow>('SELECT * FROM payments WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
}
