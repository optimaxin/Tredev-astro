import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { formatDateShort, StatusBadge, EmptyState, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

interface ClientRow {
  name: string;
  email: string;
  count: number;
  last?: string;
  next?: string;
  totalSpent: number;
}

export default function Clients() {
  const { consultations, astrologerReports, getClientNote, saveClientNote } = useAppContext();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'past'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const [clientTab, setClientTab] = useState<'overview' | 'consultations' | 'reports' | 'notes'>('overview');
  const [noteDraft, setNoteDraft] = useState('');

  const clientList = useMemo(() => {
    const map = new Map<string, ClientRow>();
    consultations.forEach(c => {
      const existing = map.get(c.clientEmail) || { name: c.clientName, email: c.clientEmail, count: 0, totalSpent: 0 };
      existing.count += 1;
      if (c.status === 'completed') existing.totalSpent += c.amount;
      if (c.status === 'upcoming') {
        if (!existing.next || c.scheduledAt < existing.next) existing.next = c.scheduledAt;
      } else if (!existing.last || c.scheduledAt > existing.last) {
        existing.last = c.scheduledAt;
      }
      map.set(c.clientEmail, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [consultations]);

  const filtered = clientList
    .filter(c => c.name.toLowerCase().includes(search.trim().toLowerCase()))
    .filter(c => statusFilter === 'all' || (statusFilter === 'active' ? !!c.next : !c.next));

  const client = clientList.find(c => c.email === selected);
  const clientConsultations = client ? consultations.filter(c => c.clientEmail === client.email).sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt)) : [];
  const clientReports = client ? astrologerReports.filter(r => r.clientEmail === client.email) : [];

  if (client) {
    return (
      <div>
        <button className={styles.backLink} onClick={() => setSelected(null)}>← Back to Clients</button>
        <div className={styles.detailHead}>
          <div className={styles.detailAvatar}>{client.name.charAt(0)}</div>
          <div>
            <div className={styles.detailName}>{client.name}</div>
            <div className={styles.detailMeta}>{client.count} consultations · Last: {client.last ? formatDateShort(client.last) : '—'} · Next: {client.next ? formatDateShort(client.next) : '—'}</div>
          </div>
        </div>

        <div className={styles.tabs}>
          {(['overview', 'consultations', 'reports', 'notes'] as const).map(k => (
            <button key={k} className={`${styles.tab} ${clientTab === k ? styles.tabActive : ''}`} onClick={() => { setClientTab(k); if (k === 'notes') setNoteDraft(getClientNote(client.email)); }}>
              {k[0].toUpperCase() + k.slice(1)}
            </button>
          ))}
        </div>

        {clientTab === 'overview' && (
          <div className={styles.kpiRow}>
            <div className={styles.kpi}><div className={styles.kpiLabel}>Total Consultations</div><div className={styles.kpiValue}>{client.count}</div></div>
            <div className={styles.kpi}><div className={styles.kpiLabel}>Total Spent</div><div className={styles.kpiValue}>₹{client.totalSpent.toLocaleString()}</div></div>
            <div className={styles.kpi}><div className={styles.kpiLabel}>Last Session</div><div className={styles.kpiValue} style={{ fontSize: 15 }}>{client.last ? formatDateShort(client.last) : '—'}</div></div>
            <div className={styles.kpi}><div className={styles.kpiLabel}>Next Session</div><div className={styles.kpiValue} style={{ fontSize: 15 }}>{client.next ? formatDateShort(client.next) : '—'}</div></div>
          </div>
        )}

        {clientTab === 'consultations' && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Service</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {clientConsultations.map(c => (
                  <tr key={c.id}><td>{formatDateShort(c.scheduledAt)}</td><td className={styles.tablePrimary}>{c.service}</td><td>₹{c.amount}</td><td><StatusBadge status={c.status} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {clientTab === 'reports' && (
          clientReports.length === 0
            ? <EmptyState icon="◈" title="No reports for this client" desc="Reports you create for this client will appear here." />
            : <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Type</th><th>Updated</th><th>Status</th></tr></thead>
                  <tbody>{clientReports.map(r => <tr key={r.id}><td className={styles.tablePrimary}>{r.reportType}</td><td>{formatDateShort(r.updatedAt)}</td><td><StatusBadge status={r.status} /></td></tr>)}</tbody>
                </table>
              </div>
        )}

        {clientTab === 'notes' && (
          <Panel>
            <label className="form-label">Private Notes (never visible to the client)</label>
            <textarea className="input-field" rows={6} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} placeholder="Add private notes about this client..." />
            <button className={`${styles.btnSm} ${styles.btnGold}`} style={{ marginTop: 8 }} onClick={() => saveClientNote(client.email, noteDraft)}>Save Notes</button>
          </Panel>
        )}
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Clients" subtitle="Your client directory." />
      <div className={styles.toolbar}>
        <input className={`input-field ${styles.searchInput}`} placeholder="Search clients..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={statusFilter} onChange={e => setStatusFilter(e.target.value as any)}>
          <option value="all">All clients</option>
          <option value="active">Active (upcoming)</option>
          <option value="past">Past</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="☉" title="No clients yet" desc="Clients you have consulted with will appear here." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Client</th><th>Consultations</th><th>Last Session</th><th>Next Session</th><th>Total Spent</th><th>Status</th></tr></thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.email} onClick={() => setSelected(c.email)}>
                  <td className={styles.tablePrimary}>{c.name}</td>
                  <td>{c.count}</td>
                  <td>{c.last ? formatDateShort(c.last) : '—'}</td>
                  <td>{c.next ? formatDateShort(c.next) : '—'}</td>
                  <td>₹{c.totalSpent.toLocaleString()}</td>
                  <td><StatusBadge status={c.next ? 'upcoming' : 'completed'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
