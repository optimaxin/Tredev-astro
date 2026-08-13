import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import styles from './AuthPage.module.css';

type TabType = 'login' | 'register';

export default function AuthPage() {
  const { setPage, setLoggedIn } = useAppContext();
  const [tab, setTab] = useState<TabType>('register');

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    dob: '',
    timeOfBirth: '',
    placeOfBirth: '',
    gender: 'Male',
  });
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setTimeout(() => {
      setLoginLoading(false);
      setLoggedIn(true);
      setPage('home');
    }, 1200);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterLoading(true);
    setTimeout(() => {
      setRegisterLoading(false);
      setRegistered(true);
    }, 1400);
  };

  const handleContinue = () => {
    setLoggedIn(true);
    setPage('home');
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
              {tab === 'register'
                ? 'ANCIENT VEDIC BIRTH MANUSCRIPT · INSCRIBE YOUR KUNDLI DETAILS'
                : 'SACRED USER VAULT · ACCESS STORED BIRTH PROFILE'}
            </p>
          </div>

          {/* Vintage Scroll Tab Switcher */}
          <div className={styles.manuscriptTabs}>
            <button
              type="button"
              className={`${styles.manuscriptTab} ${tab === 'register' ? styles.tabActive : ''}`}
              onClick={() => setTab('register')}
            >
              📜 Inscribe Birth Details
            </button>
            <button
              type="button"
              className={`${styles.manuscriptTab} ${tab === 'login' ? styles.tabActive : ''}`}
              onClick={() => setTab('login')}
            >
              🗝️ Member Sign In
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* REGISTRATION INSCRIPTION FORM */}
            {tab === 'register' && !registered && (
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
                    <span className={styles.devanagariTag}>नामांकन</span> Full Name / Seeker's Name *
                  </label>
                  <input
                    type="text"
                    className={styles.inkInput}
                    placeholder="e.g. Sparsh Sharma"
                    value={form.fullName}
                    onChange={e => setForm({ ...form, fullName: e.target.value })}
                    required
                  />
                </div>

                {/* Email & Password Row */}
                <div className={styles.inkRow2}>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>ई-मेल</span> Email Address *
                    </label>
                    <input
                      type="email"
                      className={styles.inkInput}
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>गुप्त कुंजी</span> Secret Password *
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

                {/* Celestial Inscription Separator */}
                <div className={styles.sacredSeparator}>
                  <div className={styles.sepLine} />
                  <span className={styles.sepText}>❖ जन्म कुण्डली गणना निर्देशांक (Birth Coordinates) ❖</span>
                  <div className={styles.sepLine} />
                </div>

                {/* DOB & Time Row */}
                <div className={styles.inkRow2}>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>जन्म तिथि</span> Date of Birth *
                    </label>
                    <input
                      type="date"
                      className={styles.inkInput}
                      value={form.dob}
                      onChange={e => setForm({ ...form, dob: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>जन्म समय</span> Time of Birth *
                    </label>
                    <input
                      type="time"
                      className={styles.inkInput}
                      value={form.timeOfBirth}
                      onChange={e => setForm({ ...form, timeOfBirth: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Place of Birth & Gender Row */}
                <div className={styles.inkRow2}>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>जन्म स्थान</span> Place of Birth (City, State) *
                    </label>
                    <input
                      type="text"
                      className={styles.inkInput}
                      placeholder="e.g. New Delhi, India"
                      value={form.placeOfBirth}
                      onChange={e => setForm({ ...form, placeOfBirth: e.target.value })}
                      required
                    />
                  </div>
                  <div className={styles.inkField}>
                    <label className={styles.inkLabel}>
                      <span className={styles.devanagariTag}>लिंग</span> Gender
                    </label>
                    <div className={styles.genderRow}>
                      {['Male', 'Female', 'Other'].map(g => (
                        <button
                          type="button"
                          key={g}
                          className={`${styles.genderOption} ${form.gender === g ? styles.genderOptionActive : ''}`}
                          onClick={() => setForm({ ...form, gender: g })}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Royal Red Wax Seal Button */}
                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={registerLoading}
                  id="auth-register-submit"
                >
                  <div className={styles.sealEmblemInside}>ॐ</div>
                  <span>{registerLoading ? 'Inscribing Birth Chart...' : 'मुद्रित करें · SEAL INSCRIPTION →'}</span>
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
                    <span className={styles.devanagariTag}>ई-मेल</span> Registered Email Address *
                  </label>
                  <input
                    type="email"
                    className={styles.inkInput}
                    placeholder="name@example.com"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    required
                  />
                </div>

                <div className={styles.inkField}>
                  <label className={styles.inkLabel}>
                    <span className={styles.devanagariTag}>गुप्त कुंजी</span> Password *
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

                <button
                  type="submit"
                  className={styles.waxSealBtn}
                  disabled={loginLoading}
                  id="auth-login-submit"
                >
                  <div className={styles.sealEmblemInside}>🗝️</div>
                  <span>{loginLoading ? 'Unlocking Vault...' : 'प्रवेश करें · SIGN IN TO VAULT →'}</span>
                </button>
              </motion.form>
            )}

            {/* REGISTRATION SUCCESS STATE */}
            {tab === 'register' && registered && (
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
                  Greetings {form.fullName}! Your birth coordinates ({form.dob} at {form.timeOfBirth}, {form.placeOfBirth}) have been successfully inscribed onto the sacred Vedic manuscript archive.
                </p>
                <button
                  type="button"
                  className={styles.waxSealBtn}
                  onClick={handleContinue}
                  id="auth-continue-btn"
                >
                  <span>✦ ENTER CELESTIAL PORTAL ✦</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Footer Sanskrit Stamp */}
          <div className={styles.scriptFooterStamp}>
            🔒 गोपनीयं जन्म पत्रम् · ENCRYPTED ANCIENT VEDIC ARCHIVE
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
