import React, { useEffect, useState } from 'react';
import { astrologerService, AstrologerApiError } from '../../../services/astrologerService';
import type { Review } from '../../../services/astrologerService';
import { formatDateShort, EmptyState, SectionHeader, Panel, RatingBars } from './shared';
import styles from './sections.module.css';

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    astrologerService.getMyProfile()
      .then(async profile => {
        setRating(profile.rating);
        setReviews(await astrologerService.listReviews(profile.id));
      })
      .catch(err => setError(err instanceof AstrologerApiError ? err.message : 'Could not load your reviews.'))
      .finally(() => setLoading(false));
  }, []);

  const counts = [5, 4, 3, 2, 1].map(star => reviews.filter(r => r.rating === star).length);

  return (
    <div>
      <SectionHeader title="Reviews" subtitle="Real client feedback on your consultations." />

      {error && <p style={{ color: '#d64545' }}>{error}</p>}

      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 34, color: 'var(--text-primary)' }}>★ {rating}</div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: 12, color: 'var(--text-muted)' }}>{reviews.length.toLocaleString()} reviews</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}><RatingBars counts={counts} /></div>
        </div>
      </Panel>

      <Panel title="Recent Reviews">
        {!loading && reviews.length === 0 ? (
          <EmptyState icon="★" title="No reviews yet" desc="Reviews will appear here after clients complete a consultation with you." />
        ) : (
          reviews.slice().sort((a, b) => b.createdAt - a.createdAt).map(r => (
            <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                <span style={{ color: 'var(--gold-primary)', letterSpacing: 1 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                <span className={styles.tableMuted}>{r.authorName} · {formatDateShort(new Date(r.createdAt).toISOString())}</span>
              </div>
              {r.text && <p style={{ fontFamily: 'var(--font-sans)', fontSize: 13, color: 'var(--text-secondary)' }}>{r.text}</p>}
            </div>
          ))
        )}
      </Panel>
    </div>
  );
}
