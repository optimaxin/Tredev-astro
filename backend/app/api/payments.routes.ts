import { Router, type Request, type Response } from 'express';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.ts';
import { config } from '../core/config.ts';
import { createCashfreeOrder, fetchCashfreeOrder, verifyWebhookSignature } from '../services/payment/cashfreeClient.ts';
import { createPaymentLink, fetchPaymentLink } from '../services/payment/razorpayClient.ts';
import { createPaymentIntent, findPaymentById, markPaymentFailed, markPaymentPaid, setGatewayRef } from '../repositories/paymentRepository.ts';
import { fulfillPayment } from '../services/payment/fulfillment.ts';
import { findAstrologyReportById } from '../repositories/astrologyReportRepository.ts';
import { findUserById } from '../repositories/userRepository.ts';
import { findAstrologerById } from '../repositories/astrologerRepository.ts';
import { findConsultationById } from '../repositories/consultationRepository.ts';
import { findSlot } from '../repositories/consultationSlotRepository.ts';
import { getLoyalty } from '../repositories/loyaltyRepository.ts';
import { getRegionForCountry } from '../repositories/pricingRegionRepository.ts';
import { getOverride } from '../repositories/astrologerRegionPriceRepository.ts';
import { computePriceWithOverride } from '../services/pricingEngine.ts';
import { REPORT_BUNDLE_SURCHARGE } from '../models/reportPurchase.ts';
import { countryFromRequest } from '../services/geoLocation.ts';
import type { PaymentGateway } from '../repositories/paymentRepository.ts';
import type { ConsultationType } from '../models/types.ts';

export const paymentsRouter = Router();

function fail(res: Response, status: number, code: string, message: string) {
  res.status(status).json({ success: false, error: { code, message } });
}

// ── Webhook — Cashfree calling us server-to-server, no bearer token, so this
// is registered before requireAuth below. Body/signature is verified against
// req.rawBody, the exact bytes Cashfree sent (see main.ts's express.json
// `verify` option) — a re-serialized req.body would not reproduce the same
// bytes and would make every signature check fail.
paymentsRouter.post('/webhook', async (req: Request, res: Response) => {
  const timestamp = req.header('x-webhook-timestamp');
  const signature = req.header('x-webhook-signature');
  const raw = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!timestamp || !signature || !raw || !verifyWebhookSignature(raw.toString('utf8'), timestamp, signature)) {
    return res.status(401).json({ success: false });
  }

  const orderId: string | undefined = req.body?.data?.order?.order_id;
  const paymentStatus: string | undefined = req.body?.data?.payment?.payment_status;
  const cfPaymentId: string | null = req.body?.data?.payment?.cf_payment_id ?? null;
  if (!orderId) return res.status(200).json({ success: true });

  const payment = await findPaymentById(orderId);
  if (!payment) return res.status(200).json({ success: true });

  if (paymentStatus === 'SUCCESS') {
    const updated = await markPaymentPaid(orderId, cfPaymentId);
    // markPaymentPaid's guard is `WHERE status = 'CREATED'` — once this
    // flips, no retry (a redelivered webhook, or the status-poll fallback
    // below) will ever call fulfillPayment again for this payment. If it
    // throws, the customer's money is taken with nothing granted and no
    // visible trace — loud logging here is the least that must exist so
    // this doesn't fail completely silently; a real reconciliation/retry
    // queue is the fuller fix this doesn't attempt.
    if (updated) {
      try {
        await fulfillPayment(updated);
      } catch (err) {
        console.error(`[payments] fulfillPayment failed after webhook marked PAID — payment ${updated.id}, purpose ${updated.purpose}, user ${updated.user_id}:`, err);
      }
    }
  } else if (paymentStatus === 'FAILED' || paymentStatus === 'USER_DROPPED' || paymentStatus === 'VOID') {
    await markPaymentFailed(orderId);
  }
  res.status(200).json({ success: true });
});

paymentsRouter.use(requireAuth);

const orderItemSchema = z.object({
  productId: z.number().int(),
  name: z.string().trim().min(1).max(200),
  price: z.number().nonnegative(),
  quantity: z.number().int().min(1).max(50),
});

const shippingSchema = z.object({
  name: z.string().trim().min(1).max(150),
  address: z.string().trim().min(1).max(300),
  city: z.string().trim().min(1).max(100),
  zip: z.string().trim().min(1).max(20),
});

