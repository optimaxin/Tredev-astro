import React, { useState } from 'react';
import AncientDatePicker from '../AncientDatePicker/AncientDatePicker';
import AncientTimePicker from '../AncientTimePicker/AncientTimePicker';
import LocationAutocomplete from '../LocationAutocomplete/LocationAutocomplete';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { BirthDetailsInput, GeocodeResult } from '../../services/calculatorService';
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
  placeName: string;
}

export interface BirthDetailsInitialValues {
  name?: string;
  date?: string;
  time?: string;
  place?: string;
  timezoneOffsetMinutes?: number;
}

interface BirthDetailsFormProps {
  onSubmit: (details: BirthDetailsSubmitValue) => void;
  showNameField?: boolean;
  nameLabel?: string;
  submitLabel: string;
  idPrefix: string;
  initialValues?: BirthDetailsInitialValues;
}

export default function BirthDetailsForm({ onSubmit, showNameField = true, nameLabel = 'Full Name', submitLabel, idPrefix, initialValues }: BirthDetailsFormProps) {
  const [name, setName] = useState(initialValues?.name || '');
  const [dob, setDob] = useState(initialValues?.date || '');
  const [tob, setTob] = useState(initialValues?.time || '');
  const [place, setPlace] = useState(initialValues?.place || '');
  // Set only when the user picks an actual suggestion — carries its exact
  // coordinates directly, so submit can skip a second (less precise) geocode
  // guess entirely. Any further edit to the text invalidates it, since it no
  // longer necessarily matches what's in the box.
  const [selectedGeo, setSelectedGeo] = useState<GeocodeResult | null>(null);
  const [timezoneOffset, setTimezoneOffset] = useState(initialValues?.timezoneOffsetMinutes ?? TIMEZONES[0].offset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = (!showNameField || name.trim()) && dob && tob && place.trim() && !loading;

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
      onSubmit({
        name: name.trim(),
        placeName: geo.displayName,
        date: dob,
        time: tob,
        timezoneOffsetMinutes: timezoneOffset,
        latitude: geo.latitude,
        longitude: geo.longitude,
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
          <label className={styles.label} htmlFor={`${idPrefix}-dob`}>Date of Birth</label>
          <AncientDatePicker className={`${styles.input} input-field`} value={dob} onChange={setDob} required placeholder="Select Date of Birth" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-tob`}>Time of Birth</label>
          <AncientTimePicker className={`${styles.input} input-field`} value={tob} onChange={setTob} placeholder="Select Time of Birth" />
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
        {loading ? 'Looking up your birth details...' : submitLabel}
      </button>
      <p className={styles.privacy}>🔒 Your data is private and never shared with third parties.</p>
    </form>
  );
}
