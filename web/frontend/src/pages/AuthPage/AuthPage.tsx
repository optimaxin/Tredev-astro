import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import { sendFirebasePhoneOtp, signInWithGooglePopup, toE164IndianNumber } from '../../services/firebaseClient';
import type { ConfirmationResult } from 'firebase/auth';
import styles from './AuthPage.module.css';

// Unified sign-in/sign-up: phone number (OTP) or "Continue with Google" —
// no upfront email/password form for new users. Both are the SAME Firebase
// call for a returning vs. brand-new person (see backend's loginWithFirebase,
// which creates the account on first sign-in and returns `isNewUser`).
// Google's token already carries a name, so a new Google user goes straight
// through; Phone Auth's token doesn't, so a new phone user gets exactly one
// extra "what's your name?" step. Old-style email+password accounts (the
// seeded demo accounts, and anyone who signed up before this redesign) still
// need a way in — that's the small "Log in with email instead" reveal below,
// not a place to create new password accounts anymore.
type Step = 'entry' | 'otp' | 'name' | 'done' | 'email-login';

export default function AuthPage() {
  const { setPage, login, loginWithFirebase, saveMyName, t, pendingAction, setPendingAction } = useAppContext();
  const [step, setStep] = useState<Step>('entry');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Phone entry + OTP
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [otpSendLoading, setOtpSendLoading] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  // Carried from loginWithFirebase's result into the 'name' step, so
  // redirectByRole after saving the name still knows where this account goes.
  const [pendingRole, setPendingRole] = useState<'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN'>('USER');

  // Name step (new phone signups only)
  const [nameInput, setNameInput] = useState('');
  const [nameError, setNameError] = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // Legacy email+password login (existing accounts only — see file comment)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

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
    if (role === 'USER') resumePendingAction(pendingAction);
    else setPage('profile');
    setPendingAction(null);
  };

  const handleGoogleSignIn = async () => {
    setGoogleError('');
    setGoogleLoading(true);
    try {
      const idToken = await signInWithGooglePopup();
      const result = await loginWithFirebase(idToken);
      if (!result) { setGoogleError('Could not sign in with Google. Please try again.'); return; }
      // Google's ID token always carries a name (unlike Phone Auth), so
      // there's nothing left to ask even for a brand-new account.
      redirectByRole(result.user.role);
    } catch (err) {
      setGoogleError(err instanceof Error ? err.message : 'Could not sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError('');
    setOtpSendLoading(true);
    try {
      const result = await sendFirebasePhoneOtp(toE164IndianNumber(phoneNumber), 'firebase-recaptcha-container');
      setConfirmationResult(result);
      setStep('otp');
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : 'Could not send verification code. Please try again.');
    } finally {
      setOtpSendLoading(false);
    }
  };

  // Re-sends via the same Firebase call as the initial send (a new
  // ConfirmationResult replaces the old one, since the previous code is
  // still tied to the expired verification attempt) — needed because a
  // Firebase OTP expires after a few minutes, and without this the only way
  // out of an expired code was going back and re-entering the phone number.
  const handleResendOtp = async () => {
    setOtpError('');
    setOtpSendLoading(true);
    try {
      const result = await sendFirebasePhoneOtp(toE164IndianNumber(phoneNumber), 'firebase-recaptcha-container');
      setConfirmationResult(result);
      setOtpCode('');
    } catch (err) {
      setOtpError(err instanceof Error ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setOtpSendLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      if (!confirmationResult) throw new Error('No active verification code — go back and resend it.');
      const credential = await confirmationResult.confirm(otpCode.trim());
      const idToken = await credential.user.getIdToken();
      const result = await loginWithFirebase(idToken);
      if (!result) { setOtpError('Could not verify — please try again.'); return; }
      if (result.isNewUser) {
        setPendingRole(result.user.role);
        setStep('name');
      } else {
        redirectByRole(result.user.role);
      }
    } catch (err) {
      // Firebase's own Error#message is the raw "Firebase: Error
      // (auth/code-expired)." string — not something to show as-is. A
      // Firebase auth error always carries a `.code` like that; map the
      // common ones to something that tells the person what to actually do.
      const code = (err as { code?: string })?.code;
      if (code === 'auth/code-expired') setOtpError('This code has expired — tap "Resend code" below for a new one.');
      else if (code === 'auth/invalid-verification-code') setOtpError('That code is incorrect — double-check it and try again.');
      else setOtpError(err instanceof Error ? err.message : 'Incorrect or expired code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError('');
    setNameLoading(true);
    try {
      const ok = await saveMyName(nameInput.trim());
      if (!ok) { setNameError('Could not save your name — please try again.'); return; }
      setStep('done');
    } finally {
      setNameLoading(false);
    }
  };

  const handleLegacyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const user = await login(loginEmail, loginPassword);
    setLoginLoading(false);
    if (!user) { setLoginError('Incorrect email or password.'); return; }
    redirectByRole(user.role);
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
              {step === 'email-login' ? 'सदस्य प्रवेश ग्रन्थ' : 'वैदिक जन्म पत्र ग्रन्थ'}
            </h1>
            <p className={styles.manuscriptSubtitle}>
              {step === 'email-login' ? t('auth_subtitle_login') : t('auth_subtitle_register')}
            </p>
          </div>

          {/* Invisible reCAPTCHA anchor for Firebase Phone Auth — must stay
              mounted regardless of which step is showing (see
              firebaseClient.ts's sendFirebasePhoneOtp). */}
          <div id="firebase-recaptcha-container" />

          <AnimatePresence mode="wait">
            {/* ENTRY: phone number OR Google — the only two ways to sign up
                or log in now. Same form handles both a brand-new visitor and
                a returning one; loginWithFirebase tells them apart. */}
            {step === 'entry' && (
              <motion.form
                key="entry-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSendOtp}
                className={styles.scriptForm}
              >
                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>फ़ोन नंबर</span> Phone Number
                  </label>
                  <input
                    type="tel"
                    className={styles.inkInput}
                    placeholder="+91 12345 67890"
                    value={phoneNumber}
                    onChange={e => setPhoneNumber(e.target.value)}
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>

                {phoneError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{phoneError}</p>
                )}

                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={otpSendLoading}
                  id="auth-send-otp"
                >
                  <div className={styles.sealEmblemInside}>ॐ</div>
                  <span>{otpSendLoading ? 'Sending…' : 'Send OTP'}</span>
                </button>

                <GoogleSignInButton loading={googleLoading} error={googleError} onClick={handleGoogleSignIn} />

                <button
                  type="button"
                  onClick={() => setStep('email-login')}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.8rem', marginTop: 'var(--space-3)', opacity: 0.7, alignSelf: 'center' }}
                >
                  Already have an account with email &amp; password? Log in instead
                </button>
              </motion.form>
            )}

            {/* OTP VERIFICATION */}
            {step === 'otp' && (
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
                  We sent a 6-digit code to {phoneNumber}. Enter it below to continue.
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
                    autoFocus
                  />
                </div>
                {otpError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{otpError}</p>
                )}
                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={otpLoading || otpCode.length !== 6}
                  id="auth-otp-verify-btn"
                >
                  <span>{otpLoading ? 'Verifying…' : 'Verify & Continue'}</span>
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={otpSendLoading}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    {otpSendLoading ? 'Sending…' : "Didn't get it? Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('entry')}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Wrong number?
                  </button>
                </div>
              </motion.form>
            )}

            {/* NAME — only reached for a brand-new phone-only signup, since
                Phone Auth's token carries no name claim (Google's does). */}
            {step === 'name' && (
              <motion.form
                key="name-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleSaveName}
                className={styles.scriptForm}
              >
                <p className={styles.successSubtext} style={{ marginBottom: 'var(--space-4)' }}>
                  Phone number verified! What should we call you?
                </p>
                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>नामांकन</span> {t('auth_label_fullname')}
                  </label>
                  <input
                    type="text"
                    className={styles.inkInput}
                    placeholder={t('auth_placeholder_fullname')}
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>
                {nameError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{nameError}</p>
                )}
                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={nameLoading}
                  id="auth-save-name-btn"
                >
                  <div className={styles.sealEmblemInside}>ॐ</div>
                  <span>{nameLoading ? 'Saving…' : 'Continue'}</span>
                </button>
              </motion.form>
            )}

            {/* SUCCESS — only shown after the extra name step (phone signup);
                Google and returning-user logins redirect straight away. */}
            {step === 'done' && (
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
                  {t('auth_success_message').replace('{name}', nameInput)}
                </p>
                <button
                  type="button"
                  className={styles.waxSealBtn}
                  onClick={() => redirectByRole(pendingRole)}
                  id="auth-continue-btn"
                >
                  <span>{t('auth_btn_continue')}</span>
                </button>
              </motion.div>
            )}

            {/* LEGACY EMAIL+PASSWORD LOGIN — existing accounts only (the
                seeded demo accounts, and anyone who signed up before this
                redesign). Not a signup path anymore; see file comment. */}
            {step === 'email-login' && (
              <motion.form
                key="login-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleLegacyLogin}
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
                    autoFocus
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

                <button
                  type="button"
                  onClick={() => setStep('entry')}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: 'var(--space-2)' }}
                >
                  Back to phone / Google sign-in
                </button>
              </motion.form>
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
