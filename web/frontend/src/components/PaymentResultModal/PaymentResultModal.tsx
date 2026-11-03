import { useAppContext } from '../../context/AppContext';
import type { PaymentResultInfo } from '../../context/AppContext';
import styles from './PaymentResultModal.module.css';

const PURPOSE_LABEL: Record<PaymentResultInfo['purpose'], string> = {
  STORE_ORDER: 'Store Order',
  REPORT_PURCHASE: 'Report Purchase',
  WALLET_RECHARGE: 'Wallet Recharge',
  CONSULTATION: 'Consultation',
  CONSULTATION_EXTEND: 'Consultation Top-Up',
  SLOT_BOOKING: '1:1 Session Booking',
};

// Where the primary/retry buttons send the visitor next. Not a deep link
// back into exactly where they started (e.g. a specific report's page) —
// this app has no per-page URLs to reconstruct that from (see AppContext's
// page/setPage state router) — just the nearest sensible list/checkout page.
const PURPOSE_NAV: Record<PaymentResultInfo['purpose'], { successLabel: string; successPage: string; retryPage: string }> = {
  STORE_ORDER: { successLabel: 'View My Orders', successPage: 'my-orders', retryPage: 'checkout' },
  REPORT_PURCHASE: { successLabel: 'View My Reports', successPage: 'my-reports', retryPage: 'reports' },
  WALLET_RECHARGE: { successLabel: 'Go to My Wallet', successPage: 'profile', retryPage: 'profile' },
  // Success never actually shows this modal (see AppContext's bootstrap
  // effect — a paid CONSULTATION navigates straight to consultation-waiting
  // instead), only failure does; successPage is unreachable but still typed.
  CONSULTATION: { successLabel: 'View My Consultations', successPage: 'consultation-waiting', retryPage: 'consultation-booking' },
  // Same as CONSULTATION — success never shows this modal, only a failed
  // top-up does; retry just goes back to the same active consultation.
  CONSULTATION_EXTEND: { successLabel: 'View My Consultations', successPage: 'consultation-waiting', retryPage: 'consultation-waiting' },
  SLOT_BOOKING: { successLabel: 'View Booking', successPage: 'raghav-booking', retryPage: 'raghav-booking' },
};

// Rendered globally (see App.tsx) so it can pop up over whatever page the
// visitor lands back on — Cashfree's hosted payment page redirects the whole
// tab away and back (see paymentService.pay), so there's no single "checkout"
// page left mounted to show this inline; AppContext's bootstrap effect sets
// paymentResult once it confirms the real outcome with the backend.
export default function PaymentResultModal() {
  const { paymentResult, setPaymentResult, setPage } = useAppContext();
  if (!paymentResult) return null;

  const isSuccess = paymentResult.status === 'success';
  const nav = PURPOSE_NAV[paymentResult.purpose];

  const close = () => setPaymentResult(null);
  const goTo = (page: string) => { setPaymentResult(null); setPage(page); };

  return (
    <div className={styles.backdrop} onClick={close} role="presentation">
      <div className={styles.card} onClick={e => e.stopPropagation()} role="alertdialog" aria-modal="true" aria-label={isSuccess ? 'Payment successful' : 'Payment declined'}>
        <div className={`${styles.icon} ${isSuccess ? styles.iconSuccess : styles.iconFail}`}>
          {isSuccess ? '✓' : '✕'}
        </div>

        <span className="section-eyebrow">{PURPOSE_LABEL[paymentResult.purpose]}</span>
        <h2 className={styles.title}>{isSuccess ? 'Payment Successful' : 'Payment Declined'}</h2>
        <div className={styles.divider}>✦ ❖ ✦</div>

        <p className={styles.message}>
          {isSuccess ? `₹${paymentResult.amount} was charged successfully.` : (paymentResult.message || 'Your payment could not be completed.')}
        </p>

        <div className={styles.actions}>
          {isSuccess ? (
            <button type="button" className="btn btn-gold" onClick={() => goTo(nav.successPage)}>{nav.successLabel}</button>
          ) : (
            <button type="button" className="btn btn-gold" onClick={() => goTo(nav.retryPage)}>Try Again</button>
          )}
          <button type="button" className="btn btn-outline-light" onClick={close}>Close</button>
        </div>
      </div>
    </div>
  );
}
