import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { DAY_MS, formatDateShort, StatusBadge, EmptyState, SectionHeader, Panel, KpiCard, MiniBarChart } from './shared';
import styles from './sections.module.css';

export default function Earnings() {
  const { consultations } = useAppContext();
  const now = new Date();
  const completed = consultations.filter(c => c.status === 'completed').sort((a, b) => b.scheduledAt.localeCompare(a.scheduledAt));

  const totalEarnings = completed.reduce((s, c) => s + c.amount, 0);
  const thisMonth = completed.filter(c => { const d = new Date(c.scheduledAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, c) => s + c.amount, 0);
  const pendingPayout = completed.filter(c => c.payoutStatus === 'PENDING').reduce((s, c) => s + c.amount, 0);
  const completedPayout = completed.filter(c => c.payoutStatus === 'PAID').reduce((s, c) => s + c.amount, 0);

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const weeksAgo = 5 - i;
    const bucket = completed.filter(c => {
      const diffDays = Math.floor((now.getTime() - new Date(c.scheduledAt).getTime()) / DAY_MS);
      return diffDays >= weeksAgo * 7 && diffDays < (weeksAgo + 1) * 7;
    });
    return { label: weeksAgo === 0 ? 'This wk' : `${weeksAgo}w ago`, value: bucket.reduce((s, c) => s + c.amount, 0) };
  });

  return (
    <div>
      <SectionHeader title="Earnings" subtitle="Your practice's financial overview." />

      <div className={styles.kpiRow}>
        <KpiCard label="Total Earnings" value={`₹${totalEarnings.toLocaleString()}`} />
        <KpiCard label="This Month" value={`₹${thisMonth.toLocaleString()}`} />
        <KpiCard label="Pending Payout" value={`₹${pendingPayout.toLocaleString()}`} />
        <KpiCard label="Completed Payout" value={`₹${completedPayout.toLocaleString()}`} />
      </div>

      {chartData.some(d => d.value > 0) && (
        <Panel title="Weekly Earnings">
          <MiniBarChart data={chartData} />
        </Panel>
      )}

      <Panel title="Transactions">
        {completed.length === 0 ? (
          <EmptyState icon="◈" title="No transactions yet" desc="Earnings will appear here after your first completed consultation." />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Date</th><th>Consultation</th><th>Client</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {completed.map(c => (
                  <tr key={c.id}>
                    <td>{formatDateShort(c.scheduledAt)}</td>
                    <td className={styles.tablePrimary}>{c.service}</td>
                    <td>{c.clientName}</td>
                    <td>₹{c.amount}</td>
                    <td><StatusBadge status={c.payoutStatus} /></td>
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
