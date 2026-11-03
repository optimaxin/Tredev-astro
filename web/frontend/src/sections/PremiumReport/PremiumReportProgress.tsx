import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { getAccessToken } from '../../realtime/api';
import { usePremiumReportStatus } from '../../hooks/usePremiumReportStatus';
import { premiumReportService, type BlueprintSection } from '../../services/premiumReportService';
import styles from './PremiumReport.module.css';

// Live generation progress for one report. Read-only with respect to
// generation: it polls status and can RESUME a stalled report, but it never
// issues another /generate — so nothing on this screen can produce a
// duplicate report, however many times it is refreshed or retried.

const SECTION_STATE_LABEL: Record<string, string> = {
  pending: 'Waiting',
  generating: 'Writing',
  completed: 'Done',
  invalid: 'Needs review',
  failed: 'Failed',
  skipped: 'Not applicable',
};

export default function PremiumReportProgress({
  reportId,
  onOpenReport,
}: {
  reportId: string;
  onOpenReport: (reportId: string) => void;
}) {
  const { setPage } = useAppContext();
  const { status, error, polling, done, retry } = usePremiumReportStatus(reportId);

  // Section titles for the progress list. The blueprint is the report's own
  // definition of its sections, so titles shown here always match the ones
  // the finished report uses — no second list to drift out of sync.
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [resuming, setResuming] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const bp = await premiumReportService.blueprint(token);
        if (cancelled) return;
        setTitles(Object.fromEntries(bp.sections.map((s: BlueprintSection) => [s.section_id, s.title])));
      } catch {
        // Titles are a nicety — fall back to section ids rather than
        // failing the whole progress view over a cosmetic request.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // A finished report should not leave the reader on a progress bar.
  useEffect(() => {
    if (status?.status === 'completed') {
      const t = setTimeout(() => onOpenReport(reportId), 900);
      return () => clearTimeout(t);
    }
  }, [status?.status, reportId, onOpenReport]);

  const handleResume = async () => {
    setResuming(true);
    setResumeError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setResumeError('Your session has expired. Please sign in again.');
        return;
      }
      await premiumReportService.resume(token, reportId);
      retry(); // restart the status loop; resume does not regenerate finished sections
    } catch (e) {
      setResumeError((e as Error).message || 'Could not resume this report.');
    } finally {
      setResuming(false);
    }
  };

  const done_ = status?.progress.done ?? 0;
  const total = status?.progress.total ?? 0;
  const percent = total > 0 ? Math.round((done_ / total) * 100) : 0;
  const order = Object.keys(status?.sectionStatus ?? {});

  // Polling stopped before the report reached a terminal state. The report
  // itself is unaffected — only this page stopped watching.
  const watchingStopped = !!error && !done;

  return (
    <div className={styles.progressWrap}>
      <span className="section-eyebrow-gold">Premium Report</span>
      <h2 className="section-title-serif">
        {status?.status === 'completed' ? 'Your report is ready' : 'Writing your report'}
      </h2>
      <p className="section-desc-sans">
        {status?.status === 'completed'
          ? 'Opening your report…'
          : 'Each section is written from your own chart and checked before it is kept. This takes a few minutes — you can leave this page and come back, nothing is lost.'}
      </p>

      <div className={styles.progressCard}>
        <div
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Report generation progress"
        >
          <div className={styles.progressFill} style={{ width: `${percent}%` }} />
        </div>
        <div className={styles.progressMeta}>
          <span className={styles.progressCount}>
            {total > 0 ? `${done_} of ${total} sections` : 'Preparing your chart…'}
          </span>
          <span className={styles.progressPercent}>{percent}%</span>
        </div>

        <div className={styles.statusPills}>
          <span className={`${styles.statusPill} ${styles[`pill_${status?.status ?? 'queued'}`] ?? ''}`}>
            {status?.status ?? 'queued'}
          </span>
          {polling && <span className={styles.pollingDot} aria-hidden="true" />}
          {polling && <span className={styles.pollingText}>checking for updates…</span>}
        </div>

        <p className={styles.reportIdLine}>
          Report ID <code>{reportId}</code> — you can return to this report at any time from
          {' '}
          <button type="button" className={styles.inlineLink} onClick={() => setPage('my-premium-reports')}>
            My Premium Reports
          </button>.
        </p>
      </div>

      {/* Generation failed outright, upstream. */}
      {status?.status === 'failed' && (
        <div className={styles.errorBox} role="alert">
          <strong>Generation failed.</strong>
          <span>{status.error?.message || 'Your report could not be completed.'}</span>
          <div className={styles.errorActions}>
            <button type="button" className="btn btn-outline-gold btn-sm" onClick={handleResume} disabled={resuming}>
              {resuming ? 'Resuming…' : 'Resume generation'}
            </button>
          </div>
        </div>
      )}

      {/* Some sections finished and some did not — honest about both. */}
      {status?.status === 'partial' && (
        <div className={styles.noticeBox} role="status">
          <strong>Your report is partly complete.</strong>
          <span>
            {done_} of {total} sections were written. You can read what is finished now, or resume
            generation to complete the rest — sections that are already done are never rewritten.
          </span>
          <div className={styles.errorActions}>
            <button type="button" className="btn btn-gold btn-sm" onClick={() => onOpenReport(reportId)}>
              Read what’s ready
            </button>
            <button type="button" className="btn btn-outline-gold btn-sm" onClick={handleResume} disabled={resuming}>
              {resuming ? 'Resuming…' : 'Resume generation'}
            </button>
          </div>
        </div>
      )}

      {resumeError && <div className={styles.errorBox} role="alert"><span>{resumeError}</span></div>}

      {/* This page lost contact; the report itself is still generating. */}
      {watchingStopped && (
        <div className={styles.noticeBox} role="alert">
          <strong>Lost contact with the server.</strong>
          <span>{error?.message}</span>
          <div className={styles.errorActions}>
            <button type="button" className="btn btn-outline-gold btn-sm" onClick={retry}>
              Check again
            </button>
          </div>
        </div>
      )}

      {order.length > 0 && (
        <ol className={styles.sectionProgressList}>
          {order.map(id => {
            const state = status!.sectionStatus[id];
            return (
              <li key={id} className={`${styles.sectionProgressItem} ${styles[`sec_${state}`] ?? ''}`}>
                <span className={styles.sectionProgressName}>{titles[id] ?? id.replace(/_/g, ' ')}</span>
                <span className={styles.sectionProgressState}>{SECTION_STATE_LABEL[state] ?? state}</span>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.progressActions}>
        <button type="button" className={styles.backLink} onClick={() => setPage('reports')}>
          ← Back to Reports
        </button>
        {done && status?.status !== 'failed' && (
          <button type="button" className="btn btn-gold" onClick={() => onOpenReport(reportId)}>
            Open Report
          </button>
        )}
      </div>
    </div>
  );
}
