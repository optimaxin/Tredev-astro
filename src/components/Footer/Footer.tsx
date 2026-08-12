import React, { useState } from 'react';
import styles from './Footer.module.css';

const FOOTER_LINKS = {
  Astrology: ['Free Kundli', 'Kundli Matching', 'Daily Horoscope', 'Panchang', 'Muhurat'],
  Consultations: ['Find Astrologers', 'Chat Consultation', 'Call Consultation', 'Ask TredevAstro'],
  Reports: ['Premium Kundli', 'Career Intelligence', 'Marriage Report', 'Year Ahead', 'Soul Purpose'],
  Academy: ['Vedic Astrology', 'Numerology', 'Tarot', 'Vastu Shastra'],
  Company: ['About Us', 'Our Approach', 'Careers', 'Press'],
  Support: ['Help Centre', 'Privacy Policy', 'Terms of Service', 'Contact Us'],
};

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubscribed(true); }
  };

  return (
    <footer className={styles.footer} id="footer">
      {/* Top CTA */}
      <div className={styles.topCta}>
        <div className={styles.topCtaInner}>
          <div className={styles.topCtaText}>
            <h2 className={styles.topCtaTitle}>Begin Your Cosmic Journey</h2>
            <p className={styles.topCtaSubtitle}>Create your free Kundli and discover the celestial patterns that shape your story.</p>
          </div>
          <div className={styles.topCtaBtns}>
            <button
              className="btn btn-gold btn-lg"
              onClick={() => document.querySelector('#kundli')?.scrollIntoView({ behavior: 'smooth' })}
              id="footer-create-kundli"
            >
              Create Free Kundli
            </button>
            <button
              className="btn btn-outline-light btn-lg"
              onClick={() => document.querySelector('#astrologers')?.scrollIntoView({ behavior: 'smooth' })}
              id="footer-talk-astrologer"
            >
              Talk to an Astrologer
            </button>
          </div>
        </div>
      </div>

      {/* Main Footer */}
      <div className={styles.main}>
        <div className={styles.mainInner}>
          {/* Brand Column */}
          <div className={styles.brandCol}>
            <div className={styles.logo}>
              <span className={styles.logoStar}>✦</span>
              <span className={styles.logoText}>TredevAstro</span>
            </div>
            <p className={styles.brandTagline}>
              Your Sky. Your Story.
            </p>
            <p className={styles.brandDesc}>
              A modern astrology ecosystem combining personalized Vedic astrology, expert consultations, intelligent AI guidance, and timeless wisdom.
            </p>

            {/* Newsletter */}
            <div className={styles.newsletter}>
              <p className={styles.newsletterLabel}>Receive thoughtful astrology insights</p>
              {subscribed ? (
                <p className={styles.subscribed}>✓ You&apos;re subscribed. Thank you.</p>
              ) : (
                <form className={styles.newsletterForm} onSubmit={handleSubscribe}>
                  <input
                    type="email"
                    placeholder="Your email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={styles.emailInput}
                    id="footer-email"
                    required
                  />
                  <button type="submit" className={styles.subscribeBtn} id="footer-subscribe">
                    Subscribe
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className={styles.linkCol}>
              <h3 className={styles.colTitle}>{category}</h3>
              <ul className={styles.linkList}>
                {links.map(link => (
                  <li key={link}>
                    <button className={styles.link}>{link}</button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Bar */}
      <div className={styles.bottomBar}>
        <div className={styles.bottomInner}>
          <p className={styles.copyright}>
            © 2026 TredevAstro. All rights reserved.
          </p>
          <div className={styles.bottomLinks}>
            <button className={styles.bottomLink}>Privacy</button>
            <button className={styles.bottomLink}>Terms</button>
            <button className={styles.bottomLink}>Cookies</button>
          </div>
          <p className={styles.legalNote}>
            Astrology is for entertainment and spiritual guidance. Not a substitute for professional advice.
          </p>
        </div>
      </div>
    </footer>
  );
}
