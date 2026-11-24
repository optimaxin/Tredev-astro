import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CartIcon, ProfileIcon, SunIcon, MoonIcon, WalletIcon } from '../Icons/Icons';
import NotificationBell from './NotificationBell';
import ConsultDropdown from './ConsultDropdown';
import RechargeWalletModal from '../RechargeWalletModal/RechargeWalletModal';
import styles from './Navigation.module.css';

const NAV_LINKS = [
  // "Astrology" and "Calculators" used to both point at the same
  // 'astrology-tools' page — a dead-duplicate that made either link look
  // broken/redundant. "Astrology" now goes to the real, already-built
  // Horoscope page, which had no nav entry of its own at all.
  { translationKey: 'nav_astrology', page: 'horoscope' },
  { translationKey: 'nav_calculators', page: 'astrology-tools' },
  { translationKey: 'nav_reports', page: 'reports' },
  { translationKey: 'nav_premium_report', page: 'premium-report' },
  { translationKey: 'nav_panchang', page: 'panchang' },
  { translationKey: 'nav_store', page: 'store' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'mr', name: 'मराठी' },
  { code: 'bn', name: 'বাংলা' },
  { code: 'ta', name: 'தமிழ்' },
  { code: 'te', name: 'తెలుగు' },
] as const;

export default function Navigation() {
  const {
    page,
    setPage,
    kundliGenerated,
    cart,
    theme,
    toggleTheme,
    isLoggedIn,
    currentUser,
    logout,
    setShowLoginModal,
    setPendingAction,
    language,
    setLanguage,
    t,
    walletBalance,
  } = useAppContext();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [consultDropdownOpen, setConsultDropdownOpen] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);

  const navRef = useRef<HTMLElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const consultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownOpen && langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (profileDropdownOpen && profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (consultDropdownOpen && consultRef.current && !consultRef.current.contains(e.target as Node)) {
        setConsultDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langDropdownOpen, profileDropdownOpen, consultDropdownOpen]);

  const handleNavClick = (targetPage: string) => {
    setMenuOpen(false);
    if (targetPage === 'free-kundli') {
      handleFreeKundliClick();
      return;
    }
    if (targetPage === 'astrologers') {
      handleConsultClick();
      return;
    }
    setPage(targetPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFreeKundliClick = () => {
    // Free Kundli needs no login to use — only "severe" actions inside it
    // (downloading the PDF, see KundliSection.tsx) prompt for login.
    setMenuOpen(false);
    setPage(kundliGenerated ? 'kundli-result' : 'free-kundli');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleConsultClick = () => {
    setMenuOpen(false);
    if (!isLoggedIn) {
      setPendingAction('astrologers');
      setShowLoginModal(true);
    } else {
      setPage('astrologers');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleProfileClick = () => {
    setMenuOpen(false);
    if (!isLoggedIn) {
      setPendingAction('profile');
      setShowLoginModal(true);
    } else {
      setPage('profile');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentLangLabel = LANGUAGES.find(l => l.code === language)?.name || 'English';

  return (
    <header
      ref={navRef}
      className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      role="banner"
    >
      <div className={styles.inner}>
        {/* Logo */}
        <button
          className={styles.logo}
          onClick={() => { setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          aria-label="TredevaAstro home"
        >
          {/* site_logo_image is admin/staff-editable (Content page) — same
              override mechanism as every text key, just holding an image URL
              instead. Falls back to the built-in asset when unset. */}
          <img src={t('site_logo_image') !== 'site_logo_image' ? t('site_logo_image') : '/logo.png'} alt="" className={styles.logoStar} />
          <span className={styles.logoText} translate="no">TredevaAstro</span>
        </button>

        {/* Desktop Navigation */}
        <nav className={styles.links} aria-label="Main navigation">
          {NAV_LINKS.map(link => {
            const isLinkActive = page === link.page;
            return (
              <button
                key={link.page + link.translationKey}
                className={`${styles.link} ${isLinkActive ? styles.active : ''}`}
                onClick={() => handleNavClick(link.page)}
              >
                {t(link.translationKey)}
                {isLinkActive && <span className={styles.activeIndicator} />}
              </button>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className={styles.actions}>
          <button
            className={`${styles.ctaBtnSecondary} ${page === 'free-kundli' || page === 'kundli-result' ? styles.active : ''}`}
            onClick={handleFreeKundliClick}
          >
            {t('nav_free_kundli')}
          </button>

          <button
            className={`${styles.ctaBtn} ${page === 'raghavendra' ? styles.active : ''}`}
            onClick={() => handleNavClick('raghavendra')}
          >
            {t('nav_raghavendra')}
          </button>

          <div style={{ position: 'relative' }} ref={consultRef}>
            <button
              className={`${styles.ctaBtn} ${page === 'astrologers' || page === 'raghav-booking' ? styles.active : ''}`}
              onClick={() => setConsultDropdownOpen(v => !v)}
            >
              {t('nav_consult')}
            </button>
            {consultDropdownOpen && (
              <ConsultDropdown onClose={() => setConsultDropdownOpen(false)} onViewAll={handleConsultClick} />
            )}
          </div>

          {/* Wallet balance — consultations bill straight out of this (see
              realtimeStore.ts's acceptConsultation); click opens the recharge modal. */}
          {isLoggedIn && (
            <button
              className={styles.cartBtn}
              onClick={() => setShowRecharge(true)}
              aria-label="Recharge wallet"
              title="Recharge wallet"
              style={{ display: 'flex', alignItems: 'center', gap: '6px', width: 'auto', padding: '0 8px' }}
            >
              <WalletIcon size={22} />
              <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-sans)' }}>₹{walletBalance ?? '—'}</span>
            </button>
          )}

          {/* Cart Icon */}
          <button
            className={styles.cartBtn}
            onClick={() => { window.location.href = 'https://tredevastore.com/'; }}
            aria-label="View Cart"
          >
            <CartIcon size={28} />
            {cart.length > 0 && <span className={styles.cartBadge}>{cart.reduce((acc, curr) => acc + curr.quantity, 0)}</span>}
          </button>

          {/* Notifications */}
          <NotificationBell />

          {/* Theme — its own always-visible icon button, not buried inside
              the language dropdown. */}
          <button
            className={styles.themeBtn}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>

          {/* Language selector */}
          <div className={styles.langWrapper} ref={langRef}>
            <button
              className={styles.langBtn}
              onClick={() => setLangDropdownOpen(v => !v)}
              aria-label="Language settings"
            >
              <span className={styles.langGlobe}>🌐</span>
              <span className={styles.langText} translate="no">{currentLangLabel}</span>
            </button>
            {langDropdownOpen && (
              /* Each language is named in its own script — a browser
                 translate feature would otherwise translate those names
                 into whatever is currently selected, leaving the picker
                 itself unreadable. */
              <div className={styles.langDropdown} translate="no">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    className={`${styles.langDropdownItem} ${language === lang.code ? styles.langDropdownItemActive : ''}`}
                    onClick={() => {
                      setLanguage(lang.code);
                      setLangDropdownOpen(false);
                    }}
                  >
                    {lang.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Login / Profile Actions */}
          {isLoggedIn ? (
            <div className={styles.profileDropdownWrapper} ref={profileRef}>
              <button
                className={`${styles.profileSelectorBtn} ${page === 'profile' ? styles.active : ''}`}
                onClick={() => setProfileDropdownOpen(v => !v)}
              >
                <div className={styles.avatarCircle}>
                  {(currentUser?.name || 'Yajamana').substring(0, 1).toUpperCase()}
                </div>
                <span className={styles.profileArrow}>▼</span>
              </button>
              {profileDropdownOpen && (
                <div className={styles.profileDropdown}>
                  <button onClick={() => { handleNavClick('profile'); setProfileDropdownOpen(false); }}>
                    {currentUser?.role === 'USER' ? 'My Profile' : 'Dashboard'}
                  </button>
                  {currentUser?.role === 'USER' && (
                    <button onClick={() => { handleNavClick('free-kundli'); setProfileDropdownOpen(false); }}>
                      New Kundli
                    </button>
                  )}
                  {currentUser?.role === 'USER' && (
                    <button onClick={() => { handleNavClick('my-premium-reports'); setProfileDropdownOpen(false); }}>
                      My Premium Reports
                    </button>
                  )}
                  <button
                    onClick={() => { logout(); setProfileDropdownOpen(false); setPage('home'); }}
                    style={{ color: '#c55' }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className={styles.loginBtn}
              onClick={() => {
                setPage('auth');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Sign In"
            >
              <ProfileIcon size={28} />
              <span className={styles.loginTextLabel}>{t('nav_login')}</span>
            </button>
          )}
        </div>

        {/* Mobile Hamburger */}
        <button
          className={`${styles.hamburger} ${menuOpen ? styles.open : ''}`}
          onClick={() => setMenuOpen(v => !v)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`${styles.mobileMenu} ${menuOpen ? styles.mobileMenuOpen : ''}`} aria-hidden={!menuOpen}>
        <div className={styles.mobileLinks}>
          {NAV_LINKS.map(link => {
            return (
              <button
                key={link.page + link.translationKey}
                className={styles.mobileLink}
                onClick={() => handleNavClick(link.page)}
              >
                {t(link.translationKey)}
              </button>
            );
          })}
          <div className={styles.mobileDivider} />

          {/* Language selector in Mobile Menu */}
          <div className={styles.mobileLangList} translate="no">
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                className={`${styles.mobileLangBtn} ${language === lang.code ? styles.mobileLangBtnActive : ''}`}
                onClick={() => {
                  setLanguage(lang.code);
                  setMenuOpen(false);
                }}
              >
                {lang.name}
              </button>
            ))}
          </div>

          <div className={styles.mobileDivider} />

          <button
            className={`${styles.mobileLink} ${styles.mobileCta}`}
            onClick={() => handleNavClick('free-kundli')}
          >
            {t('nav_free_kundli')}
          </button>
          <button
            className={`${styles.mobileLink} ${styles.mobileCta}`}
            onClick={() => handleNavClick('raghavendra')}
          >
            {t('nav_raghavendra')}
          </button>
          <button
            className={`${styles.mobileLink} ${styles.mobileCta}`}
            onClick={() => handleNavClick('astrologers')}
          >
            {t('nav_consult')}
          </button>
          <button
            className={styles.mobileLink}
            onClick={handleProfileClick}
          >
            {isLoggedIn ? 'My Profile' : t('nav_login')}
          </button>
          {isLoggedIn && (
            <button
              className={styles.mobileLink}
              onClick={() => handleNavClick('my-premium-reports')}
            >
              My Premium Reports
            </button>
          )}
          {isLoggedIn && (
            <button
              className={styles.mobileLink}
              onClick={() => { logout(); setMenuOpen(false); setPage('home'); }}
              style={{ color: '#c55' }}
            >
              Sign Out
            </button>
          )}
          <div className={styles.mobileDivider} />
          <button
            className={`${styles.mobileLink} ${styles.mobileCta}`}
            onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {theme === 'dark' ? <SunIcon size={28} /> : <MoonIcon size={28} />}
            {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
        </div>
      </div>

      {showRecharge && <RechargeWalletModal onClose={() => setShowRecharge(false)} />}
    </header>
  );
}
