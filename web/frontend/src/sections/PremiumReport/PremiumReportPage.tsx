import React from 'react';
import { useAppContext } from '../../context/AppContext';
import PremiumReportCreate from './PremiumReportCreate';
import PremiumReportProgress from './PremiumReportProgress';
import styles from './PremiumReport.module.css';

// Entry point for the Premium Report creation journey. Two screens, selected
// by the app's existing `page` router:
//
//   premium-report         → create (details → review → submit)
//   premium-report-status  → live generation progress for selectedId
//
// The report id lives in `selectedId`, which AppContext already persists into
// history.state — so navigating away and coming back (or a browser Back
// press) returns to the same report rather than losing it.

export default function PremiumReportPage({ mode }: { mode: 'create' | 'status' }) {
  const { selectedId, setSelectedId, setPage } = useAppContext();

  const openReport = (reportId: string) => {
    setSelectedId(reportId);
    setPage('premium-report-view');
  };

  const handleStarted = (reportId: string) => {
    setSelectedId(reportId);
    setPage('premium-report-status');
  };

  if (mode === 'status') {
    const reportId = typeof selectedId === 'string' ? selectedId : null;
    if (!reportId) {
      // Landed here without a report id (a stale link, or history state the
      // browser dropped) — offer the two real ways forward instead of an
      // empty progress bar.
      return (
        <div className={styles.gateCard}>
          <h2 className={styles.gateTitle}>No report selected</h2>
          <p className={styles.gateText}>We don’t have a report to follow. Pick one of yours, or start a new one.</p>
          <div className={styles.stateActions}>
            <button type="button" className="btn btn-gold" onClick={() => setPage('my-premium-reports')}>My Premium Reports</button>
            <button type="button" className="btn btn-outline-gold" onClick={() => { setSelectedId(null); setPage('premium-report'); }}>
              Create a Report
            </button>
          </div>
        </div>
      );
    }
    return <PremiumReportProgress reportId={reportId} onOpenReport={openReport} />;
  }

  return <PremiumReportCreate onStarted={handleStarted} />;
}
