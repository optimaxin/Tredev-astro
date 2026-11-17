import React, { useEffect, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { astrologerService, AstrologerApiError, type BoostStatus } from '../../../services/astrologerService';
import { DURATION_OPTIONS, BUFFER_OPTIONS, formatDateShort, SectionHeader, Panel, ConfirmModal } from './shared';
import styles from './sections.module.css';

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const OFFER_OPTIONS = [0, 20, 50, 75] as const;

function OffersAndBoostPanel() {
  const [activeOffer, setActiveOffer] = useState(0);
  const [offerError, setOfferError] = useState('');
  const [offerBusy, setOfferBusy] = useState(false);
  const [boost, setBoost] = useState<BoostStatus | null>(null);
  const [boostBusy, setBoostBusy] = useState(false);
  const [boostError, setBoostError] = useState('');
  const [boostConfirming, setBoostConfirming] = useState(false);

  useEffect(() => {
    astrologerService.getMyProfile().then(p => setActiveOffer(p.activeOfferPercent ?? 0)).catch(() => {});
    astrologerService.getMyBoost().then(setBoost).catch(() => {});
  }, []);

  const selectOffer = async (percent: 0 | 20 | 50 | 75) => {
    setOfferBusy(true);
    setOfferError('');
    try {
      const updated = await astrologerService.setMyOffer(percent);
      setActiveOffer(updated.activeOfferPercent ?? percent);
    } catch (e) {
      setOfferError(e instanceof AstrologerApiError ? e.message : 'Could not update offer');
    } finally {
      setOfferBusy(false);
    }
  };

  const activateBoost = async () => {
    setBoostBusy(true);
    setBoostError('');
    try {
      await astrologerService.activateMyBoost();
      setBoost(await astrologerService.getMyBoost());
      setBoostConfirming(false);
    } catch (e) {
      setBoostError(e instanceof AstrologerApiError ? e.message : 'Could not activate Boost');
    } finally {
      setBoostBusy(false);
    }
  };

  const active = boost?.active;
  const remainingMin = active ? Math.max(0, Math.round((active.endsAt - Date.now()) / 60000)) : 0;
  const keepPercent = boost?.pendingPayoutSharePercent ?? 70;

  return (
    <Panel title="Offers & Boost">
      <div style={{ marginBottom: 18 }}>
        <div className={styles.panelTitle} style={{ marginBottom: 4, fontSize: 12 }}>Discount Offer</div>
        <div className={styles.tableMuted} style={{ marginBottom: 8 }}>
          Loyal users (15+ min of past sessions with you) automatically get half this discount. Whatever is active when a session starts stays locked for that whole session.
        </div>
        <div className={styles.chipRow}>
          {OFFER_OPTIONS.map(p => (
            <button key={p} disabled={offerBusy} className={`${styles.chip} ${activeOffer === p ? styles.chipActive : ''}`} onClick={() => selectOffer(p)}>
              {p === 0 ? 'No offer' : `${p}% OFF`}
            </button>
          ))}
        </div>
        {offerError && <div className={styles.tableMuted} style={{ color: 'var(--danger, #e05252)', marginTop: 8 }}>{offerError}</div>}
      </div>

      <div>
        <div className={styles.panelTitle} style={{ marginBottom: 4, fontSize: 12 }}>Boost</div>
        <div className={styles.tableMuted} style={{ marginBottom: 8 }}>
          30 minutes of extra visibility. Any session that starts in that window — or that a user waitlists for and connects with you within 7 days — pays you a reduced share ({active?.payoutSharePercent ?? keepPercent}%) in exchange. Never changes what the user pays.
        </div>
        {active ? (
          <div className={styles.tablePrimary}>● Boost {active.displayId} active — {remainingMin} min of visibility left</div>
        ) : (
          <button className={styles.btnSm} disabled={boostBusy} onClick={() => setBoostConfirming(true)}>Activate Boost</button>
        )}
        {boostError && <div className={styles.tableMuted} style={{ color: 'var(--danger, #e05252)', marginTop: 8 }}>{boostError}</div>}
        {boostConfirming && (
          <ConfirmModal
            title="Activate Boost?"
            body={(
              <>
                Your profile will jump to the top of listings for 30 minutes.<br /><br />
                On any session this brings you, you'll get <strong>{keepPercent}%</strong> and the platform keeps <strong>{100 - keepPercent}%</strong> — this never changes what the user pays.
              </>
            )}
            confirmLabel="Yes, Activate"
            busy={boostBusy}
            onConfirm={activateBoost}
            onCancel={() => setBoostConfirming(false)}
          />
        )}
        {!!boost?.history.length && (
          <div style={{ marginTop: 12 }}>
            <div className={styles.panelTitle} style={{ marginBottom: 6, fontSize: 12 }}>Boost History</div>
            {boost.history.map(b => (
              <div key={b.id} className={styles.tableMuted}>{b.displayId} · {new Date(b.startedAt).toLocaleString()} · {b.payoutSharePercent}% share</div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

export default function Availability() {
  const { currentUser, availability, setAvailabilityStatus, updateAvailability, blockedSlots, addBlockedSlot, removeBlockedSlot } = useAppContext();
  const [slotForm, setSlotForm] = useState({ start: '', end: '' });
  const [blockForm, setBlockForm] = useState({ date: '', start: '', end: '', reason: '' });
  const isSuspended = currentUser?.status === 'SUSPENDED';
  const accepting = availability.status !== 'OFFLINE';

  const toggleWorkingDay = (day: number) => {
    const next = availability.workingDays.includes(day) ? availability.workingDays.filter(d => d !== day) : [...availability.workingDays, day].sort();
    updateAvailability({ workingDays: next });
  };

  return (
    <div>
      <SectionHeader title="Availability" subtitle="Configure your working hours and consultation scheduling rules." />

      {isSuspended && (
        <Panel><span className={styles.tableMuted}>Your account is suspended — you cannot accept new bookings until it is reactivated.</span></Panel>
      )}

      <Panel title="Accepting New Consultations">
        <div className={styles.toggleRow} style={{ borderTop: 'none', paddingTop: 0 }}>
          <div>
            <div className={styles.tablePrimary}>{accepting ? '● Accepting consultations' : '○ Not accepting consultations'}</div>
            <div className={styles.tableMuted}>Turn this off to pause new bookings without changing your weekly schedule.</div>
          </div>
          <button
            className={`${styles.toggleSwitch} ${accepting && !isSuspended ? styles.toggleOn : ''}`}
            disabled={isSuspended}
            onClick={() => setAvailabilityStatus(accepting ? 'OFFLINE' : 'AVAILABLE')}
          >
            <span className={styles.toggleKnob} />
          </button>
        </div>
      </Panel>

      <Panel title="Weekly Schedule">
        <div className={styles.scheduleTable}>
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={label} className={styles.scheduleDay}>
              <span className={styles.scheduleDayLabel} onClick={() => toggleWorkingDay(i)} style={{ cursor: 'pointer', opacity: availability.workingDays.includes(i) ? 1 : 0.5 }}>{label}</span>
              {availability.workingDays.includes(i) ? (
                <div className={styles.scheduleSlots}>
                  {availability.slots.map((s, si) => <span key={si} className={styles.scheduleSlot}>{s.start} – {s.end}</span>)}
                </div>
              ) : (
                <span className={styles.scheduleDayOff}>Unavailable</span>
              )}
            </div>
          ))}
        </div>
        <div className={styles.toolbar} style={{ marginTop: 14 }}>
          <input type="time" className="input-field input-cosmos" value={slotForm.start} onChange={e => setSlotForm({ ...slotForm, start: e.target.value })} />
          <input type="time" className="input-field input-cosmos" value={slotForm.end} onChange={e => setSlotForm({ ...slotForm, end: e.target.value })} />
          <button
            className={styles.btnSm}
            disabled={!slotForm.start || !slotForm.end}
            onClick={() => { updateAvailability({ slots: [...availability.slots, slotForm] }); setSlotForm({ start: '', end: '' }); }}
          >
            + Add Slot
          </button>
          {availability.slots.length > 0 && (
            <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => updateAvailability({ slots: availability.slots.slice(0, -1) })}>Remove Last Slot</button>
          )}
        </div>
      </Panel>

      <Panel title="Consultation Settings">
        <div style={{ marginBottom: 14 }}>
          <div className={styles.panelTitle} style={{ marginBottom: 8, fontSize: 12 }}>Consultation Duration</div>
          <div className={styles.chipRow}>
            {DURATION_OPTIONS.map(d => (
              <button key={d} className={`${styles.chip} ${availability.consultationDuration === d ? styles.chipActive : ''}`} onClick={() => updateAvailability({ consultationDuration: d })}>{d} min</button>
            ))}
          </div>
        </div>
        <div>
          <div className={styles.panelTitle} style={{ marginBottom: 8, fontSize: 12 }}>Buffer Between Consultations</div>
          <div className={styles.chipRow}>
            {BUFFER_OPTIONS.map(b => (
              <button key={b} className={`${styles.chip} ${availability.bufferMinutes === b ? styles.chipActive : ''}`} onClick={() => updateAvailability({ bufferMinutes: b })}>{b} min</button>
            ))}
          </div>
        </div>
      </Panel>

      <OffersAndBoostPanel />

      <Panel title="Blocked Time">
        {blockedSlots.length === 0 && <p className={styles.tableMuted}>No blocked time periods.</p>}
        {blockedSlots.map(b => (
          <div key={b.id} className={styles.scheduleDay} style={{ gridTemplateColumns: '1fr auto' }}>
            <span className={styles.tablePrimary}>{formatDateShort(b.date)} · {b.start}–{b.end} · {b.reason}</span>
            <button className={`${styles.iconBtn} ${styles.btnDanger}`} onClick={() => removeBlockedSlot(b.id)}>Remove</button>
          </div>
        ))}
        <div className={styles.toolbar} style={{ marginTop: 14 }}>
          <input type="date" className="input-field input-cosmos" value={blockForm.date} onChange={e => setBlockForm({ ...blockForm, date: e.target.value })} />
          <input type="time" className="input-field input-cosmos" value={blockForm.start} onChange={e => setBlockForm({ ...blockForm, start: e.target.value })} />
          <input type="time" className="input-field input-cosmos" value={blockForm.end} onChange={e => setBlockForm({ ...blockForm, end: e.target.value })} />
          <input type="text" className="input-field input-cosmos" placeholder="Reason (private)" value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })} />
          <button
            className={styles.btnSm}
            disabled={!blockForm.date || !blockForm.start || !blockForm.end}
            onClick={() => { addBlockedSlot(blockForm); setBlockForm({ date: '', start: '', end: '', reason: '' }); }}
          >
            Block Time
          </button>
        </div>
      </Panel>
    </div>
  );
}
