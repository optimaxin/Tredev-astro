import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import styles from './AuthPage.module.css';

// The only account entry point this app has: email/password register and
// login against the SAME backend/users table as the main TredevaAstro site
// (no separate login system, no second user database — see
// docs/premium-reports.md). No Firebase/Google/Phone sign-in here: this is
// a single-feature app and the plainest path to an authenticated request is
// the right scope for it.

type Mode = 'login' | 'register';

export default function AuthPage() {
  const { login, register, authError, clearAuthError } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    clearAuthError();
  };

  const canSubmit =
    email.trim() && password.length >= 8 && (mode === 'login' || (name.trim().length >= 2 && phoneNumber.trim().length >= 8));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      if (mode === 'login') await login(email.trim(), password);
      else await register(name.trim(), email.trim(), password, phoneNumber.trim());
    } catch {
      // authError already carries the message; nothing further to do here.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <p className={styles.brand}>TredevaAstro</p>
        <h1 className={styles.title}>Premium Report</h1>
        <p className={styles.subtitle}>
          Sign in to create and read your full-length Vedic astrology birth chart report.
        </p>

        <div className={styles.tabs} role="tablist">
          <button type="button" role="tab" aria-selected={mode === 'login'} className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`} onClick={() => switchMode('login')}>
            Sign In
          </button>
          <button type="button" role="tab" aria-selected={mode === 'register'} className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`} onClick={() => switchMode('register')}>
            Create Account
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-name">Full Name</label>
              <input id="auth-name" type="text" className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Your name" autoComplete="name" />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-email">Email</label>
            <input id="auth-email" type="email" className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
          </div>

          {mode === 'register' && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="auth-phone">Phone Number</label>
              <input id="auth-phone" type="tel" className="input-field" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="+91 98765 43210" autoComplete="tel" />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label} htmlFor="auth-password">Password</label>
            <input id="auth-password" type="password" className="input-field" value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={8} />
          </div>

          {authError && (
            <div className={styles.errorBox} role="alert">{authError}</div>
          )}

          <button type="submit" className="btn btn-gold btn-full" disabled={!canSubmit || submitting} aria-busy={submitting}>
            {submitting ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p className={styles.footerNote}>
          Your account is shared with the main TredevaAstro site — the same sign-in works there too.
        </p>
      </div>
    </div>
  );
}
