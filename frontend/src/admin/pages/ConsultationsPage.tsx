import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { adminService } from '../../services/adminService';
import type { ApiConsultation } from '../../services/adminService';
import { astrologerService } from '../../services/astrologerService';
import DataTable from '../components/DataTable';
import Drawer from '../components/Drawer';
import { StatusBadge, FilterBar, EmptyState, AdminButton } from '../components/SharedControls';
import styles from './AdminPages.module.css';

// Real consultation, with the astrologer name resolved from the catalog (the
// backend only stores astrologerId) — no payment field, since there's no
// real payment system behind this yet.
interface RealConsultation extends ApiConsultation {
  astrologerName: string;
}

type FilterKey = 'ALL' | ApiConsultation['status'];

const TYPE_LABEL: Record<ApiConsultation['type'], 'Chat' | 'Voice' | 'Video'> = { chat: 'Chat', voice: 'Voice', video: 'Video' };

export default function ConsultationsPage() {
  const { t } = useAppContext();
  const [filter, setFilter] = useState<FilterKey>('ALL');
  const [view, setView] = useState<'table' | 'agenda'>('table');
  const [selected, setSelected] = useState<RealConsultation | null>(null);
  const [consultations, setConsultations] = useState<RealConsultation[]>([]);

  useEffect(() => {
    Promise.all([adminService.listConsultations(), astrologerService.list({ limit: 50 })])
      .then(([rows, catalog]) => {
        const nameById = new Map(catalog.data.map(a => [a.id, a.name]));
        setConsultations(rows.map(c => ({ ...c, astrologerName: nameById.get(c.astrologerId) || `Astrologer #${c.astrologerId}` })));
      })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return consultations.filter(c => filter === 'ALL' || c.status === filter);
  }, [consultations, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, RealConsultation[]>();
    filtered.forEach(c => {
      const date = new Date(c.createdAt).toLocaleDateString();
      if (!map.has(date)) map.set(date, []);
      map.get(date)!.push(c);
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
            { key: 'ASSIGNED', label: t('admin_status_assigned') },
            { key: 'ACCEPTED', label: t('admin_status_accepted') },
            { key: 'ACTIVE', label: t('admin_status_active') },
            { key: 'COMPLETED', label: t('admin_status_completed') },
            { key: 'DECLINED', label: t('admin_status_declined') },
            { key: 'CANCELLED', label: t('admin_status_cancelled') },
            { key: 'EXPIRED', label: t('admin_status_expired') },
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
            { key: 'date', label: t('admin_consult_col_date'), render: c => new Date(c.createdAt).toLocaleDateString() },
            { key: 'time', label: t('admin_consult_col_time'), render: c => new Date(c.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) },
            { key: 'type', label: t('admin_consult_col_type'), render: c => TYPE_LABEL[c.type] },
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
                  <span className={styles.drawerFieldLabel}>{new Date(c.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {c.userName} → {c.astrologerName}</span>
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
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_date')}</span><span className={styles.drawerFieldValue}>{new Date(selected.createdAt).toLocaleDateString()}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_time')}</span><span className={styles.drawerFieldValue}>{new Date(selected.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_type')}</span><span className={styles.drawerFieldValue}>{TYPE_LABEL[selected.type]}</span></div>
            <div className={styles.drawerField}><span className={styles.drawerFieldLabel}>{t('admin_consult_col_status')}</span><span className={styles.drawerFieldValue}><StatusBadge status={selected.status} label={t(`admin_status_${selected.status.toLowerCase()}`)} /></span></div>
          </>
        )}
      </Drawer>
    </div>
  );
}
