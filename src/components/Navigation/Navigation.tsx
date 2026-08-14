import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CartIcon, ProfileIcon, SunIcon, MoonIcon } from '../Icons/Icons';
import styles from './Navigation.module.css';

const NAV_LINKS = [
  { translationKey: 'nav_astrology', page: 'astrology-tools' },
  { translationKey: 'nav_kundli', page: 'free-kundli' },
  { translationKey: 'nav_calculators', page: 'astrology-tools' },
  { translationKey: 'nav_reports', page: 'reports' },
  { translationKey: 'nav_panchang', page: 'panchang' },
  { translationKey: 'nav_academy', page: 'academy' },
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
    setShowLoginModal, 
    setPendingAction,
    language,
    setLanguage,
    t,
    birthProfile
  } = useAppContext();

  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  
  const navRef = useRef<HTMLElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [langDropdownOpen, profileDropdownOpen]);

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
    setMenuOpen(false);
    if (!isLoggedIn) {
      setPendingAction('free-kundli');
      setShowLoginModal(true);
    } else {
      if (kundliGenerated) {
        setPage('kundli-result');
      } else {
        setPage('free-kundli');
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
          aria-label="TredevAstro home"
        >
          <span className={styles.logoStar}>✦</span>
          <span className={styles.logoText}>TredevAstro</span>
        </button>
 
        {/* Desktop Navigation */}
        <nav className={styles.links} aria-label="Main navigation">
          {NAV_LINKS.map(link => {
            const label = t(link.translationKey);
            const isLinkActive = page === link.page;
            return (
              <button
                key={link.page + link.translationKey}
                className={`${styles.link} ${isLinkActive ? styles.active : ''}`}
                onClick={() => handleNavClick(link.page)}
              >
                {label}
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
            className={`${styles.ctaBtn} ${page === 'astrologers' ? styles.active : ''}`}
            onClick={handleConsultClick}
          >
            {t('nav_consult')}
          </button>

          {/* Cart Icon */}
          <button 
            className={styles.cartBtn} 
            onClick={() => { window.location.href = 'https://tredevastore.com/'; }}
            aria-label="View Cart"
          >
            <CartIcon size={28} />
            {cart.length > 0 && <span className={styles.cartBadge}>{cart.reduce((acc, curr) => acc + curr.quantity, 0)}</span>}
          </button>

          {/* Language Selector Dropdown */}
          <div className={styles.langWrapper} ref={langRef}>
            <button
              className={styles.langBtn}
              onClick={() => setLangDropdownOpen(v => !v)}
              aria-label="Select Language"
            >
              <span className={styles.langGlobe}>🌐</span>
              <span className={styles.langText}>{currentLangLabel}</span>
            </button>
            {langDropdownOpen && (
              <div className={styles.langDropdown}>
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
                  {birthProfile.name.substring(0, 1).toUpperCase()}
                </div>
                <span className={styles.profileNameText}>{birthProfile.name.split(' ')[0]}</span>
                <span className={styles.profileArrow}>▼</span>
              </button>
              {profileDropdownOpen && (
                <div className={styles.profileDropdown}>
                  <button onClick={() => { handleNavClick('profile'); setProfileDropdownOpen(false); }}>
                    My Workspace
                  </button>
                  <button onClick={() => { handleNavClick('free-kundli'); setProfileDropdownOpen(false); }}>
                    New Kundli
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.setItem('isLoggedIn', 'false');
                      window.location.reload();
                    }}
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

          {/* Theme Toggle */}
          <button 
            className={styles.themeToggleBtn} 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <SunIcon size={28} /> : <MoonIcon size={28} />}
          </button>
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
            const label = t(link.translationKey);
            return (
              <button
                key={link.page + link.translationKey}
                className={styles.mobileLink}
                onClick={() => handleNavClick(link.page)}
              >
                {label}
              </button>
            );
          })}
          <div className={styles.mobileDivider} />
          
          {/* Language selector in Mobile Menu */}
          <div className={styles.mobileLangList}>
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
    </header>
  );
}