// Same trust model as the routes this replaces (orders.routes.ts,
// content.routes.ts): amount is always computed here from server-side data
// (item prices, the report catalog, the bundle surcharge table), never taken
// directly from the client.
const createIntentSchema = z.discriminatedUnion('purpose', [
  z.object({ purpose: z.literal('STORE_ORDER'), items: z.array(orderItemSchema).min(1).max(50), shipping: shippingSchema }),
  z.object({ purpose: z.literal('REPORT_PURCHASE'), reportId: z.number().int(), bundle: z.enum(['report-only', 'report-qa', 'report-consult']) }),
  z.object({
    purpose: z.literal('WALLET_RECHARGE'),
    amount: z.number().int().min(50).max(500000).refine(n => n % 50 === 0, 'Amount must be a multiple of ₹50'),
  }),
  z.object({ purpose: z.literal('CONSULTATION'), astrologerId: z.number().int(), category: z.string().trim().min(1).max(100), type: z.enum(['chat', 'voice', 'video']), durationMinutes: z.number().int().min(5).max(120) }),
  z.object({ purpose: z.literal('CONSULTATION_EXTEND'), consultationId: z.string().trim().min(1), extraMinutes: z.number().int().min(1).max(120) }),
  z.object({ purpose: z.literal('SLOT_BOOKING'), slotId: z.string().trim().min(1) }),
]);

// All transactions across the project are processed via Cashfree as the primary gateway.
// Can be overridden via config.paymentGateway / PAYMENT_GATEWAY env var if needed.
function gatewayForRequest(_req?: Request): PaymentGateway {
  if (config.paymentGateway === 'razorpay' || config.paymentGateway === 'cashfree') {
    return config.paymentGateway;
  }
  return 'cashfree';
}

// Creates a pending payment intent, then a matching order with whichever
// gateway was picked, and hands back whatever the frontend needs to get the
// visitor onto that gateway's real hosted page (Cashfree: a session id for
// its JS SDK; Razorpay: a plain redirect URL). Nothing is granted yet —
// that only happens once the webhook (Cashfree only) or the status-poll
// fallback below sees the payment actually succeed.
paymentsRouter.post('/orders', async (req, res) => {
  const parsed = createIntentSchema.safeParse(req.body);
  if (!parsed.success) return fail(res, 422, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join('; '));

  const user = await findUserById(req.user!.id);
  if (!user) return fail(res, 404, 'NOT_FOUND', 'User not found');

  let amount: number;
  let payload: unknown;
  if (parsed.data.purpose === 'STORE_ORDER') {
    amount = parsed.data.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    payload = { items: parsed.data.items, shipping: parsed.data.shipping };
  } else if (parsed.data.purpose === 'REPORT_PURCHASE') {
    const report = await findAstrologyReportById(parsed.data.reportId);
    if (!report) return fail(res, 404, 'NOT_FOUND', 'Report not found');
    amount = report.price + REPORT_BUNDLE_SURCHARGE[parsed.data.bundle];
    payload = { reportId: parsed.data.reportId, bundle: parsed.data.bundle };
  } else if (parsed.data.purpose === 'CONSULTATION') {
    const astro = await findAstrologerById(parsed.data.astrologerId);
    if (!astro) return fail(res, 404, 'NOT_FOUND', 'Astrologer not found');
    const { isLoyal } = await getLoyalty(user.email, astro.id);
    const countryCode = countryFromRequest(req);
    const region = await getRegionForCountry(countryCode);
    const regionMultiplier = region ? Number(region.price_multiplier) : 1;
    const override = region ? await getOverride(astro.id, region.id) : undefined;
    const { pricePerMin } = computePriceWithOverride(astro, parsed.data.type as ConsultationType, isLoyal, regionMultiplier, override ?? null);
    amount = pricePerMin * parsed.data.durationMinutes;
    payload = { astrologerId: parsed.data.astrologerId, category: parsed.data.category, type: parsed.data.type, durationMinutes: parsed.data.durationMinutes, countryCode };
  } else if (parsed.data.purpose === 'CONSULTATION_EXTEND') {
    const consultation = await findConsultationById(parsed.data.consultationId);
    if (!consultation) return fail(res, 404, 'NOT_FOUND', 'Consultation not found');
    if (consultation.userEmail !== user.email) return fail(res, 403, 'FORBIDDEN', 'Not your consultation');
    if (consultation.status !== 'ACTIVE') return fail(res, 422, 'VALIDATION_ERROR', 'Consultation is not active');
    amount = consultation.pricePerMin * parsed.data.extraMinutes;
    payload = { consultationId: parsed.data.consultationId, extraMinutes: parsed.data.extraMinutes };
  } else if (parsed.data.purpose === 'SLOT_BOOKING') {
    const slot = await findSlot(parsed.data.slotId);
    if (!slot) return fail(res, 404, 'NOT_FOUND', 'Slot not found');
    if (slot.bookedByUserId) return fail(res, 409, 'ALREADY_BOOKED', 'This slot has already been booked');
    if (slot.scheduledAt <= Date.now()) return fail(res, 422, 'VALIDATION_ERROR', 'This slot is no longer available');
    amount = slot.price;
    payload = { slotId: slot.id };
  } else {
    amount = parsed.data.amount;
    payload = { amount };
  }
  if (amount <= 0) return fail(res, 422, 'VALIDATION_ERROR', 'Amount must be greater than zero');

  const id = `PAY${Date.now()}${randomBytes(3).toString('hex')}`;
  const gateway = gatewayForRequest(req);
  await createPaymentIntent({ id, userId: user.id, purpose: parsed.data.purpose, payload, amount, gateway });

  // Query param on the root, not a path segment — this app is a pure
  // client-routed SPA with no server-side rewrite for arbitrary paths, so
  // `/payment-status/:id` would 404 on a static host after the gateway
  // redirects back. `/` always resolves; AppContext's bootstrap effect
  // picks the id back up from the query string.
  const returnUrl = `${config.clientOrigins[0]}/?payment_id=${id}`;

  try {
    if (gateway === 'cashfree') {
      const cfOrder = await createCashfreeOrder(
        id, amount,
        { id: user.id, name: user.name, email: user.email, phone: user.phone_number || '' },
        returnUrl
      );
      res.status(201).json({ success: true, data: { paymentId: id, gateway, paymentSessionId: cfOrder.payment_session_id } });
    } else {
      const link = await createPaymentLink(id, amount, { name: user.name, email: user.email, contact: user.phone_number || '' }, returnUrl);
      // Razorpay assigns its OWN id to the link ("plink_xxx") — not our
      // reference_id — and that's what GET /payment_links/:id needs later
      // (see the status route below), so it has to be persisted now.
      await setGatewayRef(id, link.id);
      res.status(201).json({ success: true, data: { paymentId: id, gateway, redirectUrl: link.short_url } });
    }
  } catch (err) {
    await markPaymentFailed(id);
    fail(res, 502, 'GATEWAY_ERROR', err instanceof Error ? err.message : 'Could not initiate payment');
  }
});

