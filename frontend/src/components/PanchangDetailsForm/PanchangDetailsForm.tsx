import React, { useState } from 'react';
import AncientDatePicker from '../AncientDatePicker/AncientDatePicker';
import LocationAutocomplete from '../LocationAutocomplete/LocationAutocomplete';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { PlaceSuggestion } from '../../services/calculatorService';
// Reuses BirthDetailsForm's styling — same field/grid/button look, just a
// different (shorter) field set: Panchang-family tools need a date and a
// place, not a time of birth.
import styles from '../BirthDetailsForm/BirthDetailsForm.module.css';

export interface PanchangDetailsSubmitValue {
  date: string;
  latitude: number;
  longitude: number;
  placeName: string;
}

interface PanchangDetailsFormProps {
  onSubmit: (details: PanchangDetailsSubmitValue) => void;
  submitLabel: string;
  idPrefix: string;
  defaultDate?: string;
  defaultPlace?: string;
}

export default function PanchangDetailsForm({ onSubmit, submitLabel, idPrefix, defaultDate, defaultPlace = 'New Delhi, India' }: PanchangDetailsFormProps) {
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [place, setPlace] = useState(defaultPlace);
  const [selectedGeo, setSelectedGeo] = useState<PlaceSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canSubmit = date && place.trim() && !loading;

  const handlePlaceChange = (v: string) => {
    setPlace(v);
    setSelectedGeo(null);
  };

  const handlePlaceSelect = (s: PlaceSuggestion) => {
    setPlace(s.label);
    setSelectedGeo(s);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError('');
    setLoading(true);
    try {
      const geo = selectedGeo
        ? { latitude: selectedGeo.latitude, longitude: selectedGeo.longitude, displayName: selectedGeo.label }
        : await calculatorService.geocode(place.trim());
      onSubmit({ date, latitude: geo.latitude, longitude: geo.longitude, placeName: geo.displayName });
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.grid}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-date`}>Date</label>
          <AncientDatePicker className={`${styles.input} input-field`} value={date} onChange={setDate} required placeholder="Select Date" />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={`${idPrefix}-place`}>Place</label>
          <LocationAutocomplete
            id={`${idPrefix}-place`}
            className={`${styles.input} input-field`}
            placeholder="Start typing a city..."
            value={place}
            onChange={handlePlaceChange}
            onSelect={handlePlaceSelect}
          />
        </div>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button type="submit" className={`${styles.submitBtn} btn btn-gold btn-lg`} disabled={!canSubmit}>
        {loading ? 'Looking up...' : submitLabel}
      </button>
    </form>
  );
}
