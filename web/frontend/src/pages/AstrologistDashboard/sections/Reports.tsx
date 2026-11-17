import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import type { ReportStatus } from '../../../context/AppContext';
import { formatDateShort, StatusBadge, EmptyState, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

const REPORT_TYPES = ['Kundli Analysis', 'Marriage Compatibility', 'Career Timing', 'Vastu Consultation', 'Muhurat Selection'];

export default function Reports() {
  const { astrologerReports, saveReportDraft, updateReportStatus, consultations } = useAppContext();
  const [filter, setFilter] = useState<'all' | ReportStatus>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [form, setForm] = useState({ clientEmail: '', clientName: '', reportType: REPORT_TYPES[0], content: '' });

  const clients = useMemo(() => {
    const map = new Map<string, string>();
    consultations.forEach(c => map.set(c.clientEmail, c.clientName));
    return Array.from(map.entries()).map(([email, name]) => ({ email, name }));
  }, [consultations]);

  const filtered = astrologerReports
    .filter(r => filter === 'all' || r.status === filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const editing = astrologerReports.find(r => r.id === editingId);

  const openNew = () => {
    setIsNew(true);
    setEditingId(null);
    setForm({ clientEmail: clients[0]?.email || '', clientName: clients[0]?.name || '', reportType: REPORT_TYPES[0], content: '' });
  };

  const openExisting = (id: string) => {
    const r = astrologerReports.find(x => x.id === id);
    if (!r) return;
    setIsNew(false);
    setEditingId(id);
    setForm({ clientEmail: r.clientEmail, clientName: r.clientName, reportType: r.reportType, content: r.content });
  };

  if (isNew || editing) {
    return (
      <div>
        <button className={styles.backLink} onClick={() => { setIsNew(false); setEditingId(null); }}>← Back to Reports</button>
        <SectionHeader title={isNew ? 'New Report' : `Edit Report — ${editing?.clientName}`} />
        <Panel>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Client</label>
            <select
              className={styles.filterSelect}
              style={{ width: '100%' }}
              value={form.clientEmail}
              disabled={!isNew}
              onChange={e => setForm({ ...form, clientEmail: e.target.value, clientName: clients.find(c => c.email === e.target.value)?.name || '' })}
            >
              {clients.map(c => <option key={c.email} value={c.email}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Report Type</label>
            <select className={styles.filterSelect} style={{ width: '100%' }} value={form.reportType} onChange={e => setForm({ ...form, reportType: e.target.value })}>
              {REPORT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="form-label">Content</label>
            <textarea className="input-field" rows={10} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Report notes and findings..." />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className={styles.btnSm}
              onClick={() => {
                saveReportDraft({ id: editingId || undefined, clientEmail: form.clientEmail, clientName: form.clientName, reportType: form.reportType, content: form.content });
                setIsNew(false); setEditingId(null);
              }}
            >
              Save Draft
            </button>
            <button
              className={`${styles.btnSm} ${styles.btnGold}`}
              onClick={() => {
                saveReportDraft({ id: editingId || undefined, clientEmail: form.clientEmail, clientName: form.clientName, reportType: form.reportType, content: form.content });
                if (editingId) updateReportStatus(editingId, 'SUBMITTED');
                setIsNew(false); setEditingId(null);
              }}
            >
              Submit
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Reports" subtitle="Astrology reports you're preparing for clients." actions={<button className={`${styles.btnSm} ${styles.btnGold}`} onClick={openNew} disabled={clients.length === 0}>+ New Report</button>} />

      <div className={styles.tabs}>
        {(['all', 'DRAFT', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED'] as const).map(k => (
          <button key={k} className={`${styles.tab} ${filter === k ? styles.tabActive : ''}`} onClick={() => setFilter(k)}>
            {k === 'all' ? 'All' : k.replace('_', ' ')}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon="◈" title="No reports" desc="Reports assigned or drafted for clients will appear here." />
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Client</th><th>Report Type</th><th>Created</th><th>Updated</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} onClick={() => openExisting(r.id)}>
                  <td className={styles.tablePrimary}>{r.clientName}</td>
                  <td>{r.reportType}</td>
                  <td>{formatDateShort(r.createdAt)}</td>
                  <td>{formatDateShort(r.updatedAt)}</td>
                  <td><StatusBadge status={r.status} /></td>
                  <td><button className={styles.iconBtn} onClick={e => { e.stopPropagation(); openExisting(r.id); }}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
