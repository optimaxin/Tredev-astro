import React, { useMemo, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from '../../context/RouterContext';
// Reused directly from the main frontend — zero AppContext coupling, so
// nothing here needed adapting. See vite.config.ts's comment.
import BirthDetailsForm from '../../../../frontend/src/components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../../../frontend/src/components/BirthDetailsForm/BirthDetailsForm';
import { getAccessToken } from '../../services/session';
import { premiumReportService, PremiumReportApiError } from '../../../../frontend/src/services/premiumReportService';
import styles from '../../../../frontend/src/sections/PremiumReport/PremiumReport.module.css';

// Step 1 of the Premium Report journey: collect birth details with the same
// form every calculator on the main site uses, let the visitor confirm
// them, then submit ONE generation request. App.tsx only ever renders this
// once a user is signed in, so there is no sign-in gate here.
//
// Chart calculation is not duplicated here. The form geocodes a place to
// coordinates (as it already does on the main site) and the backend remains
// the sole source of truth from that point on.

type Stage = 'form' | 'review';

// A stable key per filled-in form. The backend's unique (user_id,
// idempotency_key) index turns a double click, a retry after a network
// blip, or a refresh mid-submit into "return the report that already
// exists" rather than a second, separately-billed LLM run.
function idempotencyKeyFor(userId: string, d: BirthDetailsSubmitValue): string {
  const basis = [userId, d.date, d.time, d.timezoneOffsetMinutes, d.latitude.toFixed(4), d.longitude.toFixed(4), d.name.trim().toLowerCase()].join('|');
  let h = 5381; // djb2 — a collision-avoidance key, not a security token
  for (let i = 0; i < basis.length; i++) h = ((h << 5) + h + basis.charCodeAt(i)) | 0;
  return `pr_${(h >>> 0).toString(36)}_${basis.length.toString(36)}`;
}

export default function PremiumReportCreate() {
  const { currentUser, logout } = useAuth();
  const { goTo } = useRouter();

  const [stage, setStage] = useState<Stage>('form');
  const [details, setDetails] = useState<BirthDetailsSubmitValue | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  // Second line of defence behind the server-side idempotency key: stops a
  // double click from even issuing two requests. A ref, not state, so it
  // takes effect synchronously within the same click.
  const inFlight = useRef(false);

  // ApiUser's birth_* fields are snake_case (the backend's own wire shape) —
  // this app has no separate guest "birth profile" concept, so a signed-in
  // user's own saved birth details are the only prefill source.
  const initialValues = useMemo(() => ({
    name: currentUser?.name,
    date: currentUser?.birth_date ?? undefined,
    time: currentUser?.birth_time ?? undefined,
    place: currentUser?.birth_place ?? undefined,
  }), [currentUser]);

  const handleFormSubmit = (value: BirthDetailsSubmitValue) => {
    setDetails(value);
    setError(null);
    setStage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerate = async () => {
    if (!details || inFlight.current || !currentUser) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError({ code: 'UNAUTHORIZED', message: 'Your session has expired. Please sign in again.' });
        await logout();
        return;
      }
      const result = await premiumReportService.generate(token, {
        birthDetails: {
          date: details.date,
          time: details.time,
          // Passed through exactly as the form produced it — this project's
          // convention throughout is "UTC = local - offset" (India = +330).
          timezoneOffsetMinutes: details.timezoneOffsetMinutes,
          latitude: details.latitude,
          longitude: details.longitude,
          placeLabel: details.placeName || null,
        },
        subjectName: details.name,
        reportType: 'premium',
        language: 'en',
        userNotes: notes.trim() || undefined,
        idempotencyKey: idempotencyKeyFor(currentUser.id, details),
      });
      // `duplicate: true` means these exact details were already submitted —
      // open that report rather than claiming a new one was started.
      goTo('status', result.reportId);
    } catch (e) {
      const err = e as PremiumReportApiError;
      setError({ code: err.code || 'UNKNOWN', message: err.message || 'Could not start your report. Please try again.' });
      if (err.status === 401) await logout();
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  if (stage === 'review' && details) {
    return (
      <div className={styles.reviewWrap}>
        <span className="section-eyebrow-gold">Step 2 of 2</span>
        <h2 className="section-title-serif">Confirm your birth details</h2>
        <p className="section-desc-sans">
          Your chart — and every reading in the report — is calculated from exactly these values.
          Even a few minutes’ difference can move your Ascendant, so please check them carefully.
        </p>

        <dl className={styles.reviewList}>
          <div className={styles.reviewRow}><dt>Name</dt><dd>{details.name}</dd></div>
          <div className={styles.reviewRow}><dt>Date of birth</dt><dd>{details.date}</dd></div>
          <div className={styles.reviewRow}>
            <dt>Time of birth</dt>
            <dd>
              {details.time}
              {details.timeUnknown && <span className={styles.reviewFlag}>exact time not known</span>}
            </dd>
          </div>
          <div className={styles.reviewRow}><dt>Place</dt><dd>{details.placeName}</dd></div>
          <div className={styles.reviewRow}>
            <dt>Coordinates</dt>
            <dd>{details.latitude.toFixed(4)}°, {details.longitude.toFixed(4)}°</dd>
          </div>
          <div className={styles.reviewRow}>
            <dt>Timezone</dt>
            <dd>UTC{details.timezoneOffsetMinutes >= 0 ? '+' : '−'}{String(Math.floor(Math.abs(details.timezoneOffsetMinutes) / 60)).padStart(2, '0')}:{String(Math.abs(details.timezoneOffsetMinutes) % 60).padStart(2, '0')}</dd>
          </div>
        </dl>

        {details.timeUnknown && (
          <p className={styles.reviewNotice}>
            You told us the exact birth time isn’t known. Sections that depend on it — your Ascendant,
            the house placements and Nakshatra Pada — will say so rather than guess.
          </p>
        )}

        <label className={styles.notesLabel} htmlFor="premium-report-notes">
          Anything you’d like the report to pay attention to? <span>(optional)</span>
        </label>
        <textarea
          id="premium-report-notes"
          className={styles.notesInput}
          value={notes}
          maxLength={1000}
          rows={3}
          placeholder="For example: I’m weighing up a career change this year."
          onChange={e => setNotes(e.target.value)}
          disabled={submitting}
        />
        <div className={styles.notesCount}>{notes.length}/1000</div>

        {error && (
          <div className={styles.errorBox} role="alert">
            <strong>Could not start your report.</strong>
            <span>{error.message}</span>
          </div>
        )}

        <div className={styles.reviewActions}>
          <button
            type="button"
            className="btn btn-outline-gold"
            onClick={() => { setStage('form'); setError(null); }}
            disabled={submitting}
          >
            Edit details
          </button>
          <button
            type="button"
            className="btn btn-gold"
            onClick={handleGenerate}
            disabled={submitting}
            aria-busy={submitting}
          >
            {submitting ? 'Starting your report…' : 'Generate Premium Report'}
          </button>
        </div>

        <button type="button" className={styles.backLink} onClick={() => goTo('list')}>
          ← Back to My Reports
        </button>
      </div>
    );
  }

  return (
    <div className={styles.createWrap}>
      <span className="section-eyebrow-gold">Step 1 of 2</span>
      <h2 className="section-title-serif">Your Premium Report</h2>
      <p className="section-desc-sans">
        A full-length reading of your birth chart — your Lagna, your Moon, each planet, your Dashas and
        the life areas they shape — written section by section from classical sources.
      </p>

      <div className={styles.formCard}>
        <BirthDetailsForm
          idPrefix="premium-report"
          submitLabel="Review Details"
          nameLabel="Full Name"
          showNameField
          allowUnknownTime
          initialValues={initialValues}
          onSubmit={handleFormSubmit}
        />
      </div>

      <p className={styles.privacyNote}>
        Your birth details and the report generated from them stay private to your account.
      </p>
    </div>
  );
}
