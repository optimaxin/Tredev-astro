import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CartIcon, ProfileIcon, SunIcon, MoonIcon } from '../Icons/Icons';
import styles from './Navigation.module.css';

const NAV_LINKS = [
  { label: 'Astrology', page: 'astrology-tools' },
  { label: 'Kundli', page: 'free-kundli' },
  { label: 'Calculators', page: 'astrology-tools' },
  { label: 'Reports', page: 'reports' },
  { label: 'Panchang', page: 'panchang' },
  { label: 'Academy', page: 'academy' },
  { label: 'Store', page: 'store' },
];


export default function Navigation() {
  const { page, setPage, kundliGenerated, cart, theme, toggleTheme, isLoggedIn, setShowLoginModal, setPendingAction } = useAppContext();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

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

  return (
    <header
      ref={navRef}
      className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      role="banner"
    >
      <div className={styles.inner}>
        {/* Logo */}
        <button className={styles.logo} onClick={() => { setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} aria-label="TredevAstro home">
          <span className={styles.logoStar}>✦</span>
          <span className={styles.logoText}>TredevAstro</span>
        </button>
 
        {/* Desktop Navigation */}
        <nav className={styles.links} aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <button
              key={link.page + link.label}
              className={`${styles.link} ${page === link.page ? styles.active : ''}`}
              onClick={() => handleNavClick(link.page)}
            >
              {link.label}
            </button>
          ))}
        </nav>
 
        {/* Right Actions */}
        <div className={styles.actions}>
          <button
            className={`${styles.ctaBtnSecondary} ${page === 'free-kundli' || page === 'kundli-result' ? styles.active : ''}`}
            onClick={handleFreeKundliClick}
          >
            Free Kundli
          </button>
          <button
            className={`${styles.ctaBtn} ${page === 'astrologers' ? styles.active : ''}`}
            onClick={handleConsultClick}
          >
            Consult
          </button>

          
          {/* Cart Icon */}
          <button 
            className={`${styles.cartBtn} ${page === 'cart' ? styles.active : ''}`} 
            onClick={() => handleNavClick('cart')}
            aria-label="View Cart"
          >
            <CartIcon size={18} />
            {cart.length > 0 && <span className={styles.cartBadge}>{cart.reduce((acc, curr) => acc + curr.quantity, 0)}</span>}
          </button>

          {/* Profile Icon */}
          <button 
            className={`${styles.accountBtn} ${page === 'profile' ? styles.active : ''}`} 
            onClick={handleProfileClick}
            aria-label="My Account"
          >
            <ProfileIcon size={18} />
            {isLoggedIn && <span className={styles.loggedInDot} />}
          </button>

          {/* Theme Toggle */}
          <button 
            className={styles.themeToggleBtn} 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
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
          {NAV_LINKS.map(link => (
            <button
              key={link.page + link.label}
              className={styles.mobileLink}
              onClick={() => handleNavClick(link.page)}
            >
              {link.label}
            </button>
          ))}
          <div className={styles.mobileDivider} />
          <button
            className={`${styles.mobileLink} ${styles.mobileCta}`}
            onClick={() => handleNavClick('free-kundli')}
          >
            Free Kundli
          </button>
          <button
            className={`${styles.mobileLink} ${styles.mobileCta}`}
            onClick={() => handleNavClick('astrologers')}
          >
            Consult an Acharya
          </button>
          <button
            className={styles.mobileLink}
            onClick={handleProfileClick}
          >
            {isLoggedIn ? 'My Profile' : 'Sign In'}
          </button>
          <div className={styles.mobileDivider} />
          <button
            className={`${styles.mobileLink} ${styles.mobileCta}`}
            onClick={toggleTheme}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
          </button>
        </div>
      </div>
    </header>
  );
}
