import { useState, type FormEvent } from 'react';
import { useAppContext } from '../../../frontend/src/context/AppContext';
import { ApiRequestError } from '../../../frontend/src/services/authService';

type Step = 'offer' | 'login';

// Shows first, before the visitor sees anything else, and stays up until
// they register — there's deliberately no skip/dismiss path anymore (a
// previous version had one; this campaign now requires login to use
// anything on the site). Two steps: an "offer" pitch first, then the actual
// registration form (which calls the REAL register() — same as the main
// site's AuthPage — and logs the visitor in immediately). That's what
// removes the login wall on Kundli PDF download: KundliSection already has
// its own effect that watches `isLoggedIn` and auto-resumes a pending PDF
// download the moment it becomes true (frontend/src/sections/KundliSection/
// KundliSection.tsx, the "Resume a PDF download after an anonymous user was
// sent to log in" effect) — nothing extra needed here for that to work.
export default function OnboardingModal() {
  const { isLoggedIn, register, setShowLoginModal, setPendingAction } = useAppContext();
  const [step, setStep] = useState<Step>('offer');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoggedIn) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password, phone.trim());
      setShowLoginModal(false);
      setPendingAction(null);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create your account — that email may already be registered.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onboardOverlay">
      <div className="onboardCard">
        {step === 'offer' ? (
          <>
            <span className="offerBadge">🎉 Ganesh Chaturthi Exclusive</span>
            <h2 className="onboardTitle">Login &amp; Unlock Your Full Kundli — Free</h2>
            <p className="onboardSubtitle">
              Login now and claim the complete Kundli &amp; Calculator Pack, absolutely free this Ganesh Chaturthi.
            </p>
            <div className="offerPriceRow">
              <span className="offerPriceStrike">₹999</span>
              <span className="offerPriceNow">₹0</span>
            </div>
            <p className="offerPriceLabel">for the Full Kundli &amp; Calculator Pack</p>
            <button type="button" className="btn btn-gold btn-lg" style={{ width: '100%' }} onClick={() => setStep('login')}>
              Login &amp; Claim This Free Offer
            </button>
          </>
        ) : (
          <>
            <h2 className="onboardTitle">Create Your Free Account</h2>
            <p className="onboardSubtitle">
              Takes 20 seconds, and unlocks your Kundli PDF download instantly — no separate login later.
            </p>

            <form onSubmit={handleSubmit} className="onboardForm">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="input-field" value={name} onChange={e => setName(e.target.value)} required minLength={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="input-field" value={phone} onChange={e => setPhone(e.target.value)} required minLength={8} />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" />
              </div>

              {error && <p className="onboardError">{error}</p>}

              <button type="submit" className="btn btn-gold btn-lg" disabled={submitting} style={{ width: '100%' }}>
                {submitting ? 'Creating account…' : 'Create My Free Account'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
