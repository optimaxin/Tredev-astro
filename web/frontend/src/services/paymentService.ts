// Thin client for backend/app/api/payments.routes.ts, plus the Cashfree
// Checkout JS SDK loader. Loaded from Cashfree's CDN (not an npm dependency —
// this is the same script tag Cashfree's own docs use) so there's nothing to
// bundle for a widget shown once, at checkout.
import { API_URL } from './apiUrl';

export class PaymentApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_access_token');
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/payments${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new PaymentApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new PaymentApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

// Which processor actually handles the money — decided server-side from the
// visitor's IP (see payments.routes.ts's gatewayForRequest), never a client
// choice. Cashfree opens its own hosted page via a JS SDK; Razorpay's
// equivalent (a Payment Link) is a plain URL, no SDK involved at all — this
// type only describes the create-intent response, not anything sent by us.
export type PaymentGateway = 'cashfree' | 'razorpay';

export type StoreOrderIntent = { purpose: 'STORE_ORDER'; items: { productId: number; name: string; price: number; quantity: number }[]; shipping: { name: string; address: string; city: string; zip: string } };
export type ReportPurchaseIntent = { purpose: 'REPORT_PURCHASE'; reportId: number; bundle: 'report-only' | 'report-qa' | 'report-consult' };
export type WalletRechargeIntent = { purpose: 'WALLET_RECHARGE'; amount: number };
export type ConsultationIntent = { purpose: 'CONSULTATION'; astrologerId: number; category: string; type: 'chat' | 'voice' | 'video'; durationMinutes: number };
export type ConsultationExtendIntent = { purpose: 'CONSULTATION_EXTEND'; consultationId: string; extraMinutes: number };
export type SlotBookingIntent = { purpose: 'SLOT_BOOKING'; slotId: string };
export type PaymentIntent = StoreOrderIntent | ReportPurchaseIntent | WalletRechargeIntent | ConsultationIntent | ConsultationExtendIntent | SlotBookingIntent;

export interface PaymentStatusResult {
  status: 'CREATED' | 'PAID' | 'FAILED';
  purpose: 'STORE_ORDER' | 'REPORT_PURCHASE' | 'WALLET_RECHARGE' | 'CONSULTATION' | 'CONSULTATION_EXTEND' | 'SLOT_BOOKING';
  amount: number;
}

interface CashfreeCheckout {
  checkout: (opts: { paymentSessionId: string; redirectTarget: '_self' }) => Promise<unknown>;
}

let cashfreeSdk: Promise<(opts: { mode: 'sandbox' | 'production' }) => CashfreeCheckout> | null = null;

function loadCashfreeSdk() {
  if (!cashfreeSdk) {
    cashfreeSdk = new Promise((resolve, reject) => {
      const existing = (window as any).Cashfree;
      if (existing) return resolve(existing);
      const script = document.createElement('script');
      script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
      script.onload = () => resolve((window as any).Cashfree);
      script.onerror = () => reject(new Error('Could not load the payment SDK. Please check your connection.'));
      document.head.appendChild(script);
    });
  }
  return cashfreeSdk;
}

const DEFAULT_CASHFREE_MODE: 'sandbox' | 'production' = import.meta.env.VITE_CASHFREE_ENV === 'production' ? 'production' : 'sandbox';

// Creates the payment intent server-side, then sends the whole browser tab
// to the chosen gateway's own hosted payment page — Cashfree via its JS SDK
// (redirectTarget: '_self'), Razorpay via a plain Payment Link redirect.
// Either way this never resolves on success: the browser navigates away
// before that can happen. Whatever comes after `await paymentService.pay(...)`
// in a caller only ever runs for a failure that happened BEFORE the
// redirect (e.g. the intent couldn't be created) — the actual paid/declined
// outcome is decided later, when the gateway redirects back to
// `/?payment_id=...` and AppContext's bootstrap effect calls getStatus() to
// find out what happened.
export async function payWithGateway(intent: PaymentIntent, cashfreeMode: 'sandbox' | 'production' = DEFAULT_CASHFREE_MODE): Promise<void> {
  const result = await request<{ paymentId: string; gateway: PaymentGateway; paymentSessionId?: string; redirectUrl?: string }>('/orders', {
    method: 'POST',
    body: JSON.stringify(intent),
  });

  // Stash where the user actually was — the upcoming redirect is a full
  // browser navigation away and back, which wipes every bit of React state
  // (AppContext's bootstrap effect reads this back on return to land the
  // visitor back on the same page instead of 'home'). `window.history.state`
  // already carries {page, selectedId, concern}, kept in sync by AppContext.
  try {
    const { page, selectedId } = (window.history.state || {}) as { page?: string; selectedId?: number | string | null };
    if (page) localStorage.setItem('pending_payment_return', JSON.stringify({ page, selectedId }));
  } catch {
    // Best-effort — worst case the visitor lands on home after paying.
  }

  if (result.gateway === 'razorpay') {
    window.location.href = result.redirectUrl!;
    return;
  }
  const Cashfree = await loadCashfreeSdk();
  const cashfree = Cashfree({ mode: cashfreeMode });
  await cashfree.checkout({ paymentSessionId: result.paymentSessionId!, redirectTarget: '_self' });
}

export const paymentService = {
  pay: payWithGateway,
  getStatus: (paymentId: string) => request<PaymentStatusResult>(`/orders/${paymentId}/status`),
  getWalletBalance: () => request<{ balance: number }>('/wallet'),
};
