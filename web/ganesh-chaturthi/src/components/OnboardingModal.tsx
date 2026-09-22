import { useState, type FormEvent } from 'react';
import { useAppContext } from '../../../frontend/src/context/AppContext';
import { ApiRequestError } from '../../../frontend/src/services/authService';
import { signInWithGooglePopup } from '../../../frontend/src/services/firebaseClient';
import { GoogleSignInButton } from '../../../frontend/src/pages/AuthPage/AuthPage';

type Step = 'offer' | 'login';
type Mode = 'register' | 'signin';

// Shows first, before the visitor sees anything else, and stays up until
// they log in — there's deliberately no skip/dismiss path anymore (a
// previous version had one; this campaign now requires login to use
// anything on the site). Two steps: an "offer" pitch first, then an account
// step that toggles between Create Account (register) and Sign In (login),
// plus Google Sign-In on both — a returning visitor was previously forced
// through the registration form every time, which just failed once their
// email/phone already existed instead of ever offering to log them in.
// That's what removes the login wall on Kundli PDF download: KundliSection
// already has its own effect that watches `isLoggedIn` and auto-resumes a
// pending PDF download the moment it becomes true (frontend/src/sections/
// KundliSection/KundliSection.tsx, the "Resume a PDF download after an
// anonymous user was sent to log in" effect) — nothing extra needed here.
export default function OnboardingModal() {
  const { isLoggedIn, register, login, loginWithFirebase, setShowLoginModal, setPendingAction } = useAppContext();
  const [step, setStep] = useState<Step>('offer');
  const [mode, setMode] = useState<Mode>('register');

  // Create Account fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Sign In fields
  const [signinEmail, setSigninEmail] = useState('');
  const [signinPassword, setSigninPassword] = useState('');
  const [signinError, setSigninError] = useState('');
  const [signinLoading, setSigninLoading] = useState(false);

  // Google Sign-In — same handler works for either mode, it's a full
  // login-or-signup on its own.
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  if (isLoggedIn) return null;

  const finishOnboarding = () => {
    setShowLoginModal(false);
    setPendingAction(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password, phone.trim());
      finishOnboarding();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not create your account — that email may already be registered.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    setSigninError('');
    setSigninLoading(true);
    const user = await login(signinEmail.trim(), signinPassword);
    setSigninLoading(false);
    if (!user) { setSigninError('Incorrect email or password.'); return; }
    finishOnboarding();
  };

  const handleGoogleSignIn = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGooglePopup();
      const user = await loginWithFirebase(idToken);
      if (!user) { setGoogleError('Could not sign in with Google. Please try again.'); return; }
      finishOnboarding();
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Could not sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
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
        ) : mode === 'register' ? (
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

              <GoogleSignInButton loading={googleLoading} error={googleError} onClick={handleGoogleSignIn} />

              <button
                type="button"
                onClick={() => setMode('signin')}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: '8px', width: '100%', textAlign: 'center' }}
              >
                Already have an account? Sign In
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="onboardTitle">Welcome Back</h2>
            <p className="onboardSubtitle">Sign in to unlock your Kundli PDF download.</p>

            <form onSubmit={handleSignIn} className="onboardForm">
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="input-field" value={signinEmail} onChange={e => setSigninEmail(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input type="password" className="input-field" value={signinPassword} onChange={e => setSigninPassword(e.target.value)} required />
              </div>

              {signinError && <p className="onboardError">{signinError}</p>}

              <button type="submit" className="btn btn-gold btn-lg" disabled={signinLoading} style={{ width: '100%' }}>
                {signinLoading ? 'Signing in…' : 'Sign In'}
              </button>

              <GoogleSignInButton loading={googleLoading} error={googleError} onClick={handleGoogleSignIn} />

              <button
                type="button"
                onClick={() => setMode('register')}
                style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: '8px', width: '100%', textAlign: 'center' }}
              >
                New here? Create Account
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
