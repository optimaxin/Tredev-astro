import React, { useState } from 'react';
import AncientDatePicker from '../AncientDatePicker/AncientDatePicker';
import AncientTimePicker from '../AncientTimePicker/AncientTimePicker';
import LocationAutocomplete from '../LocationAutocomplete/LocationAutocomplete';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { BirthDetailsInput, GeocodeResult } from '../../services/calculatorService';
import { useAppContext } from '../../context/AppContext';
import { validateRequiredEmail } from '../../utils/emailValidation';
import styles from './BirthDetailsForm.module.css';

// Common timezones only — full IANA-zone coverage isn't worth the added
// complexity for a birth-details form; this covers the vast majority of
// this site's audience. Offset is the standard "UTC = local - offset"
// convention (so IST, UTC+5:30, is +330) — matches toUtcDate on the backend.
export const TIMEZONES = [
  { label: 'India (IST, UTC+5:30)', offset: 330 },
  { label: 'UTC', offset: 0 },
  { label: 'UK (GMT/UTC+0)', offset: 0 },
  { label: 'Central Europe (UTC+1)', offset: 60 },
  { label: 'Dubai (UTC+4)', offset: 240 },
  { label: 'Singapore (UTC+8)', offset: 480 },
  { label: 'US Eastern (UTC-5)', offset: -300 },
  { label: 'US Pacific (UTC-8)', offset: -480 },
];

export interface BirthDetailsSubmitValue extends BirthDetailsInput {
  name: string;
  email: string;
  placeName: string;
  gender?: 'Male' | 'Female';
  // Set when the caller opted into allowUnknownTime and the visitor checked
  // "I don't know my exact time of birth" — `time` above is still a real,
  // valid HH:MM (the moment of submission), so every existing downstream
  // consumer (the API, the PDF) keeps working unchanged; this flag is only
  // for callers that want to show a disclaimer instead of presenting that
  // substituted clock time as if it were the visitor's real birth time.
  timeUnknown?: boolean;
}

export interface BirthDetailsInitialValues {
  name?: string;
  date?: string;
  time?: string;
  place?: string;
  timezoneOffsetMinutes?: number;
}

interface BirthDetailsFormProps {
  // May return a Promise — when it does, `loading` (and the button's
  // spinner) stays on until the caller's own calculation finishes too, not
  // just the geocode lookup below. Every calculator page's onSubmit is
  // already an async function; it just wasn't being awaited here before.
  onSubmit: (details: BirthDetailsSubmitValue) => void | Promise<void>;
  showNameField?: boolean;
  showGenderField?: boolean;
  nameLabel?: string;
  submitLabel: string;
  idPrefix: string;
  initialValues?: BirthDetailsInitialValues;
  // Offered as an opt-in per caller (not a site-wide default) — most of
  // this form's other consumers (Moon Sign, Sade Sati, Kaal Sarp, ...) stay
  // exactly as they were; only the full Kundli page currently turns this on,
  // since Ascendant/houses/exact Nakshatra Pada are the placements that
  // actually shift meaningfully across a single day.
  allowUnknownTime?: boolean;
}

// HH:MM, 24h, in whatever the browser's own local clock reads right now —
// deliberately not the birth place's local time (this app has no way to
// know the visitor is physically there), just "the moment they clicked
// submit", per how this feature was asked for.
function currentTimeHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

