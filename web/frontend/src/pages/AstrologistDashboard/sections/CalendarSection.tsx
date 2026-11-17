import React, { useMemo, useState } from 'react';
import { useAppContext } from '../../../context/AppContext';
import { DAY_MS, TYPE_ICON, isSameDay, formatTime, EmptyState, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

const HOURS = Array.from({ length: 13 }, (_, i) => 8 + i); // 08:00–20:00

function getWeekStart(d: Date) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

export default function CalendarSection() {
  const { consultations, blockedSlots, addBlockedSlot } = useAppContext();
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(new Date());
  const [showBlockForm, setShowBlockForm] = useState(false);
  const [blockForm, setBlockForm] = useState({ date: '', start: '', end: '', reason: '' });

  const weekStart = useMemo(() => getWeekStart(anchor), [anchor]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY_MS)), [weekStart]);

  const eventsInWeek = consultations.filter(c => {
    const d = new Date(c.scheduledAt);
    return d.getTime() >= weekStart.getTime() && d.getTime() < weekStart.getTime() + 7 * DAY_MS;
  });
  const blockedInWeek = blockedSlots.filter(b => {
    const d = new Date(b.date);
    return d.getTime() >= weekStart.getTime() && d.getTime() < weekStart.getTime() + 7 * DAY_MS;
  });

  const dayEvents = consultations.filter(c => isSameDay(new Date(c.scheduledAt), anchor)).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
  const dayBlocked = blockedSlots.filter(b => isSameDay(new Date(b.date), anchor));

  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthGridStart = getWeekStart(monthStart);
  const monthCells = Array.from({ length: 42 }, (_, i) => new Date(monthGridStart.getTime() + i * DAY_MS));

  const shiftWeek = (dir: number) => setAnchor(new Date(anchor.getTime() + dir * 7 * DAY_MS));
  const shiftDay = (dir: number) => setAnchor(new Date(anchor.getTime() + dir * DAY_MS));

  return (
    <div>
      <SectionHeader
        title="Calendar"
        subtitle={anchor.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        actions={
          <>
            {(['day', 'week', 'month'] as const).map(v => (
              <button key={v} className={`${styles.btnSm} ${view === v ? styles.btnGold : ''}`} onClick={() => setView(v)}>{v[0].toUpperCase() + v.slice(1)}</button>
            ))}
            <button className={styles.btnSm} onClick={() => setAnchor(new Date())}>Today</button>
            <button className={styles.btnSm} onClick={() => setShowBlockForm(v => !v)}>+ Block Time</button>
          </>
        }
      />

      {showBlockForm && (
        <Panel title="Block Time">
          <div className={styles.toolbar}>
            <input type="date" className="input-field input-cosmos" value={blockForm.date} onChange={e => setBlockForm({ ...blockForm, date: e.target.value })} />
            <input type="time" className="input-field input-cosmos" value={blockForm.start} onChange={e => setBlockForm({ ...blockForm, start: e.target.value })} />
            <input type="time" className="input-field input-cosmos" value={blockForm.end} onChange={e => setBlockForm({ ...blockForm, end: e.target.value })} />
            <input type="text" className="input-field input-cosmos" placeholder="Reason (private)" value={blockForm.reason} onChange={e => setBlockForm({ ...blockForm, reason: e.target.value })} />
            <button
              className={`${styles.btnSm} ${styles.btnGold}`}
              disabled={!blockForm.date || !blockForm.start || !blockForm.end}
              onClick={() => { addBlockedSlot(blockForm); setBlockForm({ date: '', start: '', end: '', reason: '' }); setShowBlockForm(false); }}
            >
              Add
            </button>
          </div>
        </Panel>
      )}

      {view === 'week' && (
        <Panel>
          <div className={styles.toolbar} style={{ justifyContent: 'space-between' }}>
            <button className={styles.iconBtn} onClick={() => shiftWeek(-1)}>← Previous</button>
            <button className={styles.iconBtn} onClick={() => shiftWeek(1)}>Next →</button>
          </div>
          <div className={styles.calWeekGrid}>
            <div className={styles.calHeaderCell} />
            {weekDays.map(d => (
              <div key={d.toISOString()} className={styles.calHeaderCell}>{d.toLocaleDateString([], { weekday: 'short' })} {d.getDate()}</div>
            ))}
            {HOURS.map(hour => (
              <React.Fragment key={hour}>
                <div className={styles.calHourLabel}>{hour}:00</div>
                {weekDays.map(d => {
                  const hourEvents = eventsInWeek.filter(c => { const cd = new Date(c.scheduledAt); return isSameDay(cd, d) && cd.getHours() === hour; });
                  const hourBlocked = blockedInWeek.filter(b => isSameDay(new Date(b.date), d) && Number(b.start.split(':')[0]) === hour);
                  return (
                    <div key={d.toISOString() + hour} className={styles.calCell}>
                      {hourEvents.map(ev => (
                        <div key={ev.id} className={styles.calBlock} title={`${ev.clientName} · ${ev.service}`}>{TYPE_ICON[ev.type]} {ev.clientName}</div>
                      ))}
                      {hourBlocked.map(b => (
                        <div key={b.id} className={`${styles.calBlock} ${styles.calBlockBlocked}`} title={b.reason}>Blocked</div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </Panel>
      )}

      {view === 'day' && (
        <Panel title={anchor.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          actions={<div style={{ display: 'flex', gap: 6 }}><button className={styles.iconBtn} onClick={() => shiftDay(-1)}>←</button><button className={styles.iconBtn} onClick={() => shiftDay(1)}>→</button></div>}
        >
          {dayEvents.length === 0 && dayBlocked.length === 0 ? (
            <EmptyState icon="☉" title="Nothing scheduled" desc="No consultations or blocked time for this day." />
          ) : (
            <div className={styles.timeline}>
              {dayEvents.map(c => (
                <div key={c.id} className={styles.timelineRow}>
                  <span className={styles.timelineTime}>{formatTime(c.scheduledAt)}</span>
                  <div className={styles.timelineDotWrap}><span className={`${styles.timelineDot} ${styles['timelineDot_' + c.status]}`} /></div>
                  <div>
                    <div className={styles.timelineClient}>{TYPE_ICON[c.type]} {c.clientName}</div>
                    <div className={styles.timelineMeta}>{c.service} · {c.duration} min</div>
                  </div>
                  <span className={styles.tableMuted}>{c.status}</span>
                </div>
              ))}
              {dayBlocked.map(b => (
                <div key={b.id} className={styles.timelineRow}>
                  <span className={styles.timelineTime}>{b.start}</span>
                  <div className={styles.timelineDotWrap}><span className={styles.timelineDot} /></div>
                  <div><div className={styles.timelineClient}>Blocked</div><div className={styles.timelineMeta}>{b.start}–{b.end} · {b.reason}</div></div>
                  <span />
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {view === 'month' && (
        <Panel>
          <div className={styles.calMonthGrid}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d} className={styles.calHeaderCell}>{d}</div>)}
            {monthCells.map(d => {
              const inMonth = d.getMonth() === anchor.getMonth();
              const count = consultations.filter(c => isSameDay(new Date(c.scheduledAt), d)).length;
              return (
                <div key={d.toISOString()} className={`${styles.calMonthCell} ${!inMonth ? styles.calMonthCellMuted : ''}`} onClick={() => { setAnchor(d); setView('day'); }}>
                  {d.getDate()}
                  {count > 0 && <div className={styles.calMonthDot}>{count}</div>}
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
