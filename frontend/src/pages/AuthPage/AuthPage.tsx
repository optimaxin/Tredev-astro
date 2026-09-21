import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import { authService, ApiRequestError } from '../../services/authService';
import { sendFirebasePhoneOtp, signInWithGooglePopup, toE164IndianNumber } from '../../services/firebaseClient';
import type { ConfirmationResult } from 'firebase/auth';
import styles from './AuthPage.module.css';

type TabType = 'login' | 'register';

export default function AuthPage() {
  const { setPage, login, register, loginWithFirebase, verifyPhoneWithFirebase, t, pendingAction, setPendingAction } = useAppContext();
  const [tab, setTab] = useState<TabType>('register');

  // Google Sign-In — same handler for either tab (it's a full login/signup
  // on its own, not part of the manual form).
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Register state — birth details (date/time/place/timezone) are
  // deliberately NOT collected here anymore; they were making signup feel
  // long, the backend already stores them as optional, and a user can add
  // them any time later via the Free Kundli page's "Save to my profile"
  // button (same fields, same PATCH /api/auth/me/birth-details endpoint).
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  // 'form' -> 'otp' (phone verification, right after account creation, now
  // via Firebase Phone Auth instead of the old custom OTP-over-SMS/AWS SNS)
  // -> 'done'.
  const [registerStep, setRegisterStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  // Firebase's handle for whichever OTP was most recently sent — its
  // .confirm(code) call is what actually checks the code.
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Mirrors the resume behaviour the old LoginModal popup used to do —
  // some gated actions (ai-chat, panchang-location) don't map to a page of
  // their own; those sections watch pendingAction themselves once back home.
  const resumePendingAction = (action: string | null) => {
    if (action === 'profile') setPage('profile');
    else if (action === 'free-kundli') setPage('free-kundli');
    else if (action === 'kundli-pdf') setPage('free-kundli');
    else if (action === 'astrologers') setPage('astrologers');
    else if (action === 'calculator') setPage('astrology-tools');
    else setPage('home');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const redirectByRole = (role: 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN') => {
    if (role === 'USER') {
      resumePendingAction(pendingAction);
    } else {
      setPage('profile');
    }
    setPendingAction(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const user = await login(loginEmail, loginPassword);
    setLoginLoading(false);
    if (!user) {
      setLoginError('Incorrect email or password.');
      return;
    }
    redirectByRole(user.role);
  };

  const handleGoogleSignIn = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGooglePopup();
      const user = await loginWithFirebase(idToken);
      if (!user) { setGoogleError('Could not sign in with Google. Please try again.'); return; }
      redirectByRole(user.role);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Could not sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  // Fires the OTP via Firebase's own SMS delivery — used both right after
  // registration and by the "Resend" button on the otp step.
  const handleSendPhoneOtp = async () => {
    setOtpError('');
    setOtpSendLoading(true);
    try {
      const result = await sendFirebasePhoneOtp(toE164IndianNumber(form.phoneNumber), 'firebase-recaptcha-container');
      setConfirmationResult(result);
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Could not send verification code. Please try again.');
    } finally {
      setOtpSendLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);
    try {
      await register(form.fullName, form.email, form.password, form.phoneNumber.trim());
      setRegisterStep('otp');
      await handleSendPhoneOtp();
    } catch (err) {
      if (err instanceof ApiRequestError) setRegisterError(err.message);
      else setRegisterError('Something went wrong. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      if (!confirmationResult) throw new Error('No active verification code — resend it and try again.');
      const credential = await confirmationResult.confirm(otpCode.trim());
      const idToken = await credential.user.getIdToken();
      await verifyPhoneWithFirebase(idToken);
      setRegisterStep('done');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Incorrect or expired code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleContinue = () => {
    resumePendingAction(pendingAction);
    setPendingAction(null);
  };

  return (
    <div className={styles.creamModalOverlay}>
      {/* Backdrop click to exit */}
      <div className={styles.backdropClick} onClick={() => setPage('home')} />

      {/* Random Celestial Ornaments in Background */}
      <CelestialOrnament
        type="surya_chandra"
        style={{
          position: 'absolute',
          top: '-60px',
          left: '-80px',
          width: '380px',
          height: '380px',
          opacity: 0.85,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        animate
      />

      <CelestialOrnament
        type="rashi"
        style={{
          position: 'absolute',
          bottom: '-100px',
          right: '-100px',
          width: '440px',
          height: '440px',
          opacity: 0.85,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        animate
      />

      <CelestialOrnament
        type="orbit"
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: '280px',
          height: '280px',
          opacity: 0.7,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        animate
      />

      <CelestialOrnament
        type="yantra"
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '4%',
          width: '320px',
          height: '320px',
          opacity: 0.75,
          pointerEvents: 'none',
          zIndex: 1,
        }}
        animate
      />

      {/* Floating Starfield Constellation Elements */}
      <div className={styles.starCluster1}>✦ ❖ ✦</div>
      <div className={styles.starCluster2}>❂ ☼ ❂</div>
      <div className={styles.starCluster3}>✦ ☸ ✦</div>

      {/* Floating Close Button */}
      <button
        className={styles.closeBtn}
        onClick={() => setPage('home')}
        aria-label="Close Scroll"
        title="Close Manuscript"
      >
        ✕
      </button>

      {/* Ancient Unrolled Scroll Container */}
      <motion.div
        className={styles.scrollWrapper}
        initial={{ opacity: 0, scale: 0.92, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 25 }}
        transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Top Scroll Wooden Roller Handle */}
        <div className={styles.topWoodenRoller}>
          <div className={styles.rollerKnobLeft} />
          <div className={styles.rollerCylinder}>
            <span className={styles.rollerPattern}>◈ ❖ ◈ ❖ ◈ ❖ ◈ ❖ ◈ ❖ ◈</span>
          </div>
          <div className={styles.rollerKnobRight} />
        </div>

        {/* Ancient Bhojpatra Parchment Document */}
        <div className={styles.bhojpatraPaper}>

          {/* Corner Antique Brass Clamps */}
          <div className={`${styles.brassClamp} ${styles.clampTopLeft}`}>❖</div>
          <div className={`${styles.brassClamp} ${styles.clampTopRight}`}>❖</div>
          <div className={`${styles.brassClamp} ${styles.clampBottomLeft}`}>❖</div>
          <div className={`${styles.brassClamp} ${styles.clampBottomRight}`}>❖</div>

          {/* Sanskrit Invocation Header */}
          <div className={styles.sanskritHeader}>
            <span className={styles.sanskritInvocation}>॥ श्रीः ॥  ·  ॐ गं गणपतये नमः  ·  ॥ शुभम् ॥</span>
            <div className={styles.invocationDivider}>
              <span className={styles.starGlyph}>✦</span>
              <div className={styles.goldLine} />
              <span className={styles.symbolOm}>ॐ</span>
              <div className={styles.goldLine} />
              <span className={styles.starGlyph}>✦</span>
            </div>
            <h1 className={styles.manuscriptTitle}>
              {tab === 'register' ? 'वैदिक जन्म पत्र ग्रन्थ' : 'सदस्य प्रवेश ग्रन्थ'}
            </h1>
            <p className={styles.manuscriptSubtitle}>
              {tab === 'register' ? t('auth_subtitle_register') : t('auth_subtitle_login')}
            </p>
          </div>

          {/* Vintage Scroll Tab Switcher */}
          <div className={styles.manuscriptTabs}>
            <button
              type="button"
              className={`${styles.manuscriptTab} ${tab === 'register' ? styles.tabActive : ''}`}
              onClick={() => setTab('register')}
            >
              📜 {t('auth_tab_register')}
            </button>
            <button
              type="button"
              className={`${styles.manuscriptTab} ${tab === 'login' ? styles.tabActive : ''}`}
              onClick={() => setTab('login')}
            >
              🗝️ {t('auth_tab_login')}
            </button>
          </div>

          {/* Invisible reCAPTCHA anchor for Firebase Phone Auth — must stay
              mounted regardless of which step is showing (see
              firebaseClient.ts's sendFirebasePhoneOtp). */}
          <div id="firebase-recaptcha-container" />

          <AnimatePresence mode="wait">
            {/* REGISTRATION INSCRIPTION FORM */}
            {tab === 'register' && registerStep === 'form' && (
              <motion.form
                key="register-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleRegister}
                className={styles.scriptForm}
              >
                {/* Full Name Field */}
                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>नामांकन</span> {t('auth_label_fullname')}
                  </label>
                  <input
                    type="text"
                    className={styles.inkInput}
                    placeholder={t('auth_placeholder_fullname')}
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>

                {/* Email & Password Row */}
                <div className={styles.inkRow2}>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>ई-मेल</span> {t('auth_label_email')}
                    </label>
                    <input
                      type="email"
                      className={styles.inkInput}
                      placeholder={t('auth_placeholder_email')}
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>गुप्त कुंजी</span> {t('auth_label_password')}
                    </label>
                    <input
                      type="password"
                      className={styles.inkInput}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                {/* Phone Number — verified by OTP right after the account is created */}
                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>फ़ोन नंबर</span> Phone Number
                  </label>
                  <input
                    type="tel"
                    className={styles.inkInput}
                    placeholder="+91 12345 67890"
                    value={form.phoneNumber}
                    onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>

                {/* Birth date/time/place/timezone are deliberately not
                    collected here anymore — see the `form` state comment
                    above. Add them later from the Free Kundli page. */}

                {registerError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{registerError}</p>
                )}

                {/* Royal Red Wax Seal Button */}
                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={registerLoading}
                  id="auth-register-submit"
                >
                  <div className={styles.sealEmblemInside}>ॐ</div>
                  <span>{registerLoading ? t('auth_btn_inscribing') : `मुद्रित करें · ${t('auth_btn_seal')}`}</span>
                </button>

                <GoogleSignInButton loading={googleLoading} error={googleError} onClick={handleGoogleSignIn} />
              </motion.form>
            )}

            {/* LOGIN FORM */}
            {tab === 'login' && (
              <motion.form
                key="login-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleLogin}
                className={styles.scriptForm}
              >
                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>ई-मेल</span> {t('auth_label_login_email')}
                  </label>
                  <input
                    type="email"
                    className={styles.inkInput}
                    placeholder={t('auth_placeholder_email')}
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>गुप्त कुंजी</span> {t('auth_label_login_password')}
                  </label>
                  <input
                    type="password"
                    className={styles.inkInput}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                {loginError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{loginError}</p>
                )}

                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={loginLoading}
                  id="auth-login-submit"
                >
                  <div className={styles.sealEmblemInside}>🗝️</div>
                  <span>{loginLoading ? t('auth_btn_unlocking') : `प्रवेश करें · ${t('auth_btn_signin_vault')}`}</span>
                </button>

                <GoogleSignInButton loading={googleLoading} error={googleError} onClick={handleGoogleSignIn} />
              </motion.form>
            )}

            {/* PHONE OTP VERIFICATION STEP — shown right after account creation, via Firebase Phone Auth */}
            {tab === 'register' && registerStep === 'otp' && (
              <motion.form
                key="otp-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleVerifyOtp}
                className={styles.scriptForm}
              >
                <p className={styles.successSubtext} style={{ marginBottom: 'var(--space-4)' }}>
                  We sent a 6-digit code to {form.phoneNumber}. Enter it below to verify your number.
                </p>
                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>Verification Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className={styles.inkInput}
                    placeholder="123456"
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                {otpError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{otpError}</p>
                )}
                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={otpLoading || otpSendLoading || otpCode.length !== 6}
                  id="auth-otp-verify-btn"
                >
                  <span>{otpLoading ? 'Verifying…' : 'Verify Phone Number'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSendPhoneOtp}
                  disabled={otpSendLoading}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: 'var(--space-2)' }}
                >
                  {otpSendLoading ? 'Sending…' : "Didn't get a code? Resend"}
                </button>
                <button
                  type="button"
                  onClick={() => setRegisterStep('done')}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', marginTop: 'var(--space-2)', opacity: 0.7 }}
                >
                  Skip for now
                </button>
              </motion.form>
            )}

            {/* REGISTRATION SUCCESS STATE */}
            {tab === 'register' && registerStep === 'done' && (
              <motion.div
                key="success-script"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className={styles.successManuscript}
              >
                <div className={styles.royalWaxSealBig}>ॐ</div>
                <h2 className={styles.successHeader}>जन्मांग अभिलिखितम्!</h2>
                <p className={styles.successSubtext}>
                  {t('auth_success_message').replace('{name}', form.fullName)}
                </p>
                <button
                  type="button"
                  className={styles.waxSealBtn}
                  onClick={handleContinue}
                  id="auth-continue-btn"
                >
                  <span>{t('auth_btn_continue')}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Sanskrit Stamp */}
          <div className={styles.scriptFooterStamp}>
            🔒 गोपनीयं जन्म पत्रम् · {t('auth_footer_stamp')}
          </div>

        </div>

        {/* Bottom Scroll Wooden Roller Handle */}
        <div className={styles.bottomWoodenRoller}>
          <div className={styles.rollerKnobLeft} />
          <div className={styles.rollerCylinder}>
            <span className={styles.rollerPattern}>◈ ❖ ◈ ❖ ◈ ❖ ◈ ❖ ◈ ❖ ◈</span>
          </div>
          <div className={styles.rollerKnobRight} />
        </div>
      </motion.div>
    </div>
  );
}

// Deliberately plain (not manuscript-themed) — Google's own brand guidelines
// want its sign-in button recognizable, not restyled into a site's theme.
// Exported so the campaign's OnboardingModal (a separate, differently-themed
// sign-up flow that also needs Google Sign-In) can reuse it as-is instead of
// duplicating it.
export function GoogleSignInButton({ loading, error, onClick }: { loading: boolean; error: string; onClick: () => void }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 'var(--space-3) 0' }}>
        <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.15)' }} />
        <span style={{ fontSize: '0.75rem', color: '#8a6d3b' }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.15)' }} />
      </div>
      {error && <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{error}</p>}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: '6px', border: '1px solid #dadce0', background: '#fff',
          color: '#3c4043', fontSize: '0.9rem', fontWeight: 500, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
        }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.87 2.7-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.98v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.68 9c0-.59.1-1.16.27-1.7V4.97H.98A9 9 0 0 0 0 9c0 1.45.35 2.83.98 4.03l2.97-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .98 4.97l2.97 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        {loading ? 'Signing in…' : 'Continue with Google'}
      </button>
    </>
  );
}
