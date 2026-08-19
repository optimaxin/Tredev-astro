import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { ASTROLOGERS } from '../../../data/mockData';
import { formatDateShort, EmptyState, SectionHeader, Panel, RatingBars } from './shared';
import styles from './sections.module.css';

export default function Reviews() {
  const { currentUser, astrologerReviews } = useAppContext();
  const profile = ASTROLOGERS.find(a => a.name === currentUser?.name) || ASTROLOGERS[0];

  const counts = [5, 4, 3, 2, 1].map(star => astrologerReviews.filter(r => r.rating === star).length);

  return (
    <div>
      <SectionHeader title="Reviews" subtitle="Client feedback on your consultations." />

      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 34, color: 'var(--text-primary)' }}>★ {profile.rating}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>{profile.reviews.toLocaleString()} reviews</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}><RatingBars counts={counts} /></div>
        </div>
      </Panel>

      <Panel title="Recent Reviews">
        {astrologerReviews.length === 0 ? (
          <EmptyState icon="★" title="No reviews yet" desc="Reviews will appear after completed consultations." />
        ) : (
          astrologerReviews.slice().sort((a, b) => b.at.localeCompare(a.at)).map(r => (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ color: 'var(--gold-primary)', letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className={styles.tableMuted}>{r.clientName} · {formatDateShort(r.at)}</span>
              </div>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{r.text}</p>
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
