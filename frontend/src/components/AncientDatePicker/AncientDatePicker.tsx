import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './AncientDatePicker.module.css';

interface AncientDatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function AncientDatePicker({
  value,
  onChange,
  required = false,
  className = '',
  placeholder = 'Select Date'
}: AncientDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // The dropdown is portaled to <body> (see render below) so it can never be
  // clipped by an ancestor's `overflow: hidden` — e.g. a rounded card that
  // clips its own contents to its corners. Its position is computed from the
  // trigger's real screen position instead of relying on CSS `position:
  // absolute` within a (possibly clipped) parent.
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);

  // Parse initial date or default to today
  const initialDate = value ? new Date(value) : new Date();
  const [selectedYear, setSelectedYear] = useState(initialDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialDate.getMonth());

  // Close when clicking outside (checking both the trigger AND the portaled dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => {
    if (!isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left + rect.width / 2 });
    }
    setIsOpen(prev => !prev);
  };

  // Sync state if value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setSelectedYear(d.getFullYear());
        setSelectedMonth(d.getMonth());
      }
    }
  }, [value]);

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const firstDay = getFirstDayOfMonth(selectedMonth, selectedYear);

  // Generate Year Options: 1940 to current year + 5
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 5; y >= 1940; y--) {
    years.push(y);
  }

  const handleDayClick = (day: number) => {
    const formattedMonth = String(selectedMonth + 1).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');
    const dateStr = `${selectedYear}-${formattedMonth}-${formattedDay}`;
    onChange(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(prev => prev - 1);
    } else {
      setSelectedMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(prev => prev + 1);
    } else {
      setSelectedMonth(prev => prev + 1);
    }
  };

  const formatDateDisplay = (val: string) => {
    if (!val) return '';
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return val;
  };

  // Generate day grid
  const days: (number | null)[] = [];
  // Add empty slots for offset
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Add days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Check if a day is currently selected
  const isSelected = (day: number) => {
    if (!value) return false;
    const d = new Date(value);
    return (
      d.getDate() === day &&
      d.getMonth() === selectedMonth &&
      d.getFullYear() === selectedYear
    );
  };

  const dropdown = isOpen && coords ? createPortal(
    <div
      ref={dropdownRef}
      className={styles.calendarDropdown}
      style={{ position: 'fixed', top: coords.top, left: coords.left, transform: 'translateX(-50%)', margin: 0 }}
    >
      {/* Header selectors */}
      <div className={styles.calendarHeader}>
        <button type="button" className={styles.navBtn} onClick={handlePrevMonth}>◀</button>
        <div className={styles.selectors}>
          <select
            className={styles.select}
            value={selectedMonth}
            onChange={e => setSelectedMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={selectedYear}
            onChange={e => setSelectedYear(Number(e.target.value))}
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button type="button" className={styles.navBtn} onClick={handleNextMonth}>▶</button>
      </div>

      {/* Days of week */}
      <div className={styles.daysOfWeekGrid}>
        {DAYS_OF_WEEK.map(d => (
          <div key={d} className={styles.dayOfWeekHeader}>{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className={styles.daysGrid}>
        {days.map((day, idx) => {
          if (day === null) {
            return <div key={`empty-${idx}`} className={styles.emptyDay} />;
          }
          const selected = isSelected(day);
          return (
            <button
              key={`day-${day}`}
              type="button"
              className={`${styles.dayButton} ${selected ? styles.selectedDay : ''}`}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={styles.datePickerContainer} ref={containerRef}>
      <div className={styles.inputWrapper} onClick={toggleOpen}>
        <input
          type="text"
          readOnly
          className={className}
          value={formatDateDisplay(value)}
          placeholder={placeholder}
          required={required}
        />
        <span className={styles.calendarIcon}>📅</span>
      </div>
      {dropdown}
    </div>
  );
}
