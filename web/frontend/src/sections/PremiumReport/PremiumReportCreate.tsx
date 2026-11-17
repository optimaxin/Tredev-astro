import React, { useMemo, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import BirthDetailsForm from '../../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../components/BirthDetailsForm/BirthDetailsForm';
import CelestialOrnament from '../../components/CelestialOrnament/CelestialOrnament';
import { getAccessToken } from '../../realtime/api';
import { premiumReportService, PremiumReportApiError } from '../../services/premiumReportService';
import styles from './PremiumReport.module.css';

// Step 1 of the Premium Report journey: collect birth details with the same
// form every other calculator on this site uses, let the visitor confirm
// them, then submit ONE generation request.
//
// Chart calculation is not duplicated here. The form geocodes a place to
// coordinates (as it already does everywhere else) and the backend owns
// every astrological computation from that point on.

type Stage = 'form' | 'review';

// A stable key per filled-in form. The backend's unique (user_id,
// idempotency_key) index turns a double click, a retry after a network blip,
// or a refresh mid-submit into "return the report that already exists"
// rather than a second, separately-billed LLM run. Regenerated only when the
// details themselves change, so editing the form really does start a new report.
function idempotencyKeyFor(userId: string, d: BirthDetailsSubmitValue): string {
  const basis = [userId, d.date, d.time, d.timezoneOffsetMinutes, d.latitude.toFixed(4), d.longitude.toFixed(4), d.name.trim().toLowerCase()].join('|');
  // djb2 — this is a collision-avoidance key between a user's own
  // submissions, not a security token, so a short stable digest is enough.
  let h = 5381;
  for (let i = 0; i < basis.length; i++) h = ((h << 5) + h + basis.charCodeAt(i)) | 0;
  return `pr_${(h >>> 0).toString(36)}_${basis.length.toString(36)}`;
}

export default function PremiumReportCreate({ onStarted }: { onStarted: (reportId: string) => void }) {
  const { currentUser, birthProfile, setShowLoginModal, setPage } = useAppContext();

  const [stage, setStage] = useState<Stage>('form');
  const [details, setDetails] = useState<BirthDetailsSubmitValue | null>(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  // Second line of defence behind the server-side idempotency key: stops a
  // double click from even issuing two requests. A ref, not state, so it
  // takes effect synchronously within the same click.
  const inFlight = useRef(false);

  const initialValues = useMemo(() => ({
    name: birthProfile?.name && birthProfile.name !== 'Guest' ? birthProfile.name : currentUser?.name,
    date: currentUser?.birthDate ?? birthProfile?.dob,
    time: currentUser?.birthTime ?? birthProfile?.tob,
    place: currentUser?.birthPlace ?? birthProfile?.place,
  }), [currentUser, birthProfile]);

  // Signed-out visitors get the existing login modal, not a second login system.
  if (!currentUser) {
    return (
      <div className={styles.gateCard}>
        <CelestialOrnament type="mandala" className={styles.gateOrnament} />
        <h2 className={styles.gateTitle}>Sign in to create your Premium Report</h2>
        <p className={styles.gateText}>
          A Premium Report is a private, personalised document built from your own birth chart.
          Signing in keeps it to your account alone — only you can open it.
        </p>
        <button type="button" className="btn btn-gold" onClick={() => setShowLoginModal(true)}>
          Sign In to Continue
        </button>
      </div>
    );
  }

  const handleFormSubmit = (value: BirthDetailsSubmitValue) => {
    setDetails(value);
    setError(null);
    setStage('review');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGenerate = async () => {
    if (!details || inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setError(null);

    try {
      const token = await getAccessToken();
      if (!token) {
        setError({ code: 'UNAUTHORIZED', message: 'Your session has expired. Please sign in again.' });
        setShowLoginModal(true);
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
      onStarted(result.reportId);
    } catch (e) {
      const err = e as PremiumReportApiError;
      setError({ code: err.code || 'UNKNOWN', message: err.message || 'Could not start your report. Please try again.' });
      if (err.status === 401) setShowLoginModal(true);
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

        <button type="button" className={styles.backLink} onClick={() => setPage('reports')}>
          ← Back to Reports
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
