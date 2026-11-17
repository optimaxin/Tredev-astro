import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../services/session';
// Reused directly from the main frontend (zero React/context coupling) —
// see vite.config.ts's comment on what is and isn't shared this way.
import {
  premiumReportService,
  PremiumReportApiError,
  isTerminal,
  type ReportStatusResult,
} from '../../../frontend/src/services/premiumReportService';

// Polls a Premium Report's generation status until it reaches a terminal
// state. Deliberately a read-only loop: it NEVER submits a generation
// request, so a failing poll can never produce a duplicate report.
//
// A 43-section premium report takes a while, and an access token lives ~15
// minutes, so every poll goes through getAccessToken() (services/session.ts),
// which refreshes a token that is about to expire. Without that, generation
// would appear to "fail" with a 401 partway through a perfectly good run.

// Start responsive, then back off — the first sections land quickly and the
// long tail does not benefit from a tight loop.
const MIN_INTERVAL_MS = 3_000;
const MAX_INTERVAL_MS = 15_000;
const BACKOFF_FACTOR = 1.25;

// Consecutive network/5xx failures tolerated before the loop gives up. The
// report itself keeps generating server-side regardless — this only governs
// how long the page keeps watching.
const MAX_CONSECUTIVE_ERRORS = 5;

// Hard stop. Generation that has not finished in this long needs a human
// looking at the server, not a browser tab polling for a day.
const POLL_TIMEOUT_MS = 45 * 60 * 1000;

export interface PremiumReportStatusState {
  status: ReportStatusResult | null;
  /** Set when polling itself stopped (timeout, repeated failures, auth). */
  error: PremiumReportApiError | Error | null;
  polling: boolean;
  /** True once the report reached completed/partial/failed. */
  done: boolean;
  /** Restarts a loop that stopped on error or timeout. */
  retry: () => void;
}

export function usePremiumReportStatus(reportId: string | null, enabled = true): PremiumReportStatusState {
  const [status, setStatus] = useState<ReportStatusResult | null>(null);
  const [error, setError] = useState<PremiumReportApiError | Error | null>(null);
  const [polling, setPolling] = useState(false);
  // Bumping this re-runs the effect, which is how retry() restarts the loop.
  const [attempt, setAttempt] = useState(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const retry = useCallback(() => {
    setError(null);
    setAttempt(a => a + 1);
  }, []);

  useEffect(() => {
    if (!reportId || !enabled) {
      setPolling(false);
      return;
    }

    // Guards every async continuation below: once this effect is cleaned up
    // (navigation, a new reportId), nothing it started may set state again.
    let cancelled = false;
    let interval = MIN_INTERVAL_MS;
    let consecutiveErrors = 0;
    const startedAt = Date.now();

    setPolling(true);
    setError(null);

    const schedule = () => {
      timerRef.current = setTimeout(tick, interval);
      interval = Math.min(interval * BACKOFF_FACTOR, MAX_INTERVAL_MS);
    };

    const stop = (e: Error | null) => {
      if (cancelled) return;
      setPolling(false);
      if (e) setError(e);
    };

    async function tick() {
      if (cancelled) return;

      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        return stop(new Error('Still generating after 45 minutes. Your report is safe — reopen this page later to check on it.'));
      }

      let token: string | null;
      try {
        token = await getAccessToken();
      } catch {
        token = null;
      }
      if (cancelled) return;
      if (!token) {
        return stop(new PremiumReportApiError('UNAUTHORIZED', 'Your session has expired. Please sign in again to follow this report.', 401));
      }

      try {
        const next = await premiumReportService.status(token, reportId!);
        if (cancelled) return;
        consecutiveErrors = 0;
        setStatus(next);
        setError(null);
        if (isTerminal(next.status)) return stop(null);
        schedule();
      } catch (e) {
        if (cancelled) return;
        const apiError = e as PremiumReportApiError;

        // An expired session or a report that is genuinely gone will not fix
        // itself by retrying — stop immediately and let the UI say so.
        if (apiError.status === 401 || apiError.status === 403) {
          return stop(new PremiumReportApiError(apiError.code, 'Your session has expired. Please sign in again to follow this report.', apiError.status));
        }
        if (apiError.status === 404 || apiError.status === 410) {
          return stop(apiError);
        }

        // Everything else (network blip, 502/503/504 from the report
        // service) is transient: keep the last known status on screen and
        // retry with the existing backoff.
        consecutiveErrors += 1;
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          return stop(new PremiumReportApiError(
            apiError.code || 'NETWORK_ERROR',
            'Lost contact with the server while generating your report. Your report is still being generated — you can retry checking its status.',
            apiError.status || 0
          ));
        }
        schedule();
      }
    }

    tick();

    return () => {
      cancelled = true;
      setPolling(false);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reportId, enabled, attempt]);

  return { status, error, polling, done: !!status && isTerminal(status.status), retry };
}
