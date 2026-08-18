import { useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import type { AdminConsultation } from '../adminTypes';
import { SAMPLE_CONSULTATIONS } from '../adminMockData';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, EmptyState, AdminButton } from '../components/SharedControls';
import styles from './AdminPages.module.css';

type FilterKey = 'ALL' | 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export default function ConsultationsPage() {
  const { t } = useAppContext();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [view, setView] = useState<'table' | 'agenda'>('table');
  const [selected, setSelected] = useState<AdminConsultation | null>(null);

  const filtered = useMemo(() => {
    return SAMPLE_CONSULTATIONS.filter(c => filter === 'ALL' || c.status === filter);
  }, [filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminConsultation[]>();
    filtered.forEach(c => {
      if (!map.has(c.date)) map.set(c.date, []);
      map.get(c.date)!.push(c);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div>
      <div className={styles.pageHeader}>
        <div className={styles.pageTitle}>{t('admin_consult_title')}</div>
      </div>

      <div className={styles.toolbar}>
        <FilterBar
          filters={[
            { key: 'UPCOMING', label: t('admin_status_upcoming') },
            { key: 'LIVE', label: t('admin_status_live') },
            { key: 'COMPLETED', label: t('admin_status_completed') },
            { key: 'CANCELLED', label: t('admin_status_cancelled') },
            { key: 'ALL', label: t('admin_status_all') },
          ]}
          active={filter}
          onChange={k => setFilter(k as FilterKey)}
        />
        <div className={styles.viewToggle}>
          <AdminButton variant={view === 'table' ? 'gold' : 'outline'} onClick={() => setView('table')}>{t('admin_astro_view_table')}</AdminButton>
          <AdminButton variant={view === 'agenda' ? 'gold' : 'outline'} onClick={() => setView('agenda')}>📅</AdminButton>
        </div>
      </div>

      {view === 'table' && (
        <DataTable
          columns={[
            { key: 'user', label: t('admin_consult_col_user'), render: c => c.userName },
            { key: 'astrologer', label: t('admin_consult_col_astrologer'), render: c => c.astrologerName },
            { key: 'date', label: t('admin_consult_col_date'), render: c => c.date },
            { key: 'time', label: t('admin_consult_col_time'), render: c => c.time },
            { key: 'type', label: t('admin_consult_col_type'), render: c => c.type },
            { key: 'payment', label: t('admin_consult_col_payment'), render: c => `₹${c.payment}` },
            { key: 'status', label: t('admin_consult_col_status'), render: c => <StatusBadge status={c.status} label={t(`admin_status_${c.status.toLowerCase()}`)} /> },
          ]}
          rows={filtered}
          keyField="id"
          onRowClick={setSelected}
          emptyState={<EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />}
        />
      )}

      {view === 'agenda' && (
        grouped.length === 0
          ? <EmptyState title={t('admin_empty_title')} description={t('admin_empty_desc')} />
          : grouped.map(([date, items]) => (
            <div key={date} className={styles.section}>
              <div className={styles.sectionTitle}>{date}</div>
              {items.map(c => (
                <div key={c.id} className={styles.drawerField} style={{ cursor: 'pointer' }} onClick={() => setSelected(c)}>
                  <span className={styles.drawerFieldLabel}>{c.time} · {c.userName} → {c.astrologerName}</span>
                  <StatusBadge status={c.status} label={t(`admin_status_${c.status.toLowerCase()}`)} />
                </div>
              ))}
            </div>
          ))
      )}

      <Drawer open={!!selected} onClose={() => setSelected(null)} title={t('admin_consult_title')}>
        {selected && (
          <>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_user')}</span><span className={styles.drawerFieldValue}>{selected.userName}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_astrologer')}</span><span className={styles.drawerFieldValue}>{selected.astrologerName}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_date')}</span><span className={styles.drawerFieldValue}>{selected.date}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_time')}</span><span className={styles.drawerFieldValue}>{selected.time}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_type')}</span><span className={styles.drawerFieldValue}>{selected.type}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_payment')}</span><span className={styles.drawerFieldValue}>₹{selected.payment}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_status')}</span><span className={styles.drawerFieldValue}><StatusBadge status={selected.status} label={t(`admin_status_${selected.status.toLowerCase()}`)} /></span></div>
          </>
        )}
      </Drawer>
    </div>
  );
}
