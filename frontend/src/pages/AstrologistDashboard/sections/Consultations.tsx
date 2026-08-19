import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { TYPE_ICON, formatDateShort, formatTime, StatusBadge, EmptyState, SectionHeader } from './shared';
import styles from './sections.module.css';

type Tab = 'upcoming' | 'completed' | 'cancelled';

export default function Consultations() {
  const { consultations, completeConsultation, cancelConsultation, saveConsultationNotes } = useAppContext();
  const [tab, setTab] = useState<Tab>('upcoming');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');

  const counts = {
    upcoming: consultations.filter(c => c.status === 'upcoming').length,
    completed: consultations.filter(c => c.status === 'completed').length,
    cancelled: consultations.filter(c => c.status === 'cancelled').length,
  };

  const filtered = useMemo(() => {
    return consultations
      .filter(c => c.status === tab)
      .filter(c => typeFilter === 'all' || c.type === typeFilter)
      .filter(c => c.clientName.toLowerCase().includes(search.trim().toLowerCase()))
      .sort((a, b) => tab === 'upcoming' ? a.scheduledAt.localeCompare(b.scheduledAt) : b.scheduledAt.localeCompare(a.scheduledAt));
  }, [consultations, tab, typeFilter, search]);

  return (
    <div>
      <SectionHeader title="Consultations" subtitle="Manage upcoming, completed, and cancelled sessions." />

      <div className={styles.tabs}>
        {(['upcoming', 'completed', 'cancelled'] as Tab[]).map(k => (
          <button key={k} className={`${styles.tab} ${tab === k ? styles.tabActive : ''}`} onClick={() => setTab(k)}>
            {k[0].toUpperCase() + k.slice(1)}
            <span className={styles.tabCount}>{counts[k]}</span>
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

      {filtered.length === 0 ? (
        <EmptyState icon="◎" title={`No ${tab} consultations`} desc="Consultations matching this filter will appear here." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Client</th><th>Date</th><th>Time</th><th>Service</th><th>Duration</th><th>Amount</th><th>Status</th><th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <React.Fragment key={c.id}>
                  <tr onClick={() => { setExpanded(expanded === c.id ? null : c.id); setNoteDraft(c.notes); }}>
                    <td className={styles.tablePrimary}>{TYPE_ICON[c.type]} {c.clientName}</td>
                    <td>{formatDateShort(c.scheduledAt)}</td>
                    <td>{formatTime(c.scheduledAt)}</td>
                    <td>{c.service}</td>
                    <td>{c.duration} min</td>
                    <td>₹{c.amount}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td onClick={e => e.stopPropagation()}>
                      {c.status === 'upcoming' ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className={styles.iconBtn} onClick={() => completeConsultation(c.id)}>Complete</button>
                          <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => cancelConsultation(c.id)}>Cancel</button>
                        </div>
                      ) : (
                        <button className={styles.iconBtn} onClick={() => { setExpanded(expanded === c.id ? null : c.id); setNoteDraft(c.notes); }}>View</button>
                      )}
                    </td>
                  </tr>
                  {expanded === c.id && (
                    <tr>
                      <td colSpan={8} style={{ background: 'var(--surface-highlight)', cursor: 'default' }} onClick={e => e.stopPropagation()}>
                        <label className="form-label">Private Notes</label>
                        <textarea
                          className="input-field"
                          rows={3}
                          value={noteDraft}
                          readOnly={c.status !== 'upcoming'}
                          onChange={e => setNoteDraft(e.target.value)}
                          placeholder="Notes for yourself — never shown to the client."
                        />
                        {c.status === 'upcoming' && (
                          <button className={`${styles.btnSm} ${styles.btnGold}`} style={{ marginTop: 8 }} onClick={() => saveConsultationNotes(c.id, noteDraft)}>Save Notes</button>
                        )}
                        {c.status === 'completed' && <div style={{ marginTop: 8 }}><StatusBadge status={c.payoutStatus} /> payout</div>}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
