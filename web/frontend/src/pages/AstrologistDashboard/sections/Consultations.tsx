import React, { useEffect, useMemo, useState } from 'react';
import { consultationService, ConsultationApiError } from '../../../services/consultationService';
import type { MyConsultationAsAstrologer } from '../../../services/consultationService';
import { TYPE_ICON, formatDateShort, formatTime, StatusBadge, EmptyState, SectionHeader } from './shared';
import styles from './sections.module.css';

type Tab = 'upcoming' | 'completed' | 'other';
const UPCOMING_STATUSES = new Set(['ASSIGNED', 'ACCEPTED', 'ACTIVE']);

export default function Consultations() {
  const [consultations, setConsultations] = useState<MyConsultationAsAstrologer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('upcoming');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  useEffect(() => {
    consultationService.listMineAsAstrologer()
      .then(setConsultations)
      .catch(err => setError(err instanceof ConsultationApiError ? err.message : 'Could not load your consultations.'))
      .finally(() => setLoading(false));
  }, []);

  const tabOf = (c: MyConsultationAsAstrologer): Tab =>
    UPCOMING_STATUSES.has(c.status) ? 'upcoming' : c.status === 'COMPLETED' ? 'completed' : 'other';

  const counts = {
    upcoming: consultations.filter(c => tabOf(c) === 'upcoming').length,
    completed: consultations.filter(c => tabOf(c) === 'completed').length,
    other: consultations.filter(c => tabOf(c) === 'other').length,
  };

  const filtered = useMemo(() => {
    return consultations
      .filter(c => tabOf(c) === tab)
      .filter(c => typeFilter === 'all' || c.type === typeFilter)
      .filter(c => c.userName.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [consultations, tab, typeFilter, search]);

  return (
    <div>
      <SectionHeader title="Consultations" subtitle="Your real booking history." />

      <div className={styles.tabs}>
        {([
          { key: 'upcoming' as Tab, label: 'Upcoming' },
          { key: 'completed' as Tab, label: 'Completed' },
          { key: 'other' as Tab, label: 'Declined / Cancelled' },
        ]).map(t => (
          <button key={t.key} className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
            <span className={styles.tabCount}>{counts[t.key]}</span>
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <input className={`input-field ${styles.searchInput}`} placeholder="Search by client name..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="all">All types</option>
          <option value="chat">Chat</option>
          <option value="voice">Voice</option>
          <option value="video">Video</option>
        </select>
      </div>

      {error && <p style={{ color: '#d64545' }}>{error}</p>}
      {!loading && !error && filtered.length === 0 ? (
        <EmptyState icon="◎" title={`No consultations here`} desc="Consultations matching this filter will appear here." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Client</th><th>Date</th><th>Time</th><th>Category</th><th>Est. Amount</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const iso = new Date(c.createdAt).toISOString();
                return (
                  <tr key={c.id}>
                    <td className={styles.tablePrimary}>{TYPE_ICON[c.type]} {c.userName}</td>
                    <td>{formatDateShort(iso)}</td>
                    <td>{formatTime(iso)}</td>
                    <td>{c.category}</td>
                    <td>₹{c.estimatedAmount}</td>
                    <td><StatusBadge status={c.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
