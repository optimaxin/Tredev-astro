import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAccessToken } from '../../realtime/api';
import { premiumReportService, PremiumReportApiError, type PremiumReport } from '../../services/premiumReportService';
import PremiumReportDocument from './PremiumReportDocument';
import styles from './PremiumReportViewer.module.css';

// The main site's Premium Report page: loads the signed-in user's report
// through the ownership-enforcing backend and hands it to the shared
// PremiumReportDocument (also used by the standalone Premium app). This file
// owns only loading, error states and the main site's navigation.

export default function PremiumReportViewer({ reportId }: { reportId: string | null }) {
  const { setPage, setSelectedId, currentUser, setShowLoginModal } = useAppContext();

  const [report, setReport] = useState<PremiumReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PremiumReportApiError | null>(null);

  const load = useCallback(async () => {
    if (!reportId) {
      setLoading(false);
      setError(new PremiumReportApiError('NO_REPORT', 'No report was selected.', 400));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError(new PremiumReportApiError('UNAUTHORIZED', 'Please sign in to open this report.', 401));
        return;
      }
      setReport(await premiumReportService.get(token, reportId));
    } catch (e) {
      setError(e as PremiumReportApiError);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => { load(); }, [load]);

  const openStatus = () => { setSelectedId(reportId); setPage('premium-report-status'); };

  if (loading) {
    return (
      <div className={styles.stateWrap} aria-busy="true">
        <div className={styles.skeletonCover} />
        <div className={styles.skeletonLine} style={{ width: '60%' }} />
        <div className={styles.skeletonLine} style={{ width: '90%' }} />
        <div className={styles.skeletonLine} style={{ width: '80%' }} />
        <p className={styles.stateText}>Opening your report…</p>
      </div>
    );
  }

  if (error) {
    const expired = error.status === 401;
    const gone = error.status === 404 || error.status === 410;
    return (
      <div className={styles.stateWrap} role="alert">
        <h2 className={styles.stateTitle}>
          {expired ? 'Your session has expired' : gone ? 'This report isn’t available' : 'Couldn’t open this report'}
        </h2>
        <p className={styles.stateText}>
          {expired
            ? 'Please sign in again to open your report. It is still safely stored against your account.'
            : gone
              ? 'We couldn’t find a report with this ID on your account. If you followed an old link, the report may have been removed.'
              : error.message}
        </p>
        <div className={styles.stateActions}>
          {expired
            ? <button type="button" className="btn btn-gold" onClick={() => setShowLoginModal(true)}>Sign In</button>
            : <button type="button" className="btn btn-outline-gold" onClick={load}>Try again</button>}
          <button type="button" className="btn btn-outline-gold" onClick={() => setPage('my-premium-reports')}>My Premium Reports</button>
        </div>
      </div>
    );
  }

  if (!report || report.sections.length === 0) {
    return (
      <div className={styles.stateWrap}>
        <h2 className={styles.stateTitle}>Nothing to read yet</h2>
        <p className={styles.stateText}>This report has no sections written yet. It may still be generating.</p>
        <div className={styles.stateActions}>
          <button type="button" className="btn btn-gold" onClick={openStatus}>Check generation status</button>
        </div>
      </div>
    );
  }

  return (
    <PremiumReportDocument
      report={report}
      fallbackName={currentUser?.name}
      onOpenList={() => setPage('my-premium-reports')}
      onOpenStatus={openStatus}
      home={{ label: 'Back to TredevaAstro', onClick: () => setPage('home') }}
    />
  );
}
