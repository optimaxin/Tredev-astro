import React from 'react';
import { createPortal } from 'react-dom';
import { paymentService, PaymentApiError } from '../../services/paymentService';
import { WalletIcon } from '../Icons/Icons';
import modalStyles from '../PaymentResultModal/PaymentResultModal.module.css';

const PRESETS = [50, 100, 200, 500, 1000];

// Top-up only, in multiples of ₹50 — the sole way money gets into the wallet
// that consultation billing spends from (see realtimeStore.ts's
// acceptConsultation/settleConsultationBilling). Rendered wherever a balance
// is shown (Navigation's wallet chip, the low-balance prompt in
// ConsultationWaitingPage) rather than as its own page, since recharging is
// always a quick in-context action, not a destination.
export default function RechargeWalletModal({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = React.useState(PRESETS[1]);
  const [paying, setPaying] = React.useState(false);
  const [error, setError] = React.useState('');

  const recharge = async () => {
    setPaying(true);
    setError('');
    try {
      await paymentService.pay({ purpose: 'WALLET_RECHARGE', amount });
      // Redirects the whole tab to the gateway — reaching here means it
      // failed before that redirect even happened.
    } catch (e) {
      setError(e instanceof PaymentApiError ? e.message : 'Could not start payment. Please try again.');
      setPaying(false);
    }
  };

  // Portalled to <body> — mounted from Navigation.tsx's <header>, which has
  // its own `transform` (centers the pill nav bar). A transformed ancestor
  // becomes the containing block for `position: fixed` descendants per the
  // CSS spec, which silently broke this modal's backdrop/centering when it
  // rendered inline there. Same fix, same reason, as PdfLoader.tsx's own
  // portal (framer-motion ancestors cause the identical problem elsewhere).
  return createPortal(
    <div className={modalStyles.backdrop} onClick={onClose} role="presentation">
      <div className={modalStyles.card} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Recharge wallet">
        <div className={modalStyles.icon} style={{ background: 'rgba(181,138,59,0.1)', border: '1.5px solid var(--gold-primary)', color: 'var(--gold-primary)' }}>
          <WalletIcon size={28} />
        </div>
        <span className="section-eyebrow">Wallet</span>
        <h2 className={modalStyles.title}>Recharge Your Wallet</h2>
        <div className={modalStyles.divider}>✦ ❖ ✦</div>
        <p className={modalStyles.message}>
          Consultations bill per minute straight from this balance — top up in multiples of ₹50, use it whenever you consult.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 14 }}>
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              className={amount === p ? 'btn btn-gold btn-sm' : 'btn btn-outline-light btn-sm'}
              onClick={() => setAmount(p)}
            >
              ₹{p}
            </button>
          ))}
        </div>

        {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginBottom: 14 }}>{error}</p>}

        <div className={modalStyles.actions}>
          <button type="button" className="btn btn-gold" disabled={paying} onClick={recharge}>
            {paying ? 'Redirecting…' : `Recharge ₹${amount}`}
          </button>
          <button type="button" className="btn btn-outline-light" onClick={onClose} disabled={paying}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
