import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import styles from './Header.module.css';

// This app's entire "site chrome" — a logo, two nav actions and a sign-out
// button. No cart, no language switcher, no theme toggle, no admin/
// astrologer workspace: this is a single-feature app, so its shell has
// exactly as much in it as the feature needs and nothing else.
export default function Header() {
  const { currentUser, logout } = useAuth();
  const { view, goTo } = useRouter();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <button type="button" className={styles.logo} onClick={() => goTo('list')} aria-label="My Premium Reports">
          <img src="/logo.png" alt="" className={styles.logoMark} />
          <span className={styles.logoText}>TredevaAstro <span className={styles.logoAccent}>Premium</span></span>
        </button>

        <nav className={styles.nav} aria-label="Premium Report navigation">
          <button type="button" className={`${styles.navLink} ${view === 'list' ? styles.navLinkActive : ''}`} onClick={() => goTo('list')}>
            My Reports
          </button>
          <button type="button" className={`${styles.navLink} ${view === 'create' ? styles.navLinkActive : ''}`} onClick={() => goTo('create')}>
            New Report
          </button>
        </nav>

        {currentUser && (
          <div className={styles.userBox}>
            <span className={styles.userName}>{currentUser.name.split(' ')[0]}</span>
            <button type="button" className={styles.signOut} onClick={() => logout()}>
              Sign Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
