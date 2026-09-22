import React, { createContext, useContext } from 'react';
import styles from './sections.module.css';

export type SectionKey =
  | 'overview' | 'calendar' | 'consultations' | 'live-queue' | 'requests' | 'chat-inbox' | 'clients'
  | 'reports' | 'earnings' | 'reviews'
  | 'profile' | 'availability' | 'notifications' | 'settings';

const DashboardNavContext = createContext<{ navigate: (s: SectionKey) => void }>({ navigate: () => {} });
export const DashboardNavProvider = DashboardNavContext.Provider;
export function useDashboardNav() {
  return useContext(DashboardNavContext);
}

export const DAY_MS = 86400000;
export const TYPE_ICON: Record<string, string> = { chat: '💬', voice: '📞', video: '🎥' };
export const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export const SPECIALIZATION_OPTIONS = ['Love', 'Marriage', 'Career', 'Finance', 'Vastu', 'Spirituality'];
export const LANGUAGE_OPTIONS = ['English', 'Hindi', 'Marathi'];
export const DURATION_OPTIONS = [30, 45, 60];
export const BUFFER_OPTIONS = [5, 10, 15];

export function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + DAY_MS);
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isSameDay(d, now)) return `Today, ${time}`;
  if (isSameDay(d, tomorrow)) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${time}`;
}

export function formatDateShort(iso: string) {
  return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  upcoming: { label: 'Upcoming', cls: 'gold' },
  completed: { label: 'Completed', cls: 'green' },
  cancelled: { label: 'Cancelled', cls: 'red' },
  PENDING: { label: 'Pending', cls: 'gold' },
  ACCEPTED: { label: 'Accepted', cls: 'green' },
  DECLINED: { label: 'Declined', cls: 'red' },
  AVAILABLE: { label: 'Available', cls: 'green' },
  BUSY: { label: 'Busy', cls: 'gold' },
  OFFLINE: { label: 'Offline', cls: 'red' },
  PAID: { label: 'Paid', cls: 'green' },
  DRAFT: { label: 'Draft', cls: 'neutral' },
  IN_PROGRESS: { label: 'In Progress', cls: 'gold' },
  SUBMITTED: { label: 'Submitted', cls: 'blue' },
  COMPLETED: { label: 'Completed', cls: 'green' },
};

export function StatusBadge({ status }: { status: string }) {
  const m = STATUS_MAP[status] || { label: status, cls: 'neutral' };
  return <span className={`${styles.badge} ${styles['badge_' + m.cls]}`}>{m.label}</span>;
}

export function EmptyState({ icon, title, desc }: { icon: string; title: string; desc?: string }) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>{icon}</span>
      <div className={styles.emptyTitle}>{title}</div>
      {desc && <p className={styles.emptyDesc}>{desc}</p>}
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <h1 className={styles.sectionTitle}>{title}</h1>
        {subtitle && <p className={styles.sectionSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.sectionActions}>{actions}</div>}
    </div>
  );
}

export function Panel({ title, actions, children, className }: { title?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`${styles.panel} ${className || ''}`}>
      {title && (
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle}>{title}</h3>
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

// Generic "are you sure?" modal — used by the Boost activation confirm
// (Overview.tsx / Availability.tsx), reusable for anything similar later.
export function ConfirmModal({ title, body, confirmLabel = 'Confirm', busy, onConfirm, onCancel }: {
  title: string; body: React.ReactNode; confirmLabel?: string; busy?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className={styles.confirmBackdrop} onClick={onCancel}>
      <div className={styles.confirmCard} onClick={e => e.stopPropagation()}>
        <div className={styles.confirmTitle}>{title}</div>
        <div className={styles.confirmBody}>{body}</div>
        <div className={styles.confirmActions}>
          <button className={styles.iconBtn} onClick={onCancel}>Cancel</button>
          <button className={`${styles.btnSm} ${styles.btnGold}`} disabled={busy} onClick={onConfirm}>{busy ? '…' : confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function KpiCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiLabel}>{label}</div>
      <div className={styles.kpiValue}>{value}</div>
      {hint && <div className={styles.kpiHint}>{hint}</div>}
    </div>
  );
}

export function MiniBarChart({ data }: { data: { label: string; value: number }[] }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className={styles.barChart}>
      {data.map(d => (
        <div key={d.label} className={styles.barCol}>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ height: `${Math.max(4, (d.value / max) * 100)}%` }} title={`₹${d.value}`} />
          </div>
          <span className={styles.barLabel}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function RatingBars({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className={styles.ratingBars}>
      {[5, 4, 3, 2, 1].map((star, i) => (
        <div key={star} className={styles.ratingRow}>
          <span className={styles.ratingStarLabel}>{star} ★</span>
          <div className={styles.ratingTrack}>
            <div className={styles.ratingFill} style={{ width: `${(counts[i] / total) * 100}%` }} />
          </div>
          <span className={styles.ratingCount}>{counts[i]}</span>
        </div>
      ))}
    </div>
  );
}
