import { useState } from 'react';
import type { ReactNode } from 'react';
import type { ApiChatAudit, ApiLastAction } from '../../services/adminService';
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
  // Live realtime availability (see ApiAstrologerStatus) — distinct from
  // account status above.
  online_available: 'success',
  online_busy: 'info',
  away: 'gold',
  offline: 'muted',
  // Offer/Boost badges (Astrologers page) — see boostRepository.ts /
  // pricingEngine.ts.
  boost_active: 'success',
  offer_active: 'gold',
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

/* ---------- ToggleSwitch ---------- */
interface ToggleSwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function ToggleSwitch({ checked, onChange, label, disabled }: ToggleSwitchProps) {
  return (
    <label className={`${styles.toggleRow} ${disabled ? styles.toggleRowDisabled : ''}`}>
      {label && <span className={styles.toggleLabel}>{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`${styles.toggleSwitch} ${checked ? styles.toggleSwitchOn : ''}`}
        onClick={() => !disabled && onChange(!checked)}
      >
        <span className={styles.toggleKnob} />
      </button>
    </label>
  );
}

/* ---------- ChatAuditPanel (Users/Astrologers drawer — chat audit + raise-warning) ---------- */
// What a Staff/Admin reviewer sees when auditing a user or astrologer:
// who they last talked to and what was said (recentChats), the most recent
// admin-logged action against them (lastAction), and a free-text note they
// can raise as a warning — which reuses the existing generic audit-log note
// endpoint (adminService.logNote) rather than a new "warnings" table, so
// raised warnings already show up in the Audit Logs page for free.
interface ChatAuditPanelProps {
  recentChats: ApiChatAudit[] | null;
  lastAction: ApiLastAction | null;
  loadError?: string;
  onRaiseWarning: (note: string) => Promise<void>;
}

export function ChatAuditPanel({ recentChats, lastAction, loadError, onRaiseWarning }: ChatAuditPanelProps) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!note.trim()) return;
    setBusy(true);
    setError('');
    try {
      await onRaiseWarning(note.trim());
      setNote('');
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not raise this warning.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 10 }}>Last action</div>
      <p style={{ fontSize: '0.84rem', color: 'var(--adm-charcoal-soft)', marginBottom: 24 }}>
        {lastAction ? `${lastAction.action} — ${new Date(lastAction.at).toLocaleString()}` : 'No logged actions yet.'}
      </p>

      <div style={{ fontWeight: 700, fontSize: '0.84rem', marginBottom: 12 }}>Recent chats</div>
      {loadError && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.8rem' }}>{loadError}</p>}
      {!loadError && recentChats && recentChats.length === 0 && (
        <p style={{ fontSize: '0.84rem', color: 'var(--adm-charcoal-soft)' }}>No consultations yet.</p>
      )}
      {!loadError && recentChats === null && <p style={{ fontSize: '0.84rem', color: 'var(--adm-charcoal-soft)' }}>Loading…</p>}
      {recentChats?.map(chat => (
        <div key={chat.consultationId} style={{ border: '1px solid var(--adm-border, #e5e0d8)', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <div style={{ fontSize: '0.84rem', fontWeight: 700, marginBottom: 8 }}>{chat.partnerName} <span style={{ fontWeight: 400, color: 'var(--adm-charcoal-soft)' }}>· {chat.type} · {chat.status}</span></div>
          <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {chat.messages.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--adm-charcoal-soft)' }}>No messages.</p>}
            {chat.messages.map((m, i) => (
              <div key={i} style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                <strong>{m.senderRole === 'ASTROLOGIST' ? 'Astrologer' : 'User'}:</strong> {m.messageType === 'TEXT' ? m.content : `[${m.messageType.toLowerCase()}]`}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ fontWeight: 700, fontSize: '0.84rem', marginTop: 24, marginBottom: 10 }}>Raise a warning</div>
      <textarea
        style={{ width: '100%', minHeight: 90, fontFamily: 'inherit', fontSize: '0.84rem', padding: 12, boxSizing: 'border-box' }}
        value={note}
        onChange={e => { setNote(e.target.value); setSent(false); }}
        placeholder="Describe the miscommunication or issue noticed…"
      />
      <div style={{ marginTop: 10 }}>
        <AdminButton variant="danger" disabled={busy || !note.trim()} onClick={submit}>{busy ? '…' : 'Raise warning'}</AdminButton>
      </div>
      {sent && <p style={{ color: 'var(--adm-success, #2e7d32)', fontSize: '0.8rem', marginTop: 8 }}>Warning logged to the audit trail.</p>}
      {error && <p style={{ color: 'var(--adm-danger, #c0392b)', fontSize: '0.8rem', marginTop: 8 }}>{error}</p>}
    </div>
  );
}

/* ---------- Buttons (shared, not spec-named but avoids re-styling per page) ---------- */
export function AdminButton({ children, variant = 'outline', ...rest }: { children: ReactNode; variant?: 'gold' | 'outline' | 'danger' } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const cls = variant === 'gold' ? styles.btnGold : variant === 'danger' ? styles.btnDanger : styles.btnOutline;
  return <button className={`${styles.btn} ${cls}`} {...rest}>{children}</button>;
}
