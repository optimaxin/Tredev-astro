import type React from 'react';
import type { KundliMatchingReport, DoshaVerdict } from '../../services/calculatorService';
import { ordinal } from './CalculatorPages';
import styles from '../PageRenderer.module.css';

function verdictForScore(total: number): string {
  if (total >= 32) return 'Excellent Match — a highly auspicious pairing by classical Ashtakoot standards.';
  if (total >= 24) return 'Good Match — favourable compatibility with strong long-term potential.';
  if (total >= 18) return 'Average Match — workable, but review the Nadi and Bhakoot scores below with an astrologer.';
  return 'Not Recommended — this pairing scores below the classical minimum (18/36).';
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
      <h3 className={styles.partnerTitle} style={{ border: 'none', marginBottom: '10px' }}>{title}</h3>
      {children}
    </div>
  );
}

function DoshaCard({ label, dosha }: { label: string; dosha: DoshaVerdict }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.03)', borderRadius: '10px', padding: '14px 16px', marginBottom: '10px' }}>
      <p className={styles.reviewText} style={{ margin: '0 0 4px', fontWeight: 600 }}>
        {label}: {dosha.status} ({dosha.points}/{dosha.maxPoints})
        {dosha.status === 'Present' && <> · Severity: {dosha.severity} · Cancellation: {dosha.cancellation}</>}
      </p>
      <p className={styles.reviewText} style={{ margin: 0, color: 'var(--color-text-dark-2)' }}>{dosha.reason}</p>
    </div>
  );
}

export default function KundliMatchingResult({ result, brideName, groomName }: { result: KundliMatchingReport; brideName: string; groomName: string }) {
  const { bride, groom, gunMilan, bhakoot, nadi, planetaryCompatibility, finalAssessment, ayanamsa } = result;

  return (
    <div className={styles.compatibilityResult}>
      <div className={styles.compatHeader}>
        <div>
          <h3 className={styles.partnerTitle} style={{ border: 'none', margin: 0 }}>Guna Milan Result</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', margin: 0 }}>
            Match between {brideName || 'Partner 1'} &amp; {groomName || 'Partner 2'} — {gunMilan.brideMoonRashi} Moon &amp; {gunMilan.groomMoonRashi} Moon · Ayanamsa: {ayanamsa}
          </p>
        </div>
        <div className={styles.scoreCircle}>
          <span className={styles.scoreVal}>{gunMilan.totalPoints}</span>
          <span className={styles.scoreLabel}>Out of 36</span>
        </div>
      </div>

      <div className={styles.compatGrid}>
        {gunMilan.kootas.map(k => (
          <div className={styles.compatBox} key={k.name}>
            <span className={styles.compatLabel}>{k.name}</span>
            <span className={styles.compatVal}>{k.points} / {k.maxPoints}</span>
          </div>
        ))}
      </div>

      <div className={styles.compatVerdict}>
        <strong>Vedic Verdict:</strong> {verdictForScore(gunMilan.totalPoints)}
      </div>

      <Section title="Bhakoot (Rashi) Dosha">
        <DoshaCard label="Bhakoot" dosha={bhakoot} />
      </Section>

      <Section title="Nadi Dosha">
        <DoshaCard label="Nadi" dosha={nadi} />
      </Section>

      <Section title="7th House (Marriage House) Analysis">
        {[
          { label: brideName || 'Partner 1', partner: bride },
          { label: groomName || 'Partner 2', partner: groom },
        ].map(({ label, partner }) => {
          const sh = partner.seventhHouse;
          return (
            <p key={label} className={styles.reviewText} style={{ margin: '4px 0' }}>
              <strong>{label}:</strong> 7th house is {sh.sign}, ruled by {sh.lord}, who sits in {sh.lordSign} ({sh.lordHouse}{ordinal(sh.lordHouse)} house).
              {sh.occupants.length > 0 ? ` Occupied by: ${sh.occupants.join(', ')}.` : ' No planets occupy the 7th house.'}
            </p>
          );
        })}
      </Section>

      <Section title="Navamsa (D9) — Supporting Evidence">
        <p className={styles.reviewText} style={{ margin: '4px 0' }}>
          <strong>{brideName || 'Partner 1'}:</strong> D9 Ascendant is {bride.navamsaChart.ascendant.rashi}.
        </p>
        <p className={styles.reviewText} style={{ margin: '4px 0' }}>
          <strong>{groomName || 'Partner 2'}:</strong> D9 Ascendant is {groom.navamsaChart.ascendant.rashi}.
        </p>
        <p className={styles.reviewText} style={{ margin: '4px 0', color: 'var(--color-text-dark-2)', fontSize: '0.85em' }}>
          Navamsa is used here only as supporting cross-check evidence — it does not override the D1 (Rashi chart) analysis above.
        </p>
      </Section>

      <Section title="Planetary Compatibility">
        {planetaryCompatibility.map(row => (
          <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.06)', flexWrap: 'wrap' }}>
            <span className={styles.reviewText} style={{ margin: 0, flex: '1 1 220px' }}>{row.label}</span>
            <span className={styles.reviewText} style={{ margin: 0, color: 'var(--color-text-dark-2)' }}>
              {row.bride.sign} ↔ {row.groom.sign} — <strong style={{ textTransform: 'capitalize' }}>{row.relation.replace('-', ' ')}</strong>
            </span>
          </div>
        ))}
      </Section>

      <Section title="Vimshottari Dasha Comparison">
        <p className={styles.reviewText} style={{ margin: '4px 0' }}>
          <strong>{brideName || 'Partner 1'}</strong> is currently running {bride.currentMahadasha.lord} Mahadasha.
        </p>
        <p className={styles.reviewText} style={{ margin: '4px 0' }}>
          <strong>{groomName || 'Partner 2'}</strong> is currently running {groom.currentMahadasha.lord} Mahadasha.
        </p>
        <p className={styles.reviewText} style={{ margin: '4px 0', color: 'var(--color-text-dark-2)', fontSize: '0.85em' }}>
          Shown for context only — Dasha comparison does not predict specific marriage dates or outcomes.
        </p>
      </Section>

      <Section title="Final Traditional Assessment">
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <span style={{ display: 'inline-block', padding: '8px 24px', borderRadius: '999px', background: 'var(--color-gold, #c9a24b)', color: '#1a1a1a', fontWeight: 700, letterSpacing: '0.04em' }}>
            {finalAssessment.grade}
          </span>
        </div>
        {finalAssessment.reasoning.map((line, i) => (
          <p key={i} className={styles.reviewText} style={{ margin: '4px 0', color: 'var(--color-text-dark-2)' }}>• {line}</p>
        ))}
      </Section>
    </div>
  );
}
