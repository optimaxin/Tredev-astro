import React, { useState } from 'react';
import styles from './Footer.module.css';
import GuidanceBanner from '../../sections/Guidance/GuidanceBanner';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import { useAppContext } from '../../context/AppContext';

interface FooterLink {
  labelKey: string;
  onClick: (ctx: ReturnType<typeof useAppContext>) => void;
}

const FOOTER_LINKS: Record<string, FooterLink[]> = {
  nav_astrology: [
    { labelKey: 'nav_free_kundli', onClick: ({ setPage }) => setPage('free-kundli') },
    { labelKey: 'footer_kundli_matching', onClick: ({ setPage }) => setPage('kundli-matching') },
    { labelKey: 'footer_daily_horoscope', onClick: ({ setPage }) => setPage('horoscope') },
    { labelKey: 'nav_panchang', onClick: ({ setPage }) => setPage('panchang') },
    { labelKey: 'footer_muhurat', onClick: ({ setPage }) => setPage('panchang') },
  ],
  footer_col_consultations: [
    { labelKey: 'footer_find_astrologers', onClick: ({ setPage }) => setPage('astrologers') },
    { labelKey: 'footer_chat_consultation', onClick: ({ setPage }) => setPage('astrologers') },
    { labelKey: 'footer_call_consultation', onClick: ({ setPage }) => setPage('astrologers') },
    { labelKey: 'section_ai_title', onClick: ({ setPage }) => setPage('ask-tredevastro') },
  ],
  nav_reports: [
    { labelKey: 'report_4_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(4); setPage('report-detail'); } },
    { labelKey: 'report_1_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(1); setPage('report-detail'); } },
    { labelKey: 'report_3_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(3); setPage('report-detail'); } },
    { labelKey: 'report_7_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(7); setPage('report-detail'); } },
    { labelKey: 'report_6_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(6); setPage('report-detail'); } },
  ],
  nav_academy: [
    { labelKey: 'course_1_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(1); setPage('course-detail'); } },
    { labelKey: 'course_2_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(2); setPage('course-detail'); } },
    { labelKey: 'course_3_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(3); setPage('course-detail'); } },
    { labelKey: 'course_4_title', onClick: ({ setSelectedId, setPage }) => { setSelectedId(4); setPage('course-detail'); } },
  ],
  footer_col_company: [
    // No dedicated Careers/Press/Approach pages exist in this app yet — route to About until they do.
    { labelKey: 'footer_about_us', onClick: ({ setPage }) => setPage('about') },
    { labelKey: 'footer_our_approach', onClick: ({ setPage }) => setPage('about') },
    { labelKey: 'footer_careers', onClick: ({ setPage }) => setPage('about') },
    { labelKey: 'footer_press', onClick: ({ setPage }) => setPage('about') },
  ],
  footer_col_support: [
    // No dedicated Help/Privacy/Terms/Contact pages exist in this app yet — route to About until they do.
    { labelKey: 'footer_help_centre', onClick: ({ setPage }) => setPage('about') },
    { labelKey: 'footer_privacy_policy', onClick: ({ setPage }) => setPage('about') },
    { labelKey: 'footer_terms_of_service', onClick: ({ setPage }) => setPage('about') },
    { labelKey: 'footer_contact_us', onClick: ({ setPage }) => setPage('about') },
  ],
};

export default function Footer() {
  const ctx = useAppContext();
  const { t, setPage } = ctx;
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) { setSubscribed(true); }
  };

  const goTo = (link: FooterLink) => {
    link.onClick(ctx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className={styles.footer} id="footer">
      <GuidanceBanner />

      {/* Main Footer */}
      <div className={styles.main}>
        <CelestialBackdrop variant="mandala" intensity="subtle" />
        <div className={styles.mainInner}>
          {/* Brand Column */}
          <div className={styles.brandCol}>
            <button
              className={styles.logo}
              onClick={() => { setPage('home'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
              aria-label="TredevAstro home"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              <img src="/logo.png" alt="" className={styles.logoStar} />
              <span className={styles.logoText}>TredevAstro</span>
            </button>
            <p className={styles.brandTagline}>
              {t('footer_tagline')}
            </p>
            <p className={styles.brandDesc}>
              {t('footer_desc')}
            </p>

            {/* Newsletter */}
            <div className={styles.newsletter}>
              <p className={styles.newsletterLabel}>{t('footer_newsletter_label')}</p>
              {subscribed ? (
                <p className={styles.subscribed}>✓ {t('footer_subscribed')}</p>
              ) : (
                <form className={styles.newsletterForm} onSubmit={handleSubscribe}>
                  <input
                    type="email"
                    placeholder={t('footer_email_placeholder')}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={styles.emailInput}
                    id="footer-email"
                    required
                  />
                  <button type="submit" className={styles.subscribeBtn} id="footer-subscribe">
                    {t('btn_subscribe')}
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Link Columns */}
          {Object.entries(FOOTER_LINKS).map(([categoryKey, links]) => (
            <div key={categoryKey} className={styles.linkCol}>
              <h3 className={styles.colTitle}>{t(categoryKey)}</h3>
              <ul className={styles.linkList}>
                {links.map(link => (
                  <li key={link.labelKey}>
                    <button className={styles.link} onClick={() => goTo(link)}>{t(link.labelKey)}</button>
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
            {t('footer_copyright')}
          </p>
          <div className={styles.bottomLinks}>
            <button className={styles.bottomLink} onClick={() => setPage('about')}>{t('footer_privacy_short')}</button>
            <button className={styles.bottomLink} onClick={() => setPage('about')}>{t('footer_terms_short')}</button>
            <button className={styles.bottomLink} onClick={() => setPage('about')}>{t('footer_cookies_short')}</button>
          </div>
          <p className={styles.legalNote}>
            {t('footer_legal_note')}
          </p>
        </div>
      </div>
    </footer>
  );
}
