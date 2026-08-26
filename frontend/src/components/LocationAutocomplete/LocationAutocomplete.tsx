import React, { useEffect, useRef, useState } from 'react';
import { calculatorService } from '../../services/calculatorService';
import type { PlaceSuggestion } from '../../services/calculatorService';
import { MapPinIcon } from '../Icons/Icons';
import styles from './LocationAutocomplete.module.css';

interface LocationAutocompleteProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: PlaceSuggestion) => void;
  placeholder?: string;
  className?: string;
}

// A plain free-text place field means the exact spelling/phrasing someone
// types has to survive a single geocode guess at submit time — get it
// wrong and the chart silently uses the wrong coordinates. Suggesting real,
// disambiguated places as they type (each already carrying its own exact
// lat/lng) lets them pick a specific place instead of hoping their typing
// resolves correctly later.
export default function LocationAutocomplete({ id, value, onChange, onSelect, placeholder, className }: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<number | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (v: string) => {
    onChange(v);
    setActiveIndex(-1);
    if (debounceRef.current) window.clearTimeout(debounceRef.current);

    const trimmed = v.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = window.setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const results = await calculatorService.placeSuggest(trimmed);
        // A slower, stale request landing after a newer one would otherwise
        // clobber the list currently matching what's in the box.
        if (requestId !== requestIdRef.current) return;
        setSuggestions(results);
        setOpen(results.length > 0);
      } catch {
        if (requestId !== requestIdRef.current) return;
        setSuggestions([]);
        setOpen(false);
      }
    }, 300);
  };

  const selectSuggestion = (s: PlaceSuggestion) => {
    onSelect(s);
    setOpen(false);
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={styles.wrap} ref={wrapRef}>
      <input
        id={id}
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
        onKeyDown={handleKeyDown}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-controls={`${id}-suggestions`}
        aria-autocomplete="list"
      />
      {open && (
        <ul className={styles.dropdown} id={`${id}-suggestions`} role="listbox">
          {suggestions.map((s, i) => (
            <li key={`${s.label}-${i}`} role="option" aria-selected={i === activeIndex}>
              <button
                type="button"
                className={`${styles.item} ${i === activeIndex ? styles.itemActive : ''}`}
                onMouseDown={e => e.preventDefault()}
                onClick={() => selectSuggestion(s)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <MapPinIcon size={15} className={styles.itemIcon} />
                <span>{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
