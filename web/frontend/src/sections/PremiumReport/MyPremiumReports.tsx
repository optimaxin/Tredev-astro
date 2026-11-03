import React, { useCallback, useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAccessToken } from '../../realtime/api';
import { premiumReportService, PremiumReportApiError, type PremiumReportListEntry } from '../../services/premiumReportService';
import styles from './PremiumReport.module.css';

// The user's own Premium Reports. The backend scopes this list to
// req.user.id, so there is nothing to filter here — and no report id from
// another account can ever appear.
//
// Statuses shown are the backend's cached mirror, refreshed each time that
// report's status is polled. Good enough for a list; the report's own status
// page remains the live view.

const STATUS_LABEL: Record<string, string> = {
  queued: 'Queued',
  generating: 'Writing…',
  completed: 'Ready',
  partial: 'Partly complete',
  failed: 'Failed',
};

function formatWhen(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyPremiumReports() {
  const { setPage, setSelectedId, currentUser, setShowLoginModal } = useAppContext();

  const [reports, setReports] = useState<PremiumReportListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<PremiumReportApiError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError(new PremiumReportApiError('UNAUTHORIZED', 'Please sign in to see your reports.', 401));
        return;
      }
      setReports(await premiumReportService.list(token));
    } catch (e) {
      setError(e as PremiumReportApiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser) load();
    else setLoading(false);
  }, [currentUser, load]);

  const open = (entry: PremiumReportListEntry) => {
    setSelectedId(entry.reportId);
    // A finished report opens straight into the viewer; anything else opens
    // its status page, which is the screen that can actually explain itself.
    setPage(entry.status === 'completed' || entry.status === 'partial' ? 'premium-report-view' : 'premium-report-status');
  };

  if (!currentUser) {
    return (
      <div className={styles.gateCard}>
        <h2 className={styles.gateTitle}>Sign in to see your reports</h2>
        <p className={styles.gateText}>Your Premium Reports are private to your account.</p>
        <button type="button" className="btn btn-gold" onClick={() => setShowLoginModal(true)}>Sign In</button>
      </div>
    );
  }

  return (
    <div className={styles.listWrap}>
      <div className="section-header-split">
        <div className="header-left">
          <span className="section-eyebrow-gold">Premium</span>
          <h2 className="section-title-serif">My Premium Reports</h2>
          <p className="section-desc-sans">Every Premium Report prepared for your account.</p>
        </div>
        <button type="button" className="btn btn-gold" onClick={() => setPage('premium-report')}>
          New Report
        </button>
      </div>

      {loading && (
        <div className={styles.listSkeleton} aria-busy="true">
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      )}

      {error && !loading && (
        <div className={styles.errorBox} role="alert">
          <strong>Couldn’t load your reports.</strong>
          <span>{error.message}</span>
          <div className={styles.errorActions}>
            {error.status === 401 ? (
              <button type="button" className="btn btn-gold btn-sm" onClick={() => setShowLoginModal(true)}>Sign In</button>
            ) : (
              <button type="button" className="btn btn-outline-gold btn-sm" onClick={load}>Try again</button>
            )}
          </div>
        </div>
      )}

      {!loading && !error && reports.length === 0 && (
        <div className={styles.emptyCard}>
          <h3 className={styles.emptyTitle}>You haven’t created a Premium Report yet</h3>
          <p className={styles.emptyText}>
            A Premium Report is a full-length reading of your birth chart, written section by section
            from classical sources.
          </p>
          <button type="button" className="btn btn-gold" onClick={() => setPage('premium-report')}>
            Create My Premium Report
          </button>
        </div>
      )}

      {!loading && !error && reports.length > 0 && (
        <ul className={styles.reportList}>
          {reports.map(r => (
            <li key={r.reportId}>
              <button type="button" className={styles.reportCard} onClick={() => open(r)}>
                <div className={styles.reportCardMain}>
                  <h3 className={styles.reportCardTitle}>
                    {r.subjectName ? `${r.subjectName}’s Birth Chart Reading` : 'Birth Chart Reading'}
                  </h3>
                  <p className={styles.reportCardMeta}>
                    {[r.subjectDate, r.subjectPlace].filter(Boolean).join(' · ') || 'Premium Report'}
                  </p>
                  <p className={styles.reportCardSub}>Created {formatWhen(r.createdAt)}</p>
                </div>
                <div className={styles.reportCardSide}>
                  <span className={`${styles.statusPill} ${styles[`pill_${r.status}`] ?? ''}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                  {r.sectionsTotal > 0 && r.status !== 'completed' && (
                    <span className={styles.reportCardProgress}>{r.sectionsDone}/{r.sectionsTotal} sections</span>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
