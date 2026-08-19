import React from 'react';
import { useAppContext } from '../../../context/AppContext';
import { ASTROLOGERS } from '../../../data/mockData';
import { SPECIALIZATION_OPTIONS, LANGUAGE_OPTIONS, SectionHeader, Panel } from './shared';
import styles from './sections.module.css';

export default function ProfileSection() {
  const { currentUser, setPage, setSelectedId, profileOverride, updateProfileOverride } = useAppContext();
  const profile = ASTROLOGERS.find(a => a.name === currentUser?.name) || ASTROLOGERS[0];

  const effectiveSpecialization = profileOverride.specialization.length ? profileOverride.specialization : profile.specialization;
  const effectiveLanguages = profileOverride.languages.length ? profileOverride.languages : profile.languages;
  const effectiveTitle = profileOverride.title || profile.title;

  const completionChecks = [
    { done: !!profileOverride.title.trim(), label: 'Professional title' },
    { done: !!profileOverride.bio.trim(), label: 'Biography' },
    { done: profileOverride.specialization.length > 0, label: 'Consultation categories' },
    { done: profileOverride.languages.length > 0, label: 'Languages' },
    { done: profileOverride.publicVisible, label: 'Public profile' },
  ];
  const completionPct = Math.round((completionChecks.filter(c => c.done).length / completionChecks.length) * 100);
  const missing = completionChecks.filter(c => !c.done).map(c => c.label);

  const toggleSpecialization = (cat: string) => {
    const next = effectiveSpecialization.includes(cat) ? effectiveSpecialization.filter(c => c !== cat) : [...effectiveSpecialization, cat];
    updateProfileOverride({ specialization: next });
  };
  const toggleLanguage = (lang: string) => {
    const next = effectiveLanguages.includes(lang) ? effectiveLanguages.filter(l => l !== lang) : [...effectiveLanguages, lang];
    updateProfileOverride({ languages: next });
  };

  return (
    <div>
      <SectionHeader title="My Profile" subtitle="Manage how clients see you across TredevAstro." />

      <Panel title="Profile Completion" actions={<span style={{ fontWeight: 700, color: 'var(--gold-primary)' }}>{completionPct}%</span>}>
        <div className={styles.progressTrack}><div className={styles.progressFill} style={{ width: `${completionPct}%` }} /></div>
        {missing.length > 0 && <p className={styles.tableMuted} style={{ marginTop: 8 }}>Missing: {missing.join(', ')}</p>}
      </Panel>

      <Panel title="Basic Information">
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Professional Title</label>
          <input className="input-field" value={effectiveTitle} onChange={e => updateProfileOverride({ title: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="form-label">Biography</label>
          <textarea className="input-field" rows={4} value={profileOverride.bio} onChange={e => updateProfileOverride({ bio: e.target.value })} />
        </div>
      </Panel>

      <Panel title="Expertise">
        <div className={styles.chipRow}>
          {SPECIALIZATION_OPTIONS.map(cat => (
            <button key={cat} className={`${styles.chip} ${effectiveSpecialization.includes(cat) ? styles.chipActive : ''}`} onClick={() => toggleSpecialization(cat)}>{cat}</button>
          ))}
        </div>
      </Panel>

      <Panel title="Languages">
        <div className={styles.chipRow}>
          {LANGUAGE_OPTIONS.map(lang => (
            <button key={lang} className={`${styles.chip} ${effectiveLanguages.includes(lang) ? styles.chipActive : ''}`} onClick={() => toggleLanguage(lang)}>{lang}</button>
          ))}
        </div>
      </Panel>

      <Panel title="Experience">
        <div className={styles.statRow}><span className={styles.statRowLabel}>Years of experience</span><span className={styles.statRowValue}>{profile.experience} yrs</span></div>
        <div className="form-group" style={{ marginTop: 8 }}>
          <label className="form-label">Certifications</label>
          <input className="input-field" value={profileOverride.certifications} onChange={e => updateProfileOverride({ certifications: e.target.value })} placeholder="e.g. Jyotish Acharya, ICAS" />
        </div>
      </Panel>

      <Panel title="Services">
        <div className={styles.statRow}><span className={styles.statRowLabel}>Standard duration</span><span className={styles.statRowValue}>{profile.price ? `${profile.price}/min` : '—'}</span></div>
        <p className={styles.tableMuted}>Pricing is set by TredevAstro's platform business rules and can't be edited here.</p>
      </Panel>

      <button className={styles.btnSm} onClick={() => { setSelectedId(profile.id); setPage('astrologer-profile'); }}>View Public Profile</button>
    </div>
  );
}