export default function BirthDetailsForm({ onSubmit, showNameField = true, showGenderField = false, nameLabel = 'Full Name', submitLabel, idPrefix, initialValues, allowUnknownTime = false }: BirthDetailsFormProps) {
  const { currentUser } = useAppContext();
  // Logged in: use the account's own email, not re-asked and not editable
  // here (it's not this form's job to change it). Anonymous: a required,
  // validated field — every calculator needs a real email on record, and
  // this is the one shared form all of them submit through.
  const loggedInEmail = currentUser?.email || '';
  const [name, setName] = useState(initialValues?.name || '');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [dob, setDob] = useState(initialValues?.date || '');
  const [tob, setTob] = useState(initialValues?.time || '');
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [place, setPlace] = useState(initialValues?.place || '');
  // Set only when the user picks an actual suggestion — carries its exact
  // coordinates directly, so submit can skip a second (less precise) geocode
  // guess entirely. Any further edit to the text invalidates it, since it no
  // longer necessarily matches what's in the box.
  const [selectedGeo, setSelectedGeo] = useState<GeocodeResult | null>(null);
  const [timezoneOffset, setTimezoneOffset] = useState(initialValues?.timezoneOffsetMinutes ?? TIMEZONES[0].offset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const emailError = loggedInEmail ? null : validateRequiredEmail(email);
  const canSubmit = (!showNameField || name.trim()) && !emailError && dob && (timeUnknown || tob) && place.trim() && !loading;

  const handlePlaceChange = (v: string) => {
    setPlace(v);
    setSelectedGeo(null);
  };

  const handlePlaceSelect = (geo: GeocodeResult) => {
    setPlace(geo.displayName);
    setSelectedGeo(geo);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const geo = selectedGeo ?? await calculatorService.geocode(place.trim());
      await onSubmit({
        name: name.trim(),
        email: loggedInEmail || email.trim(),
        placeName: geo.displayName,
        date: dob,
        // A real, valid HH:MM either way — the exact moment of submission
        // when the time is unknown, so nothing downstream needs to handle a
        // missing/blank time specially.
        time: timeUnknown ? currentTimeHHMM() : tob,
        timezoneOffsetMinutes: timezoneOffset,
        latitude: geo.latitude,
        longitude: geo.longitude,
        ...(gender ? { gender } : {}),
        ...(timeUnknown ? { timeUnknown: true } : {}),
      });
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.grid}>
        {showNameField && (
          <div className={styles.field}>
            <label className={styles.label} htmlFor={`${idPrefix}-name`}>{nameLabel}</label>
            <input
              id={`${idPrefix}-name`}
              type="text"
              className={`${styles.input} input-field`}
              placeholder="Full name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-email`}>Email</label>
          {loggedInEmail ? (
            <input
              id={`${idPrefix}-email`}
              type="email"
              className={`${styles.input} input-field`}
              value={loggedInEmail}
              disabled
              readOnly
            />
          ) : (
            <>
              <input
                id={`${idPrefix}-email`}
                type="email"
                className={`${styles.input} input-field`}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                required
              />
              {emailTouched && emailError && <p className={styles.error} style={{ marginTop: 4 }}>{emailError}</p>}
            </>
          )}
        </div>
        {showGenderField && (
          <div className={styles.field}>
            <label className={styles.label} id={`${idPrefix}-gender-label`}>Gender</label>
            <div className={styles.genderRow} role="radiogroup" aria-labelledby={`${idPrefix}-gender-label`}>
              {(['Male', 'Female'] as const).map(g => (
                <button
                  key={g}
                  type="button"
                  role="radio"
                  aria-checked={gender === g}
                  className={`${styles.genderOption} ${gender === g ? styles.genderOptionActive : ''}`}
                  onClick={() => setGender(g)}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-dob`}>Date of Birth</label>
          <AncientDatePicker className={`${styles.input} input-field`} value={dob} onChange={setDob} required placeholder="Select Date of Birth" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-tob`}>Time of Birth</label>
          {timeUnknown ? (
            <p className={styles.label} style={{ margin: 0, fontStyle: 'italic' }}>
              We'll use the current time as an approximation — see the note below.
            </p>
          ) : (
            <AncientTimePicker className={`${styles.input} input-field`} value={tob} onChange={setTob} placeholder="Select Time of Birth" />
          )}
          {allowUnknownTime && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: '0.85em', fontWeight: 400, cursor: 'pointer' }}>
              <input type="checkbox" checked={timeUnknown} onChange={e => setTimeUnknown(e.target.checked)} />
              I don't know my exact time of birth
            </label>
          )}
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-place`}>Place of Birth</label>
          <LocationAutocomplete
            id={`${idPrefix}-place`}
            className={`${styles.input} input-field`}
            placeholder="Start typing a city..."
            value={place}
            onChange={handlePlaceChange}
            onSelect={handlePlaceSelect}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-tz`}>Time Zone</label>
          <select
            id={`${idPrefix}-tz`}
            className={`${styles.input} input-field`}
            value={timezoneOffset}
            onChange={e => setTimezoneOffset(Number(e.target.value))}
          >
            {TIMEZONES.map(tz => (
              <option key={tz.label} value={tz.offset}>{tz.label}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={`${styles.submitBtn} btn btn-gold btn-lg`} disabled={!canSubmit}>
        {loading && <span className="spin-loader" />}
        {loading ? 'Calculating...' : submitLabel}
      </button>
      <p className={styles.privacy}>🔒 Your data is private and never shared with third parties.</p>
    </form>
  );
}
