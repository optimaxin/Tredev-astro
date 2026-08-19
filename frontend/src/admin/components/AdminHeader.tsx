import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { SearchInput } from './SharedControls';
import styles from './AdminHeader.module.css';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'mr', name: 'मराठी' },
] as const;

interface Props {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: Props) {
  const { t, currentUser, logout, setPage, language, setLanguage, notifications } = useAppContext();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (langRef.current && !langRef.current.contains(e.target as Node)) setLangOpen(false);
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const initials = (currentUser?.name || 'A').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header className={styles.header}>
      <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Open menu">☰</button>

      <div className={styles.searchWrap}>
        <SearchInput value={search} onChange={setSearch} placeholder={t('admin_search_placeholder')} />
      </div>

      <div className={styles.spacer} />

      <div className={styles.actions}>
        <div className={styles.dropdownWrap} ref={notifRef}>
          <button className={styles.iconBtn} onClick={() => setNotifOpen(v => !v)} aria-label={t('admin_notifications')}>
            🔔
            {notifications.length > 0 && <span className={styles.dot} />}
          </button>
          {notifOpen && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>{t('admin_notifications')}</div>
              <div className={styles.dropdownList}>
                {notifications.length === 0 && <div className={styles.dropdownEmpty}>{t('admin_empty_title')}</div>}
                {notifications.slice(0, 8).map(n => (
                  <div key={n.id} className={styles.dropdownItem}>
                    {n.message}
                    <span className={styles.dropdownTime}>{new Date(n.at).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles.dropdownWrap} ref={langRef}>
          <button className={styles.langBtn} onClick={() => setLangOpen(v => !v)}>
            {language.toUpperCase()} ▾
          </button>
          {langOpen && (
            <div className={styles.dropdown}>
              {LANGUAGES.map(l => (
                <button
                  key={l.code}
                  className={`${styles.menuOption} ${language === l.code ? styles.menuOptionActive : ''}`}
                  onClick={() => { setLanguage(l.code); setLangOpen(false); }}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.dropdownWrap} ref={profileRef}>
          <button className={styles.profileBtn} onClick={() => setProfileOpen(v => !v)}>
            <span className={styles.profileAvatar}>{initials}</span>
            <span>{t('admin_profile')} ▾</span>
          </button>
          {profileOpen && (
            <div className={styles.dropdown}>
              <div className={styles.profileMeta}>
                <div className={styles.profileName}>{currentUser?.name}</div>
                <div className={styles.profileEmail}>{currentUser?.email}</div>
              </div>
              <button
                className={`${styles.menuOption} ${styles.menuOptionDanger}`}
                onClick={() => { logout(); setPage('home'); }}
              >
                {t('admin_logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
