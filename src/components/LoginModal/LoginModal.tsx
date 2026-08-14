import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import styles from './LoginModal.module.css';

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal, setLoggedIn, pendingAction, setPendingAction, setPage, theme } = useAppContext();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'options' | 'email'>('options');

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (showLoginModal) window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLoginModal]);

  // Prevent background scroll
  useEffect(() => {
    if (showLoginModal) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [showLoginModal]);

  const handleClose = () => {
    setShowLoginModal(false);
    setPendingAction(null);
    setStep('options');
    setEmail('');
    setLoading(false);
  };

  const resumePendingAction = (action: string | null) => {
    if (!action) return;
    if (action === 'profile') {
      setPage('profile');
    } else if (action === 'free-kundli') {
      setPage('free-kundli');
    } else if (action === 'astrologers') {
      setPage('astrologers');
    } else if (action === 'calculator') {
      setPage('astrology-tools');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoggedIn(true);
      setLoading(false);
      setShowLoginModal(false);
      resumePendingAction(pendingAction);
      setPendingAction(null);
      setStep('options');
      setEmail('');
    }, 1200);
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoggedIn(true);
      setLoading(false);
      setShowLoginModal(false);
      resumePendingAction(pendingAction);
      setPendingAction(null);
    }, 900);
  };


  return (
    <AnimatePresence>
      {showLoginModal && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
        >
          {/* Modal */}
          <motion.div
            className={styles.modal}
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            role="dialog"
            aria-modal="true"
            aria-label="Sign in to TredevAstro"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button className={styles.closeBtn} onClick={handleClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            {/* Ornament */}
            <div className={styles.ornament}>
              <ChakraOrnament />
            </div>

            {/* Brand */}
            <div className={styles.brand}>
              <span className={styles.brandStar}>✦</span>
              <span className={styles.brandName}>TredevAstro</span>
            </div>

            {/* Heading */}
            <h2 className={styles.heading}>
              {mode === 'login' ? (
                <>Sign in to continue <em className={styles.headingItalic}>your journey</em>.</>
              ) : (
                <>Begin <em className={styles.headingItalic}>your journey</em>.</>
              )}
            </h2>
            <p className={styles.subheading}>
              {pendingAction
                ? 'Please sign in to access this feature.'
                : 'Your personalized Jyotish experience awaits.'}
            </p>

            {/* Divider */}
            <div className={styles.dividerLine}><span>✦</span></div>

            {step === 'options' ? (
              <div className={styles.options}>
                {/* Google Login */}
                <button
                  className={styles.googleBtn}
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Continue with Google
                </button>

                {/* Email Option */}
                <button
                  className={styles.emailBtn}
                  onClick={() => setStep('email')}
                  disabled={loading}
                >
                  <EmailIcon />
                  Continue with Email
                </button>

                {/* Mode Switch */}
                <p className={styles.switchText}>
                  {mode === 'login' ? "New here? " : "Already have an account? "}
                  <button
                    className={styles.switchLink}
                    onClick={() => setMode(m => m === 'login' ? 'signup' : 'login')}
                  >
                    {mode === 'login' ? 'Create Account' : 'Sign In'}
                  </button>
                </p>
              </div>
            ) : (
              <div className={styles.emailForm}>
                <input
                  type="email"
                  className={styles.emailInput}
                  placeholder="Enter your email or mobile"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && email && handleLogin()}
                  autoFocus
                />
                <button
                  className={styles.continueBtn}
                  onClick={handleLogin}
                  disabled={!email || loading}
                >
                  {loading ? (
                    <span className={styles.spinner} />
                  ) : (
                    mode === 'login' ? 'Sign In' : 'Create Account'
                  )}
                </button>
                <button className={styles.backBtn} onClick={() => setStep('options')}>
                  ← Back
                </button>
              </div>
            )}

            {/* Privacy note */}
            <p className={styles.privacy}>
              By continuing, you agree to our{' '}
              <span className={styles.privacyLink}>Terms</span> &amp;{' '}
              <span className={styles.privacyLink}>Privacy Policy</span>
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ChakraOrnament() {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Outer circle */}
      <circle cx="28" cy="28" r="26" stroke="rgba(181,138,59,0.3)" strokeWidth="1"/>
      {/* Middle circle */}
      <circle cx="28" cy="28" r="18" stroke="rgba(181,138,59,0.5)" strokeWidth="0.75"/>
      {/* Inner circle */}
      <circle cx="28" cy="28" r="10" stroke="rgba(181,138,59,0.7)" strokeWidth="0.75"/>
      {/* 12 spokes */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const x1 = 28 + Math.cos(angle) * 10;
        const y1 = 28 + Math.sin(angle) * 10;
        const x2 = 28 + Math.cos(angle) * 26;
        const y2 = 28 + Math.sin(angle) * 26;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(181,138,59,0.25)" strokeWidth="0.5"/>;
      })}
      {/* Center dot */}
      <circle cx="28" cy="28" r="2.5" fill="rgba(181,138,59,0.8)"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 18 18">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 18 18" fill="none">
      <rect x="1" y="3.5" width="16" height="11" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 5.5l8 5 8-5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}
