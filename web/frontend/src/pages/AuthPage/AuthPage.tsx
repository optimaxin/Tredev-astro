import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import { sendFirebasePhoneOtp, signInWithGooglePopup, toE164 } from '../../services/firebaseClient';
import { API_URL } from '../../services/apiUrl';
import { authService, ApiRequestError } from '../../services/authService';
import { COUNTRY_CODES, DEFAULT_COUNTRY, findByIso2, flagEmoji, type CountryCode } from '../../data/countryCodes';
import type { ConfirmationResult } from 'firebase/auth';
import styles from './AuthPage.module.css';

// Unified sign-in/sign-up: phone number (OTP), "Continue with Google", or
// email/password login and registration. Both Phone and Google use Firebase,
// while email auth runs through our direct API.
type Step = 'entry' | 'otp' | 'name' | 'done' | 'email-login' | 'register-otp';

export default function AuthPage() {
  const { setPage, login, register, loginWithFirebase, verifyPhoneWithFirebase, saveMyName, t, pendingAction, setPendingAction } = useAppContext();
  const [step, setStep] = useState<Step>('entry');

  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');

  // Required consent — gates both sign-up paths below (phone OTP and
  // Google), since loginWithFirebase creates the account transparently on
  // first sign-in for either one; there's no separate "create account" step
  // to hang this on instead. A returning user sees it too — same as any
  // combined login/signup screen elsewhere.
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Phone entry + OTP — country defaults to India, then swapped for the
  // visitor's actual country as soon as IP geolocation resolves (same
  // free, offline lookup lib/geoLocation.ts already uses for pricing;
  // see GET /api/geo/country). Always user-overridable via the dropdown,
  // since IP geolocation is a best-effort guess (VPNs, travel, etc.).
  const [country, setCountry] = useState<CountryCode>(DEFAULT_COUNTRY);
  useEffect(() => {
    let cancelled = false;
    fetch(`${API_URL}/api/geo/country`)
      .then(res => res.json())
      .then((body: { countryCode: string | null }) => {
        if (cancelled) return;
        const match = findByIso2(body.countryCode);
        if (match) setCountry(match);
      })
      .catch(() => {}); // best-effort — the India default is a fine fallback
    return () => { cancelled = true; };
  }, []);
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

  // Email login & registration
  const [emailMode, setEmailMode] = useState<'signin' | 'register'>('signin');
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  // Set once the register-step OTP has been sent, so the verify step and its
  // resend button know what number to confirm against without re-deriving it
  // from registerPhone (which the user could still edit on the prior step).
  const [pendingPhoneE164, setPendingPhoneE164] = useState('');
  const [registerOtpCode, setRegisterOtpCode] = useState('');
  const [registerOtpError, setRegisterOtpError] = useState('');
  const [registerOtpLoading, setRegisterOtpLoading] = useState(false);
  const [registerOtpSendLoading, setRegisterOtpSendLoading] = useState(false);
  const [registerConfirmation, setRegisterConfirmation] = useState<ConfirmationResult | null>(null);
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
    else if (action === 'pooja') setPage('pooja');
    else if (action === 'raghav-booking') setPage('raghav-booking');
    else if (action === 'apply-astrologer') setPage('apply-astrologer');
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
    if (!agreedToTerms) { setGoogleError('Please agree to the Terms, Privacy Policy and Safety guidelines to continue.'); return; }
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
    if (!agreedToTerms) { setPhoneError('Please agree to the Terms, Privacy Policy and Safety guidelines to continue.'); return; }
    setOtpSendLoading(true);
    try {
      const result = await sendFirebasePhoneOtp(toE164(phoneNumber, country.dialCode), 'firebase-recaptcha-container');
      setConfirmationResult(result);
      setStep('otp');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-phone-number')) {
        setPhoneError('Please enter a valid phone number — double-check the digit count for your country.');
      } else if (msg.includes('auth/too-many-requests') || msg.includes('quota')) {
        setPhoneError('SMS quota exceeded or too many requests. Please sign in with Google or Email.');
      } else if (msg.includes('reCAPTCHA') || msg.includes('captcha')) {
        setPhoneError('Verification check failed. Please refresh the page and try again.');
      } else {
        setPhoneError(msg || 'Could not send verification code. Please try again.');
      }
    } finally {
      setOtpSendLoading(false);
    }
  };

  // Re-sends via the same Firebase call as the initial send
  const handleResendOtp = async () => {
    setOtpError('');
    setOtpSendLoading(true);
    try {
      const result = await sendFirebasePhoneOtp(toE164(phoneNumber, country.dialCode), 'firebase-recaptcha-container');
      setConfirmationResult(result);
      setOtpCode('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setOtpError(msg || 'Could not resend the code. Please try again.');
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
    try {
      const user = await login(loginEmail.trim(), loginPassword);
      if (!user) {
        setLoginError('Invalid email or password. If you do not have an account yet, switch to "Create Account" above.');
        return;
      }
      redirectByRole(user.role);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setLoginError(err.message === 'Invalid email or password' ? 'Invalid email or password. If you do not have an account yet, switch to "Create Account" above.' : err.message);
      } else {
        setLoginError(err instanceof Error ? err.message : 'Could not sign in. Please verify your connection.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // Phone is mandatory and must be OTP-verified before the account exists —
  // so this only sends the code; the account itself is created in
  // handleVerifyRegisterOtp, after the code is confirmed with Firebase.
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!agreedToTerms) {
      setLoginError('Please agree to the Terms, Privacy Policy and Safety guidelines to continue.');
      return;
    }
    if (loginPassword.length < 8) {
      setLoginError('Password must be at least 8 characters.');
      return;
    }
    if (!registerPhone.trim()) {
      setLoginError('Phone number is required — we use it to verify your account.');
      return;
    }
    setLoginLoading(true);
    try {
      const phoneVal = toE164(registerPhone, country.dialCode);
      const result = await sendFirebasePhoneOtp(phoneVal, 'firebase-recaptcha-container');
      setRegisterConfirmation(result);
      setPendingPhoneE164(phoneVal);
      setRegisterOtpCode('');
      setRegisterOtpError('');
      setStep('register-otp');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('auth/invalid-phone-number')) {
        setLoginError('Please enter a valid phone number — double-check the digit count for your country.');
      } else if (msg.includes('auth/too-many-requests') || msg.includes('quota')) {
        setLoginError('SMS quota exceeded or too many requests. Please try again shortly.');
      } else {
        setLoginError(msg || 'Could not send a verification code to that phone number. Please try again.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleResendRegisterOtp = async () => {
    setRegisterOtpError('');
    setRegisterOtpSendLoading(true);
    try {
      const result = await sendFirebasePhoneOtp(pendingPhoneE164, 'firebase-recaptcha-container');
      setRegisterConfirmation(result);
      setRegisterOtpCode('');
    } catch (err) {
      setRegisterOtpError(err instanceof Error ? err.message : 'Could not resend the code. Please try again.');
    } finally {
      setRegisterOtpSendLoading(false);
    }
  };

  const handleVerifyRegisterOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterOtpError('');
    setRegisterOtpLoading(true);
    try {
      if (!registerConfirmation) throw new Error('No active verification code — go back and resend it.');
      const credential = await registerConfirmation.confirm(registerOtpCode.trim());
      const idToken = await credential.user.getIdToken();
      const res = await register(registerName.trim(), loginEmail.trim(), loginPassword, pendingPhoneE164);
      // Account now exists — attach the Firebase-verified phone to it so it
      // isn't just stored but marked phone_verified (see authService.ts's
      // linkFirebasePhone). The OTP was already confirmed above; this just
      // records that onto the newly created account.
      await verifyPhoneWithFirebase(idToken);
      redirectByRole(res.user.role);
    } catch (err) {
      const code = (err as { code?: string })?.code;
      if (code === 'auth/code-expired') setRegisterOtpError('This code has expired — tap "Resend code" below for a new one.');
      else if (code === 'auth/invalid-verification-code') setRegisterOtpError('That code is incorrect — double-check it and try again.');
      else setRegisterOtpError(err instanceof ApiRequestError ? err.message : (err instanceof Error ? err.message : 'Could not verify your phone number. Please try again.'));
    } finally {
      setRegisterOtpLoading(false);
    }
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
              {step === 'email-login'
                ? (emailMode === 'signin' ? 'सदस्य प्रवेश ग्रन्थ' : 'नया सदस्य पंजीकरण')
                : 'वैदिक जन्म पत्र ग्रन्थ'}
            </h1>
            <p className={styles.manuscriptSubtitle}>
              {step === 'email-login'
                ? (emailMode === 'signin' ? t('auth_subtitle_login') : 'वैदिक खाता बनाएं एवं अपनी जन्म पत्रिका सुरक्षित रखें')
                : t('auth_subtitle_register')}
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
                  <div style={{ display: 'flex', gap: 8 }}>
                    {/* Auto-selected from IP geolocation on mount (see the
                        useEffect above) — always changeable, since that's a
                        best-effort guess, not a guarantee. */}
                    <select
                      className={styles.inkInput}
                      style={{ flex: '0 0 auto', width: 100 }}
                      value={country.iso2}
                      onChange={e => {
                        const match = findByIso2(e.target.value);
                        if (match) setCountry(match);
                      }}
                      aria-label="Country code"
                    >
                      {COUNTRY_CODES.map(c => (
                        <option key={c.iso2} value={c.iso2}>
                          {flagEmoji(c.iso2)} +{c.dialCode}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      className={styles.inkInput}
                      style={{ flex: 1 }}
                      placeholder="12345 67890"
                      value={phoneNumber}
                      onChange={e => setPhoneNumber(e.target.value)}
                      required
                      minLength={6}
                      autoFocus
                    />
                  </div>
                </div>

                <ConsentCheckbox agreed={agreedToTerms} onChange={setAgreedToTerms} goToPage={setPage} />

                {phoneError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{phoneError}</p>
                )}

                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={otpSendLoading || !agreedToTerms}
                  id="auth-send-otp"
                >
                  <div className={styles.sealEmblemInside}>ॐ</div>
                  <span>{otpSendLoading ? 'Sending…' : 'Send OTP'}</span>
                </button>

                <GoogleSignInButton loading={googleLoading} error={googleError} onClick={handleGoogleSignIn} />

                <button
                  type="button"
                  onClick={() => { setStep('email-login'); setEmailMode('signin'); setLoginError(''); }}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: 'var(--space-3)', opacity: 0.85, alignSelf: 'center', fontFamily: 'var(--font-sans)', color: 'inherit' }}
                >
                  ई-मेल द्वारा प्रवेश या नया खाता बनाएं (Sign in or Register with Email)
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
                  We sent a 6-digit code to {toE164(phoneNumber, country.dialCode)}. Enter it below to continue.
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
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', color: 'inherit' }}
                  >
                    {otpSendLoading ? 'Sending…' : "Didn't get it? Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('entry')}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', color: 'inherit' }}
                  >
                    Wrong number?
                  </button>
                </div>
              </motion.form>
            )}

            {/* REGISTER-STEP PHONE VERIFICATION — account isn't created until
                this code is confirmed (see handleVerifyRegisterOtp). */}
            {step === 'register-otp' && (
              <motion.form
                key="register-otp-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={handleVerifyRegisterOtp}
                className={styles.scriptForm}
              >
                <p className={styles.successSubtext} style={{ marginBottom: 'var(--space-4)' }}>
                  We sent a 6-digit code to {pendingPhoneE164}. Enter it below to create your account.
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
                    value={registerOtpCode}
                    onChange={e => setRegisterOtpCode(e.target.value.replace(/\D/g, ''))}
                    required
                    autoFocus
                  />
                </div>
                {registerOtpError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{registerOtpError}</p>
                )}
                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={registerOtpLoading || registerOtpCode.length !== 6}
                  id="auth-register-otp-verify-btn"
                >
                  <span>{registerOtpLoading ? 'Verifying…' : 'Verify & Create Account'}</span>
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-2)' }}>
                  <button
                    type="button"
                    onClick={handleResendRegisterOtp}
                    disabled={registerOtpSendLoading}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', color: 'inherit' }}
                  >
                    {registerOtpSendLoading ? 'Sending…' : "Didn't get it? Resend code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('email-login'); setEmailMode('register'); }}
                    style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'var(--font-sans)', color: 'inherit' }}
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

            {/* EMAIL LOGIN & REGISTRATION */}
            {step === 'email-login' && (
              <motion.form
                key="email-auth-script"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                onSubmit={emailMode === 'signin' ? handleLegacyLogin : handleEmailRegister}
                className={styles.scriptForm}
              >
                {/* Mode Selector Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                  <button
                    type="button"
                    onClick={() => { setEmailMode('signin'); setLoginError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: emailMode === 'signin' ? '#8c6d32' : 'rgba(140, 109, 50, 0.1)',
                      color: emailMode === 'signin' ? '#fff' : 'inherit',
                      border: '1px solid #8c6d32',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    प्रवेश (Sign In)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmailMode('register'); setLoginError(''); }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      background: emailMode === 'register' ? '#8c6d32' : 'rgba(140, 109, 50, 0.1)',
                      color: emailMode === 'register' ? '#fff' : 'inherit',
                      border: '1px solid #8c6d32',
                      borderRadius: 6,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    नया खाता (Create Account)
                  </button>
                </div>

                {emailMode === 'register' && (
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>नाम</span> Full Name
                    </label>
                    <input
                      type="text"
                      className={styles.inkInput}
                      placeholder="Your full name"
                      value={registerName}
                      onChange={e => setRegisterName(e.target.value)}
                      required
                      minLength={2}
                      autoFocus
                    />
                  </div>
                )}

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
                    autoFocus={emailMode === 'signin'}
                  />
                </div>

                {emailMode === 'register' && (
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>फ़ोन नंबर</span> Phone Number
                    </label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <select
                        className={styles.inkInput}
                        style={{ flex: '0 0 auto', width: 100 }}
                        value={country.iso2}
                        onChange={e => {
                          const match = findByIso2(e.target.value);
                          if (match) setCountry(match);
                        }}
                        aria-label="Country code"
                      >
                        {COUNTRY_CODES.map(c => (
                          <option key={c.iso2} value={c.iso2}>{flagEmoji(c.iso2)} +{c.dialCode}</option>
                        ))}
                      </select>
                      <input
                        type="tel"
                        className={styles.inkInput}
                        placeholder="Phone number"
                        value={registerPhone}
                        onChange={e => setRegisterPhone(e.target.value)}
                        required
                        minLength={6}
                      />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted, #8a8373)', marginTop: 4 }}>
                      We'll text you a one-time code to verify this number before your account is created.
                    </p>
                  </div>
                )}

                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>गुप्त कुंजी</span> {t('auth_label_login_password')}
                  </label>
                  <input
                    type="password"
                    className={styles.inkInput}
                    placeholder="•••••••• (min 8 characters)"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    required
                    minLength={emailMode === 'register' ? 8 : 1}
                  />
                </div>

                {emailMode === 'register' && (
                  <ConsentCheckbox agreed={agreedToTerms} onChange={setAgreedToTerms} goToPage={setPage} />
                )}

                {loginError && (
                  <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0' }}>{loginError}</p>
                )}

                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={loginLoading}
                  id={emailMode === 'signin' ? 'auth-login-submit' : 'auth-register-submit'}
                >
                  <div className={styles.sealEmblemInside}>{emailMode === 'signin' ? '🗝️' : 'ॐ'}</div>
                  <span>
                    {loginLoading
                      ? (emailMode === 'signin' ? t('auth_btn_unlocking') : 'Creating account…')
                      : (emailMode === 'signin' ? `प्रवेश करें · ${t('auth_btn_signin_vault')}` : 'नया खाता बनाएं · Create Account')}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setStep('entry')}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: 'var(--space-2)', fontFamily: 'var(--font-sans)', color: 'inherit' }}
                >
                  ← Back to phone / Google sign-in
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

// Required before either sign-up path (phone OTP or Google) proceeds — see
// the `agreedToTerms` comment above. The Terms/Privacy/Safety links navigate
// away from this modal (setPage), losing whatever's been typed so far — this
// app has no real per-page URLs to open in a new tab instead, and that's the
// same tradeoff the footer's own links already make.
function ConsentCheckbox({ agreed, onChange, goToPage }: { agreed: boolean; onChange: (v: boolean) => void; goToPage: (p: string) => void }) {
  const linkStyle: React.CSSProperties = { textDecoration: 'underline', color: 'inherit', fontWeight: 600, fontFamily: 'inherit' };
  const goTo = (page: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    goToPage(page);
  };
  return (
    <label style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '4px 0 8px', fontSize: '0.8rem', lineHeight: 1.5, cursor: 'pointer', fontFamily: 'var(--font-sans)' }}>
      <input
        type="checkbox"
        checked={agreed}
        onChange={e => onChange(e.target.checked)}
        style={{ marginTop: '3px', flexShrink: 0 }}
        required
        id="auth-consent-checkbox"
      />
      <span>
        I agree to the{' '}
        <button type="button" onClick={goTo('terms')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...linkStyle }}>Terms of Service</button>,{' '}
        <button type="button" onClick={goTo('privacy')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...linkStyle }}>Privacy Policy</button>, and{' '}
        <button type="button" onClick={goTo('safety')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', ...linkStyle }}>Safety</button> guidelines.
      </span>
    </label>
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
        <span style={{ fontSize: '0.75rem', color: '#8a6d3b', fontFamily: 'var(--font-sans)', fontWeight: 500 }}>or</span>
        <div style={{ flex: 1, height: '1px', background: 'rgba(0,0,0,0.15)' }} />
      </div>
      {error && <p style={{ color: '#c0392b', fontSize: '0.85rem', margin: '4px 0', fontFamily: 'var(--font-sans)' }}>{error}</p>}
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
          padding: '10px 16px', borderRadius: '6px', border: '1px solid #dadce0', background: '#fff',
          color: '#3c4043', fontSize: '0.9rem', fontWeight: 500, fontFamily: 'var(--font-sans)', cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1,
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
