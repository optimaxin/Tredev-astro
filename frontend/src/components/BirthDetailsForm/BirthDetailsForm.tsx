import React, { useState } from 'react';
import AncientDatePicker from '../AncientDatePicker/AncientDatePicker';
import AncientTimePicker from '../AncientTimePicker/AncientTimePicker';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { BirthDetailsInput } from '../../services/calculatorService';
import styles from './BirthDetailsForm.module.css';

// Common timezones only — full IANA-zone coverage isn't worth the added
// complexity for a birth-details form; this covers the vast majority of
// this site's audience. Offset is "minutes to ADD to local time to get UTC"
// (so IST, UTC+5:30, is -330).
const TIMEZONES = [
  { label: 'India (IST, UTC+5:30)', offset: -330 },
  { label: 'UTC', offset: 0 },
  { label: 'UK (GMT/UTC+0)', offset: 0 },
  { label: 'Central Europe (UTC+1)', offset: -60 },
  { label: 'Dubai (UTC+4)', offset: -240 },
  { label: 'Singapore (UTC+8)', offset: -480 },
  { label: 'US Eastern (UTC-5)', offset: 300 },
  { label: 'US Pacific (UTC-8)', offset: 480 },
];

export interface BirthDetailsSubmitValue extends BirthDetailsInput {
  name: string;
  placeName: string;
}

interface BirthDetailsFormProps {
  onSubmit: (details: BirthDetailsSubmitValue) => void;
  showNameField?: boolean;
  nameLabel?: string;
  submitLabel: string;
  idPrefix: string;
}

export default function BirthDetailsForm({ onSubmit, showNameField = true, nameLabel = 'Full Name', submitLabel, idPrefix }: BirthDetailsFormProps) {
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [tob, setTob] = useState('');
  const [place, setPlace] = useState('');
  const [timezoneOffset, setTimezoneOffset] = useState(TIMEZONES[0].offset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = (!showNameField || name.trim()) && dob && tob && place.trim() && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const geo = await calculatorService.geocode(place.trim());
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
          <input
            id={`${idPrefix}-place`}
            type="text"
            className={`${styles.input} input-field`}
            placeholder="City, Country"
            value={place}
            onChange={e => setPlace(e.target.value)}
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
