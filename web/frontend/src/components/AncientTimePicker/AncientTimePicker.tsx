import React, { useState, useRef, useEffect } from 'react';
import styles from './AncientTimePicker.module.css';

interface AncientTimePickerProps {
  value: string; // "HH:MM" (24-hour format)
  onChange: (val: string) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}

export default function AncientTimePicker({
  value,
  onChange,
  required = false,
  className = '',
  placeholder = 'Select Time'
}: AncientTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to parse 24-hour string "HH:MM"
  const parseTime = (val: string) => {
    if (!val) return { hour: 12, minute: 0, period: 'AM' };
    const parts = val.split(':');
    if (parts.length !== 2) return { hour: 12, minute: 0, period: 'AM' };
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return { hour: 12, minute: 0, period: 'AM' };
    const p = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return { hour: h, minute: m, period: p };
  };

  const { hour, minute, period } = parseTime(value);

  // Local state for edits in dropdown
  const [tempHour, setTempHour] = useState(hour);
  const [tempMinute, setTempMinute] = useState(minute);
  const [tempPeriod, setTempPeriod] = useState(period);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync temp state with incoming value when opening
  useEffect(() => {
    if (isOpen) {
      const parsed = parseTime(value);
      setTempHour(parsed.hour);
      setTempMinute(parsed.minute);
      setTempPeriod(parsed.period);
    }
  }, [isOpen, value]);

  const handleConfirm = () => {
    let h24 = tempHour;
    if (tempPeriod === 'PM' && tempHour < 12) h24 += 12;
    if (tempPeriod === 'AM' && tempHour === 12) h24 = 0;
    const hStr = String(h24).padStart(2, '0');
    const mStr = String(tempMinute).padStart(2, '0');
    onChange(`${hStr}:${mStr}`);
    setIsOpen(false);
  };

  const formatDisplay = (val: string) => {
    if (!val) return '';
    const parsed = parseTime(val);
    const mStr = String(parsed.minute).padStart(2, '0');
    return `${parsed.hour}:${mStr} ${parsed.period}`;
  };

  // Generate lists
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  return (
    <div className={styles.timePickerContainer} ref={containerRef}>
      <div className={styles.inputWrapper} onClick={() => setIsOpen(!isOpen)}>
        <input
          type="text"
          readOnly
          className={className}
          value={formatDisplay(value)}
          placeholder={placeholder}
          required={required}
        />
        <span className={styles.clockIcon}>🕒</span>
      </div>

      {isOpen && (
        <div className={styles.timeDropdown}>
          <div className={styles.timeHeader}>
            <span className={styles.headerTitle}>Select Birth Time</span>
          </div>

          <div className={styles.selectors}>
            {/* Hour select */}
            <div className={styles.selectCol}>
              <span className={styles.selectLabel}>Hour</span>
              <select
                className={styles.select}
                value={tempHour}
                onChange={e => setTempHour(Number(e.target.value))}
              >
                {hours.map(h => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            {/* Minute select */}
            <div className={styles.selectCol}>
              <span className={styles.selectLabel}>Min</span>
              <select
                className={styles.select}
                value={tempMinute}
                onChange={e => setTempMinute(Number(e.target.value))}
              >
                {minutes.map(m => (
                  <option key={m} value={m}>
                    {String(m).padStart(2, '0')}
                  </option>
                ))}
              </select>
            </div>

            {/* Period select */}
            <div className={styles.selectCol}>
              <span className={styles.selectLabel}>AM/PM</span>
              <select
                className={styles.select}
                value={tempPeriod}
                onChange={e => setTempPeriod(e.target.value)}
              >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
              </select>
            </div>
          </div>

          <button type="button" className={styles.confirmBtn} onClick={handleConfirm}>
            Set Time · पुष्टि करें
          </button>
        </div>
      )}
    </div>
  );
}
