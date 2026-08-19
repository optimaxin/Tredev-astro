import { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { CONTENT_MODULES } from '../adminMockData';
import type { ContentModule } from '../adminTypes';
import Drawer from '../components/Drawer';
import { AdminButton } from '../components/SharedControls';
import { formatDate } from '../adminUtils';
import styles from './AdminPages.module.css';

const STORAGE_KEY = 'admin_content_overrides';

function loadOverrides(): Record<string, { heading: string; body: string; updatedAt: string }> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}

export default function ContentPage() {
  const { t, logAdminAction } = useAppContext();
  const [overrides, setOverrides] = useState(loadOverrides);
  const [editing, setEditing] = useState<ContentModule | null>(null);
  const [draft, setDraft] = useState({ heading: '', body: '' });

  const resolve = (mod: ContentModule) => overrides[mod.key] || mod;

  const openEditor = (mod: ContentModule) => {
    const current = resolve(mod);
    setDraft({ heading: current.heading, body: current.body });
    setEditing(mod);
  };

  const handleSave = () => {
    if (!editing) return;
    const next = { ...overrides, [editing.key]: { ...draft, updatedAt: new Date().toISOString().slice(0, 10) } };
    setOverrides(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    logAdminAction('UPDATE_CONTENT', editing.key);
    setEditing(null);
  };

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_content_title')}</div>
        <div className={styles.pageSub}>{t('admin_content_desc')}</div>
      </div>

      <div className={styles.contentGrid}>
        {CONTENT_MODULES.map(mod => {
          const current = resolve(mod);
          return (
            <button key={mod.key} className={styles.contentCard} onClick={() => openEditor(mod)}>
              <div className={styles.contentCardTitle}>{t(mod.labelKey)}</div>
              <div className={styles.contentCardMeta}>{t('admin_content_updated')}: {formatDate(current.updatedAt)}</div>
            </button>
          );
        })}
      </div>

      <Drawer
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `${t('admin_content_edit')} — ${t(editing.labelKey)}` : ''}
        footer={<AdminButton variant="gold" onClick={handleSave}>{t('admin_action_save')}</AdminButton>}
      >
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('admin_content_field_heading')}</label>
          <input className={styles.formInput} value={draft.heading} onChange={e => setDraft({ ...draft, heading: e.target.value })} />
        </div>
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>{t('admin_content_field_body')}</label>
          <textarea className={styles.formTextarea} value={draft.body} onChange={e => setDraft({ ...draft, body: e.target.value })} />
        </div>
      </Drawer>
    </div>
  );
}