// Called by the frontend right after the gateway redirects the browser back
// to `/?payment_id=...` (see AppContext's bootstrap effect) — covers both
// the normal case (Cashfree's webhook already landed) and the case where it
// hasn't (or, in local dev, can't reach us at all; Razorpay always needs
// this, since no webhook is wired for it — see razorpayClient.ts). Shares
// the exact same idempotent markPaymentPaid+fulfillPayment path as the
// webhook, so whichever one gets there first wins and the other is a no-op.
paymentsRouter.get('/orders/:id/status', async (req, res) => {
  const payment = await findPaymentById(req.params.id);
  if (!payment || payment.user_id !== req.user!.id) return fail(res, 404, 'NOT_FOUND', 'Payment not found');

  if (payment.status === 'CREATED') {
    try {
      if (payment.gateway === 'cashfree') {
        const cfOrder = await fetchCashfreeOrder(payment.id);
        if (cfOrder.order_status === 'PAID') {
          const updated = await markPaymentPaid(payment.id, null);
          // Separate try/catch from the gateway-lookup one below — once
          // markPaymentPaid flips CREATED->PAID, nothing will ever call
          // fulfillPayment for this payment again (same reasoning as the
          // webhook handler above), so a failure here must be logged
          // distinctly, not folded into "gateway lookup failed, ignore."
          if (updated) {
            try { await fulfillPayment(updated); } catch (err) {
              console.error(`[payments] fulfillPayment failed after status-poll marked PAID — payment ${updated.id}, purpose ${updated.purpose}, user ${updated.user_id}:`, err);
            }
          }
        } else if (cfOrder.order_status === 'EXPIRED' || cfOrder.order_status === 'TERMINATED') {
          await markPaymentFailed(payment.id);
        }
      } else if (payment.gateway_ref) {
        const link = await fetchPaymentLink(payment.gateway_ref);
        if (link.status === 'paid') {
          const updated = await markPaymentPaid(payment.id, link.id);
          if (updated) {
            try { await fulfillPayment(updated); } catch (err) {
              console.error(`[payments] fulfillPayment failed after status-poll marked PAID — payment ${updated.id}, purpose ${updated.purpose}, user ${updated.user_id}:`, err);
            }
          }
        } else if (link.status === 'expired' || link.status === 'cancelled') {
          await markPaymentFailed(payment.id);
        }
      }
    } catch {
      // Gateway lookup failed (e.g. not configured in local dev) — just
      // report the last known status instead of a 502 on a status poll.
    }
  }

  const fresh = await findPaymentById(payment.id);
  res.json({ success: true, data: { status: fresh!.status, purpose: fresh!.purpose, amount: fresh!.amount } });
});

paymentsRouter.get('/wallet', async (req, res) => {
  const user = await findUserById(req.user!.id);
  res.json({ success: true, data: { balance: user?.wallet_balance ?? 0 } });
});
