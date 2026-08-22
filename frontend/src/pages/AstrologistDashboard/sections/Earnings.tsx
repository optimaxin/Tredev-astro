import React, { useEffect, useState } from 'react';
import { consultationService, ConsultationApiError } from '../../../services/consultationService';
import type { MyConsultationAsAstrologer } from '../../../services/consultationService';
import { DAY_MS, formatDateShort, EmptyState, SectionHeader, Panel, KpiCard, MiniBarChart } from './shared';
import styles from './sections.module.css';

export default function Earnings() {
  const [consultations, setConsultations] = useState<MyConsultationAsAstrologer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    consultationService.listMineAsAstrologer()
      .then(setConsultations)
      .catch(err => setError(err instanceof ConsultationApiError ? err.message : 'Could not load your earnings.'))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const completed = consultations.filter(c => c.status === 'COMPLETED').sort((a, b) => b.createdAt - a.createdAt);

  const totalEarnings = completed.reduce((s, c) => s + c.estimatedAmount, 0);
  const thisMonth = completed.filter(c => { const d = new Date(c.createdAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, c) => s + c.estimatedAmount, 0);

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const weeksAgo = 5 - i;
    const bucket = completed.filter(c => {
      const diffDays = Math.floor((now.getTime() - c.createdAt) / DAY_MS);
      return diffDays >= weeksAgo * 7 && diffDays < (weeksAgo + 1) * 7;
    });
    return { label: weeksAgo === 0 ? 'This wk' : `${weeksAgo}w ago`, value: bucket.reduce((s, c) => s + c.estimatedAmount, 0) };
  });

  return (
    <div>
      <SectionHeader title="Earnings" subtitle="Estimated from your completed consultations and current pricing — this app has no real payment/payout system yet, so treat these as estimates, not a settled ledger." />

      {error && <p style={{ color: '#d64545' }}>{error}</p>}

      <div className={styles.kpiRow}>
        <KpiCard label="Total Earnings" value={`₹${totalEarnings.toLocaleString()}`} />
        <KpiCard label="This Month" value={`₹${thisMonth.toLocaleString()}`} />
      </div>

      {chartData.some(d => d.value > 0) && (
        <Panel title="Weekly Earnings">
          <MiniBarChart data={chartData} />
        </Panel>
      )}

      <Panel title="Transactions">
        {!loading && completed.length === 0 ? (
          <EmptyState icon="◈" title="No transactions yet" desc="Earnings will appear here after your first completed consultation." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Category</th><th>Client</th><th>Amount</th></tr></thead>
              <tbody>
                {completed.map(c => (
                  <tr key={c.id}>
                    <td>{formatDateShort(new Date(c.createdAt).toISOString())}</td>
                    <td className={styles.tablePrimary}>{c.category}</td>
                    <td>{c.userName}</td>
                    <td>₹{c.estimatedAmount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
