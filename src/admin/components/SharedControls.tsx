import type { ReactNode } from 'react';
import styles from './SharedControls.module.css';

/* ---------- StatCard ---------- */
interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  trend?: { value: string; positive: boolean };
}

export function StatCard({ icon, label, value, trend }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statTop}>
        <span className={styles.statIcon}>{icon}</span>
        {trend && (
          <span className={`${styles.statTrend} ${trend.positive ? styles.statTrendUp : styles.statTrendDown}`}>
            {trend.positive ? '▲' : '▼'} {trend.value}
          </span>
        )}
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

/* ---------- StatusBadge ---------- */
const STATUS_VARIANT: Record<string, keyof typeof VARIANT_CLASS> = {
  pending: 'gold',
  approved: 'success',
  active: 'success',
  completed: 'success',
  paid: 'success',
  delivered: 'success',
  rejected: 'danger',
  suspended: 'danger',
  cancelled: 'danger',
  unpaid: 'danger',
  upcoming: 'info',
  live: 'info',
  processing: 'info',
  shipped: 'info',
};

const VARIANT_CLASS = {
  gold: styles.badgeGold,
  success: styles.badgeSuccess,
  danger: styles.badgeDanger,
  info: styles.badgeInfo,
  muted: styles.badgeMuted,
};

interface StatusBadgeProps {
  status: string;
  label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const variant = STATUS_VARIANT[status.toLowerCase()] || 'muted';
  return <span className={`${styles.badge} ${VARIANT_CLASS[variant]}`}>{label || status}</span>;
}

/* ---------- EmptyState ---------- */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = '✦', title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>{icon}</div>
      <div className={styles.emptyTitle}>{title}</div>
      {description && <div className={styles.emptyDesc}>{description}</div>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

/* ---------- ConfirmDialog ---------- */
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, variant = 'default', onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className={styles.dialogOverlay} onClick={onCancel}>
      <div className={styles.dialogBox} onClick={e => e.stopPropagation()}>
        <div className={styles.dialogTitle}>{title}</div>
        {description && <div className={styles.dialogDesc}>{description}</div>}
        <div className={styles.dialogActions}>
          <button className={`${styles.btn} ${styles.btnOutline}`} onClick={onCancel}>{cancelLabel}</button>
          <button className={`${styles.btn} ${variant === 'danger' ? styles.btnDanger : styles.btnGold}`} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- ActivityTimeline ---------- */
export interface TimelineItem {
  id: string;
  icon?: ReactNode;
  text: string;
  at: string;
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  return (
    <div className={styles.timeline}>
      {items.map(item => (
        <div key={item.id} className={styles.timelineItem}>
          <span className={styles.timelineDot}>{item.icon || '✦'}</span>
          <div>
            <div className={styles.timelineText}>{item.text}</div>
            <div className={styles.timelineTime}>{item.at}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- FilterBar ---------- */
export interface FilterOption {
  key: string;
  label: string;
}

interface FilterBarProps {
  filters: FilterOption[];
  active: string;
  onChange: (key: string) => void;
}

export function FilterBar({ filters, active, onChange }: FilterBarProps) {
  return (
    <div className={styles.filterBar}>
      {filters.map(f => (
        <button
          key={f.key}
          className={`${styles.filterChip} ${active === f.key ? styles.filterChipActive : ''}`}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- SearchInput ---------- */
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
  return (
    <label className={styles.searchInput}>
      <span className={styles.searchIcon}>⌕</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

/* ---------- Buttons (shared, not spec-named but avoids re-styling per page) ---------- */
export function AdminButton({ children, variant = 'outline', ...rest }: { children: ReactNode; variant?: 'gold' | 'outline' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = variant === 'gold' ? styles.btnGold : variant === 'danger' ? styles.btnDanger : styles.btnOutline;
  return <button className={`${styles.btn} ${cls}`} {...rest}>{children}</button>;
}
