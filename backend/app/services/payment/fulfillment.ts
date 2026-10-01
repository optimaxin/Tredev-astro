import type { PaymentRow } from '../../repositories/paymentRepository.ts';
import { createOrder } from '../../repositories/orderRepository.ts';
import { createReportPurchase } from '../../repositories/reportPurchaseRepository.ts';
import { creditWallet, findUserById } from '../../repositories/userRepository.ts';
import { extendConsultation, requestConsultation, onWalletTopUp } from '../realtimeStore.ts';
import { claimSlot } from '../../repositories/consultationSlotRepository.ts';
import type { OrderItem } from '../../models/order.ts';
import type { ReportBundle } from '../../models/reportPurchase.ts';
import type { ConsultationType } from '../../models/types.ts';

interface StoreOrderPayload {
  items: OrderItem[];
  shipping: { name: string; address: string; city: string; zip: string };
}

interface ReportPurchasePayload {
  reportId: number;
  bundle: ReportBundle;
}

interface ConsultationPayload {
  astrologerId: number;
  category: string;
  type: ConsultationType;
  durationMinutes: number;
  countryCode: string | null;
}

interface ConsultationExtendPayload {
  consultationId: string;
  extraMinutes: number;
}

interface SlotBookingPayload {
  slotId: string;
}

// Called once a payment has actually flipped CREATED -> PAID (see
// markPaymentPaid's idempotency guard) — turns the stored intent payload
// into the real side effect. Never trusts a second client request; the
// payload was fixed server-side when the intent was created in payments.routes.ts.
export async function fulfillPayment(payment: PaymentRow): Promise<void> {
  switch (payment.purpose) {
    case 'STORE_ORDER': {
      const p = payment.payload as StoreOrderPayload;
      await createOrder({
        userId: payment.user_id,
        items: p.items,
        amount: payment.amount,
        shippingName: p.shipping.name,
        shippingAddress: p.shipping.address,
        shippingCity: p.shipping.city,
        shippingZip: p.shipping.zip,
      });
      return;
    }
    case 'REPORT_PURCHASE': {
      const p = payment.payload as ReportPurchasePayload;
      await createReportPurchase(payment.user_id, p.reportId, p.bundle, payment.amount);
      return;
    }
    case 'WALLET_RECHARGE': {
      await creditWallet(payment.user_id, payment.amount);
      // Recharging mid-call is now how a consultation gets "extended" (the
      // old CONSULTATION_EXTEND pay-per-block flow is retired) — see
      // onWalletTopUp's own comment.
      const user = await findUserById(payment.user_id);
      if (user) await onWalletTopUp(user.email);
      return;
    }
    case 'CONSULTATION': {
      const p = payment.payload as ConsultationPayload;
      const user = await findUserById(payment.user_id);
      if (!user) return;
      // Reusing the payment id as the requestId piggybacks on
      // requestConsultation's own idempotency guard (processedRequests) —
      // a retried webhook/status-poll can never double-book this payment.
      const result = await requestConsultation({
        requestId: payment.id,
        astrologerId: p.astrologerId,
        userEmail: user.email,
        userName: user.name,
        category: p.category,
        type: p.type,
        durationMinutes: p.durationMinutes,
        countryCode: p.countryCode,
      });
      // Astrologer went offline/unreachable in the gap between payment and
      // fulfillment — nothing was booked, so refund to wallet rather than
      // silently keeping the user's money for a consultation that never happened.
      if (result.outcome === 'UNAVAILABLE') await creditWallet(payment.user_id, payment.amount);
      return;
    }
    case 'CONSULTATION_EXTEND': {
      const p = payment.payload as ConsultationExtendPayload;
      const user = await findUserById(payment.user_id);
      if (!user) return;
      try {
        await extendConsultation(p.consultationId, user.email, p.extraMinutes);
      } catch {
        // Consultation ended (or was ended by the other party) in the gap
        // between paying and this fulfillment running — refund rather than
        // charge for a top-up that couldn't actually be applied.
        await creditWallet(payment.user_id, payment.amount);
      }
      return;
    }
    case 'SLOT_BOOKING': {
      const p = payment.payload as SlotBookingPayload;
      // Same race as CONSULTATION above: someone else could have paid for
      // and claimed this exact slot in the gap between this payment being
      // created and now. claimSlot's UPDATE...WHERE booked_by_user_id IS
      // NULL is the atomic guard; losing that race means a refund, not a
      // silently-kept charge for a slot this user doesn't actually have.
      const claimed = await claimSlot(p.slotId, payment.user_id, Date.now());
      if (!claimed) await creditWallet(payment.user_id, payment.amount);
      return;
    }
  }
}
