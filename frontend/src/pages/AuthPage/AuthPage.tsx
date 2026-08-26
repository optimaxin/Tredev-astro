import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import AncientDatePicker from '../../components/AncientDatePicker/AncientDatePicker';
import AncientTimePicker from '../../components/AncientTimePicker/AncientTimePicker';
import LocationAutocomplete from '../../components/LocationAutocomplete/LocationAutocomplete';
import { TIMEZONES } from '../../components/BirthDetailsForm/BirthDetailsForm';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { GeocodeResult } from '../../services/calculatorService';
import { authService } from '../../services/authService';
import styles from './AuthPage.module.css';

type TabType = 'login' | 'register';

export default function AuthPage() {
  const { setPage, login, register, t, pendingAction, setPendingAction } = useAppContext();
  const [tab, setTab] = useState<TabType>('register');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [registerError, setRegisterError] = useState('');

  // Register state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    dob: '',
    timeOfBirth: '',
    placeOfBirth: '',
    timezoneOffset: TIMEZONES[0].offset,
    gender: 'Male',
  });
  // Set only when the user picks an actual suggestion — carries its exact
  // coordinates directly, so submit can skip a second (less precise) geocode
  // guess entirely. Any further edit to the text invalidates it.
  const [selectedGeo, setSelectedGeo] = useState<GeocodeResult | null>(null);
  const [registerLoading, setRegisterLoading] = useState(false);
  // 'form' -> 'otp' (phone verification, right after account creation) -> 'done'
  const [registerStep, setRegisterStep] = useState<'form' | 'otp' | 'done'>('form');
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpResendLoading, setOtpResendLoading] = useState(false);
  // Only ever set from a non-production API response (see authService.ts /
  // backend authService.ts's sendPhoneOtp) — lets registration be tested
  // end-to-end before real AWS SNS credentials are configured.
  const [devOtpCode, setDevOtpCode] = useState<string | undefined>();

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

  const redirectByRole = (role: 'USER' | 'ASTROLOGIST' | 'ADMIN') => {
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterLoading(true);
    try {
      const geo = selectedGeo ?? await calculatorService.geocode(form.placeOfBirth.trim());
      const result = await register(form.fullName, form.email, form.password, form.phoneNumber.trim(), {
        birthDate: form.dob,
        birthTime: form.timeOfBirth,
        birthPlace: geo.displayName,
        birthLatitude: geo.latitude,
        birthLongitude: geo.longitude,
        birthTimezoneOffsetMinutes: form.timezoneOffset,
      });
      if (!result) {
        setRegisterError('An account with this email already exists, the password is too short, or the server could not be reached. Please try again.');
        return;
      }
      setDevOtpCode(result.devOtpCode);
      setRegisterStep('otp');
    } catch (err) {
      setRegisterError(err instanceof CalculatorApiError ? `Place of birth: ${err.message}` : 'Something went wrong. Please try again.');
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpLoading(true);
    try {
      const accessToken = localStorage.getItem('auth_access_token');
      if (!accessToken) { setOtpError('Session expired — please register again.'); return; }
      await authService.verifyOtp(accessToken, otpCode.trim());
      setRegisterStep('done');
    } catch {
      setOtpError('Incorrect or expired code. Please try again.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setOtpResendLoading(true);
    try {
      const accessToken = localStorage.getItem('auth_access_token');
      if (!accessToken) { setOtpError('Session expired — please register again.'); return; }
      const { devOtpCode: resent } = await authService.resendOtp(accessToken);
      setDevOtpCode(resent);
    } catch {
      setOtpError('Could not resend the code — please wait a moment and try again.');
    } finally {
      setOtpResendLoading(false);
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
                    placeholder="+91 98765 43210"
                    value={form.phoneNumber}
                    onChange={e => setForm({ ...form, phoneNumber: e.target.value })}
                    required
                    minLength={8}
                  />
                </div>

                {/* Celestial Inscription Separator */}
                <div className={styles.sacredSeparator}>
                  <div className={styles.sepLine} />
                  <span className={styles.sepText}>❖ जन्म कुण्डली गणना निर्देशांक ({t('auth_separator_birth_coords')}) ❖</span>
                  <div className={styles.sepLine} />
                </div>

                {/* DOB & Time Row */}
                <div className={styles.inkRow2}>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>जन्म तिथि</span> {t('auth_label_dob')}
                    </label>
                    <AncientDatePicker
                      className={styles.inkInput}
                      value={form.dob}
                      onChange={val => setForm({ ...form, dob: val })}
                      required
                      placeholder={t('auth_placeholder_dob')}
                    />
                  </div>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>जन्म समय</span> {t('auth_label_tob')}
                    </label>
                    <AncientTimePicker
                      className={styles.inkInput}
                      value={form.timeOfBirth}
                      onChange={val => setForm({ ...form, timeOfBirth: val })}
                      required
                      placeholder={t('auth_placeholder_tob')}
                    />
                  </div>
                </div>

                {/* Place of Birth & Gender Row */}
                <div className={styles.inkRow2}>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>जन्म स्थान</span> {t('auth_label_pob')}
                    </label>
                    <LocationAutocomplete
                      id="auth-place-of-birth"
                      className={styles.inkInput}
                      placeholder={t('auth_placeholder_pob')}
                      value={form.placeOfBirth}
                      onChange={v => { setForm(f => ({ ...f, placeOfBirth: v })); setSelectedGeo(null); }}
                      onSelect={geo => { setForm(f => ({ ...f, placeOfBirth: geo.displayName })); setSelectedGeo(geo); }}
                      required
                    />
                  </div>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>लिंग</span> {t('auth_label_gender')}
                    </label>
                    <div className={styles.genderRow}>
                      {(['Male', 'Female', 'Other'] as const).map(g => (
                        <button
                          type="button"
                          key={g}
                          className={`${styles.genderOption} ${form.gender === g ? styles.genderOptionActive : ''}`}
                          onClick={() => setForm({ ...form, gender: g })}
                        >
                          {t(`auth_gender_${g.toLowerCase()}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Time Zone */}
                <div className={styles.inkRow2}>
                  <div className={styles.inkField} style={{ gridColumn: '1 / -1' }}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>समय क्षेत्र</span> Time Zone
                    </label>
                    <select
                      className={styles.inkInput}
                      value={form.timezoneOffset}
                      onChange={e => setForm({ ...form, timezoneOffset: Number(e.target.value) })}
                    >
                      {TIMEZONES.map(tz => (
                        <option key={tz.label} value={tz.offset}>{tz.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

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
              </motion.form>
            )}

            {/* PHONE OTP VERIFICATION STEP — shown right after account creation */}
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
                {devOtpCode && (
                  <p style={{ color: '#8a6d3b', fontSize: '0.85rem', margin: '0 0 8px' }}>
                    Dev mode (no SMS provider configured yet): your code is <strong>{devOtpCode}</strong>
                  </p>
                )}
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
                  disabled={otpLoading || otpCode.length !== 6}
                  id="auth-otp-verify-btn"
                >
                  <span>{otpLoading ? 'Verifying…' : 'Verify Phone Number'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={otpResendLoading}
                  style={{ background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer', fontSize: '0.85rem', marginTop: 'var(--space-2)' }}
                >
                  {otpResendLoading ? 'Resending…' : "Didn't get a code? Resend"}
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
                  {t('auth_success_message')
                    .replace('{name}', form.fullName)
                    .replace('{date}', form.dob)
                    .replace('{time}', form.timeOfBirth)
                    .replace('{place}', form.placeOfBirth)}
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
