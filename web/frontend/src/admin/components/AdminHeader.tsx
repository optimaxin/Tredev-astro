import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { AdminApiError } from '../../services/adminService';
import { SearchInput, AdminButton } from './SharedControls';
import Drawer from './Drawer';
import styles from './AdminHeader.module.css';
import pageStyles from '../pages/AdminPages.module.css';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'mr', name: 'मराठी' },
] as const;

interface Props {
  onMenuClick: () => void;
}

export default function AdminHeader({ onMenuClick }: Props) {
  const { t, currentUser, logout, setPage, language, setLanguage, notifications, updateMyProfile } = useAppContext();
  const [search, setSearch] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editCurrentPassword, setEditCurrentPassword] = useState('');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const openEdit = () => {
    setEditName(currentUser?.name || '');
    setEditCurrentPassword('');
    setEditNewPassword('');
    setEditError('');
    setEditOpen(true);
    setProfileOpen(false);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError('');
    try {
      await updateMyProfile({
        name: editName.trim() || undefined,
        newPassword: editNewPassword || undefined,
        currentPassword: editNewPassword ? editCurrentPassword : undefined,
      });
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof AdminApiError ? err.message : 'Could not save these changes.');
    } finally {
      setEditSaving(false);
    }
  };

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
            <span>{t(currentUser?.role === 'STAFF' ? 'admin_profile_staff' : 'admin_profile')} ▾</span>
          </button>
          {profileOpen && (
            <div className={styles.dropdown}>
              <div className={styles.profileMeta}>
                <div className={styles.profileName}>{currentUser?.name}</div>
                <div className={styles.profileEmail}>{currentUser?.email}</div>
              </div>
              <button className={styles.menuOption} onClick={openEdit}>
                {t('admin_profile_edit')}
              </button>
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

      <Drawer
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={t('admin_profile_edit_title')}
        footer={<AdminButton variant="gold" type="submit" form="edit-my-profile-form" disabled={editSaving}>{editSaving ? '…' : t('admin_action_save')}</AdminButton>}
      >
        <form id="edit-my-profile-form" onSubmit={saveEdit}>
          <div className={pageStyles.formGroup}>
            <label className={pageStyles.formLabel}>{t('admin_profile_field_name')}</label>
            <input className={pageStyles.formInput} required value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className={pageStyles.formGroup}>
            <label className={pageStyles.formLabel}>{t('admin_profile_field_new_password')}</label>
            <input type="password" className={pageStyles.formInput} value={editNewPassword} onChange={e => setEditNewPassword(e.target.value)} />
          </div>
          {editNewPassword && (
            <div className={pageStyles.formGroup}>
              <label className={pageStyles.formLabel}>{t('admin_profile_field_current_password')}</label>
              <input type="password" className={pageStyles.formInput} required value={editCurrentPassword} onChange={e => setEditCurrentPassword(e.target.value)} />
            </div>
          )}
          {editError && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.8rem' }}>{editError}</p>}
        </form>
      </Drawer>
    </header>
  );
}
