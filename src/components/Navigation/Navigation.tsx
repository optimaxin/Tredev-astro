import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CartIcon, ProfileIcon, SunIcon, MoonIcon } from '../Icons/Icons';
import styles from './Navigation.module.css';

const NAV_LINKS = [
  { label: 'Astrology', page: 'astrology-tools' },
  { label: 'Kundli', page: 'free-kundli' },
  { label: 'Astrologers', page: 'astrologers' },
  { label: 'Reports', page: 'reports' },
  { label: 'Jyotish Upay', page: 'store' },
  { label: 'Academy', page: 'academy' },
];

export default function Navigation() {
  const { page, setPage, kundliGenerated, cart, theme, toggleTheme } = useAppContext();
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
    if (targetPage === 'free-kundli' && kundliGenerated) {
      setPage('kundli-result');
    } else {
      setPage(targetPage);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header
      ref={navRef}
      className={`${styles.nav} ${scrolled ? styles.scrolled : ''}`}
      role="banner"
    >
      <div className={styles.inner}>
        {/* Logo */}
        <button className={styles.logo} onClick={() => handleNavClick('home')} aria-label="TredevAstro home">
          <span className={styles.logoStar}>✦</span>
          <span className={styles.logoText}>TredevAstro</span>
        </button>

        {/* Desktop Navigation */}
        <nav className={styles.links} aria-label="Main navigation">
          {NAV_LINKS.map(link => (
            <button
              key={link.page}
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
            onClick={() => handleNavClick('free-kundli')}
          >
            Free Kundli
          </button>
          <button
            className={`${styles.ctaBtn} ${page === 'astrologers' ? styles.active : ''}`}
            onClick={() => handleNavClick('astrologers')}
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

          {/* Account/Dashboard Icon */}
          <button 
            className={`${styles.accountBtn} ${page === 'my-jyotish' || page === 'profile' ? styles.active : ''}`} 
            onClick={() => handleNavClick('my-jyotish')}
            aria-label="My Account"
          >
            <ProfileIcon size={18} />
          </button>

          {/* Theme Toggle Icon */}
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
              key={link.page}
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
            onClick={() => handleNavClick('my-jyotish')}
          >
            My Jyotish
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

