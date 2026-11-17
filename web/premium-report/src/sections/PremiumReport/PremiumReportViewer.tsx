import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
import { getAccessToken } from '../../services/session';
import { premiumReportService, PremiumReportApiError, type PremiumReport } from '../../../../frontend/src/services/premiumReportService';
// The report itself — cover, charts, sections, PDF — is the SAME component
// the main site renders, so the two apps can never drift apart. This file
// owns only loading, error states and this app's own navigation.
import PremiumReportDocument from '../../../../frontend/src/sections/PremiumReport/PremiumReportDocument';
import styles from '../../../../frontend/src/sections/PremiumReport/PremiumReportViewer.module.css';

// This standalone app has no site chrome of its own, so "Back to
// TredevaAstro" is an external link to the real site.
const MAIN_SITE_URL = (import.meta.env.VITE_MAIN_SITE_URL || 'http://localhost:5173').replace(/\/+$/, '');

export default function PremiumReportViewer({ reportId }: { reportId: string | null }) {
  const { currentUser, logout } = useAuth();
  const { goTo } = useRouter();

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
            ? <button type="button" className="btn btn-gold" onClick={() => logout()}>Sign In Again</button>
            : <button type="button" className="btn btn-outline-gold" onClick={load}>Try again</button>}
          <button type="button" className="btn btn-outline-gold" onClick={() => goTo('list')}>My Premium Reports</button>
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
          <button type="button" className="btn btn-gold" onClick={() => goTo('status', reportId)}>Check generation status</button>
        </div>
      </div>
    );
  }

  return (
    <PremiumReportDocument
      report={report}
      fallbackName={currentUser?.name}
      onOpenList={() => goTo('list')}
      onOpenStatus={() => goTo('status', reportId)}
      home={{ label: 'Back to TredevaAstro', href: MAIN_SITE_URL }}
    />
  );
}
