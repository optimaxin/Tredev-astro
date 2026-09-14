// Extracted from PageRenderer.tsx so the calculator UIs can be reused
// outside the main site's router (see ganesh-chaturthi campaign app) without
// pulling in the rest of the site. The only thing these ever needed from
// AppContext was `currentUser`, for prefilling a logged-in user's saved
// birth details — now passed in as a prop instead, so this file has zero
// dependency on AppContext itself.
import React, { useState, useEffect, useRef } from 'react';
import type { AuthUser } from '../../context/AppContext';
import { PLANET_META } from '../../data/planetMeta';
import PlanetIcon from '../../components/PlanetIcon/PlanetIcon';
import { HOUSE_MEANINGS } from '../../data/mockData';
import styles from '../PageRenderer.module.css';
import AncientDatePicker from '../../components/AncientDatePicker/AncientDatePicker';
import AncientTimePicker from '../../components/AncientTimePicker/AncientTimePicker';
import BirthDetailsForm from '../../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../components/BirthDetailsForm/BirthDetailsForm';
import PanchangDetailsForm from '../../components/PanchangDetailsForm/PanchangDetailsForm';
import type { PanchangDetailsSubmitValue } from '../../components/PanchangDetailsForm/PanchangDetailsForm';
import LocationAutocomplete from '../../components/LocationAutocomplete/LocationAutocomplete';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { BabyNameResult, ChineseZodiacResult, DailyHoroscopeResult, FlamesOutcome, GeocodeResult, HoroscopePeriodResult, KaalSarpDoshaResult, KundliMatchingReport, KundliResult, LalKitabResult, LuckyAttributes, NakshatraResult, NumerologyMatchResult, NumerologyResult, PanchangResult, PersonalNumerologyCycle, RahuKetuTransitResult, SadeSatiResult } from '../../services/calculatorService';
import KundliMatchingResult from './KundliMatchingResult';
import { formatIst } from '../../utils/istTime';
import { toSavedBirthDetails } from '../../utils/birthDetails';

type MaybeUser = AuthUser | null | undefined;

/* ====================================================
   SUB-PAGE COMPONENTS
   ==================================================== */

// 1. Horoscope Page
// Classical Naisargika (natural) benefic/malefic classification — a real,
// standard Vedic categorization, not an invented one. Mercury is naturally
// neutral (its nature follows whichever planet it's conjunct/aspected by),
// so it gets neither color.
const NATURAL_BENEFIC = new Set(['jupiter', 'venus', 'moon']);
const NATURAL_MALEFIC = new Set(['saturn', 'mars', 'sun', 'rahu', 'ketu']);

const HOROSCOPE_PERIODS: { key: 'daily' | 'weekly' | 'weekly-love' | 'monthly' | 'half-year' | 'full-year'; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'weekly-love', label: 'Weekly Love' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'half-year', label: 'Half-Year' },
  { key: 'full-year', label: 'Full Year' },
];

export function HoroscopePage() {
  const [activeRashi, setActiveRashi] = useState(0);
  const [period, setPeriod] = useState<typeof HOROSCOPE_PERIODS[number]['key']>('daily');
  const [transitData, setTransitData] = useState<DailyHoroscopeResult | HoroscopePeriodResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const RASHIS = [
    { name: 'Mesha', eng: 'Aries', element: 'Fire', graha: 'Mars', index: 1 },
    { name: 'Vrishabha', eng: 'Taurus', element: 'Earth', graha: 'Venus', index: 2 },
    { name: 'Mithuna', eng: 'Gemini', element: 'Air', graha: 'Mercury', index: 3 },
    { name: 'Karka', eng: 'Cancer', element: 'Water', graha: 'Moon', index: 4 },
    { name: 'Simha', eng: 'Leo', element: 'Fire', graha: 'Sun', index: 5 },
    { name: 'Kanya', eng: 'Virgo', element: 'Earth', graha: 'Mercury', index: 6 },
    { name: 'Tula', eng: 'Libra', element: 'Air', graha: 'Venus', index: 7 },
    { name: 'Vrischika', eng: 'Scorpio', element: 'Water', graha: 'Mars', index: 8 },
    { name: 'Dhanu', eng: 'Sagittarius', element: 'Fire', graha: 'Jupiter', index: 9 },
    { name: 'Makara', eng: 'Capricorn', element: 'Earth', graha: 'Saturn', index: 10 },
    { name: 'Kumbha', eng: 'Aquarius', element: 'Air', graha: 'Saturn', index: 11 },
    { name: 'Meena', eng: 'Pisces', element: 'Water', graha: 'Jupiter', index: 12 },
  ];

  const current = RASHIS[activeRashi];

  useEffect(() => {
    setError('');
    setLoading(true);
    const request = period === 'daily'
      ? calculatorService.dailyHoroscope(current.eng)
      : calculatorService.horoscopePeriod(current.eng, period === 'weekly-love' ? 'weekly' : period);
    request
      .then(setTransitData)
      .catch(err => setError(err instanceof CalculatorApiError ? err.message : 'Could not load transits. Please try again.'))
      .finally(() => setLoading(false));
  }, [current.eng, period]);

  const sortedTransits = transitData ? [...transitData.transits].sort((a, b) => a.house - b.house) : [];
  const focusPlanet = sortedTransits.find(t => t.house === 1);
  const upcomingTransits = transitData && 'upcomingTransits' in transitData ? transitData.upcomingTransits : [];
  const venusTransit = sortedTransits.find(t => t.id === 'venus');

  return (
    <div className={`${styles.pageWrapper} ${styles.darkPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Rashi Rashiphal</span>
          <h1 className={styles.pageTitle}>Free Horoscopes</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle}>
            Real, freshly-computed planetary transits, read against your Moon Sign — not a canned prediction.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', marginTop: '18px' }}>
            {HOROSCOPE_PERIODS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPeriod(p.key)}
                className="btn"
                style={{
                  padding: '6px 16px', borderRadius: '999px', fontSize: '13px',
                  background: period === p.key ? 'var(--gold-primary)' : 'transparent',
                  color: period === p.key ? '#1a1108' : 'var(--color-text-dark-2)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.horoscopeLayout}>
          {/* Wheel Selector — a real 12-segment zodiac ring (wedges radiating
              from a center hub, like a printed horoscope wheel) instead of
              12 loose circles floating around a rim, which read as a rotary
              phone dial rather than an astrological chart. */}
          <div className={styles.wheelColumn}>
            <div className={styles.zodiacWheelWrap}>
              <svg viewBox="0 0 400 400" className={styles.zodiacWheelSvg}>
                <circle cx="200" cy="200" r="190" className={styles.wheelRimOuter} />
                <circle cx="200" cy="200" r="106" className={styles.wheelRimInner} />
                {/* Degree tick marks — 3 per sign (every 10°), the fine
                    graduated-rim detail a real horoscope wheel has. */}
                {Array.from({ length: 36 }, (_, t) => {
                  const deg = t * 10 - 90;
                  const rad = (deg * Math.PI) / 180;
                  const long = t % 3 === 0;
                  const r1 = long ? 178 : 184;
                  return (
                    <line
                      key={t}
                      x1={200 + Math.cos(rad) * r1} y1={200 + Math.sin(rad) * r1}
                      x2={200 + Math.cos(rad) * 190} y2={200 + Math.sin(rad) * 190}
                      className={styles.wheelTick}
                    />
                  );
                })}
                {RASHIS.map((r, i) => {
                  const startDeg = i * 30 - 90;
                  const endDeg = startDeg + 30;
                  const midRad = ((startDeg + 15) * Math.PI) / 180;
                  const p = (deg: number, radius: number) => {
                    const rad = (deg * Math.PI) / 180;
                    return [200 + Math.cos(rad) * radius, 200 + Math.sin(rad) * radius];
                  };
                  const [x1, y1] = p(startDeg, 190);
                  const [x2, y2] = p(endDeg, 190);
                  const [x3, y3] = p(endDeg, 106);
                  const [x4, y4] = p(startDeg, 106);
                  const wedgePath = `M${x1},${y1} A190,190 0 0 1 ${x2},${y2} L${x3},${y3} A106,106 0 0 0 ${x4},${y4} Z`;
                  const iconX = 200 + Math.cos(midRad) * 148;
                  const iconY = 200 + Math.sin(midRad) * 148;

                  return (
                    <g
                      key={r.name}
                      className={`${styles.wheelWedge} ${activeRashi === i ? styles.wheelWedgeActive : ''}`}
                      onClick={() => setActiveRashi(i)}
                    >
                      <title>{`${r.name} (${r.eng})`}</title>
                      <path d={wedgePath} className={styles.wedgeFill} />
                      {/* The icons are plain black line-art (background just
                          stripped from opaque white) — a light medallion
                          backing keeps them visible against a dark-theme
                          wedge, which pure black on a dark surface wouldn't
                          be. */}
                      <circle cx={iconX} cy={iconY} r="19" className={styles.wedgeIconBacking} />
                      <image href={`/images/zodiac/${r.eng}.png`} x={iconX - 15} y={iconY - 15} width="30" height="30" className={styles.wedgeIcon} />
                    </g>
                  );
                })}
                <circle cx="200" cy="200" r="104" className={styles.wheelHub} />
                <text x="200" y="196" textAnchor="middle" className={styles.wheelHubName}>{current.name}</text>
                <text x="200" y="214" textAnchor="middle" className={styles.wheelHubEng}>{current.eng}</text>
              </svg>
            </div>
            <p className={styles.reviewText}>✦ Select a sign on the ring to view its forecast ✦</p>
          </div>

          {/* Details Column */}
          <div className={styles.horoscopeDetailsCard}>
            <div className={styles.rashiHeader}>
              <h2 className={styles.rashiTitle}>{current.name}</h2>
              <span className={styles.rashiMeta}>{current.eng} Moon Sign</span>
            </div>

            <div className={styles.rashiSpecs}>
              <div className={styles.specBox}>
                <span className={styles.specLabel}>Ruling Graha</span>
                <span className={styles.specVal}>{current.graha}</span>
              </div>
              <div className={styles.specBox}>
                <span className={styles.specLabel}>Element</span>
                <span className={styles.specVal}>{current.element}</span>
              </div>
              <div className={styles.specBox}>
                <span className={styles.specLabel}>Traditional Key</span>
                <span className={styles.specVal} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <img src={`/images/zodiac/${current.eng}.png`} alt="" width={16} height={16} /> Rashi
                </span>
              </div>
            </div>

            <div className={styles.horoscopeText}>
              {error && <p style={{ color: '#d64545' }}>{error}</p>}
              {loading && !transitData && (
                <p className={styles.reviewText}>Computing today's transits for {current.eng}...</p>
              )}
              {transitData && (
                <>
                  <p className={styles.reviewText} style={{ marginBottom: '14px', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    Real planetary transits for {transitData.date}, counted as houses from {current.eng} (treated as your Moon Sign) — the standard Vedic approach for rashi-based predictions.
                  </p>

                  {period === 'weekly-love' && venusTransit && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', marginBottom: '14px', background: 'rgba(199, 161, 90, 0.08)', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
                      <PlanetIcon id="venus" size={28} />
                      <span>
                        <strong style={{ color: 'var(--gold-primary)' }}>Love & Relationships this week:</strong>{' '}
                        Venus, the natural significator of love, is transiting your {venusTransit.house}{ordinal(venusTransit.house)} house in {venusTransit.rashi}{venusTransit.retrograde ? ' — Retrograde' : ''}.
                      </span>
                    </div>
                  )}

                  {focusPlanet && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 14px', marginBottom: '14px', background: 'rgba(199, 161, 90, 0.08)', border: '1px solid var(--border-subtle)', borderRadius: '8px', opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                      <PlanetIcon id={focusPlanet.id} size={28} />
                      <span>
                        <strong style={{ color: 'var(--gold-primary)' }}>Today's Focus:</strong>{' '}
                        {PLANET_META[focusPlanet.id]?.name} is transiting your 1st house (Self) in {focusPlanet.rashi}{focusPlanet.retrograde ? ' — Retrograde' : ''} — {PLANET_META[focusPlanet.id]?.quality}.
                      </span>
                    </div>
                  )}

                  <div style={{ opacity: loading ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                    {sortedTransits.map(t => {
                      const meta = PLANET_META[t.id];
                      const dotColor = NATURAL_BENEFIC.has(t.id) ? '#4caf7d' : NATURAL_MALEFIC.has(t.id) ? '#c85a5a' : '#9a9a9a';
                      return (
                        // A fixed 160px third column used to hold the house-meaning
                        // text — on a narrower details card (or a longer meaning
                        // string) that guessed width either overflowed the card or
                        // wrapped and threw the row's vertical alignment off relative
                        // to its neighbors. Stacking the meaning as a second line
                        // under the planet name instead can't misalign at any width.
                        <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor, flexShrink: 0, marginTop: '6px' }} title={NATURAL_BENEFIC.has(t.id) ? 'Naturally benefic' : NATURAL_MALEFIC.has(t.id) ? 'Naturally malefic' : 'Naturally neutral'} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <PlanetIcon id={t.id} size={18} /> {meta?.name || t.id} in {t.rashi}
                              {t.retrograde && <span style={{ marginLeft: '6px', fontSize: '11px', padding: '1px 6px', borderRadius: '10px', background: 'rgba(200,90,90,0.15)', color: '#c85a5a' }}>℞ Retrograde</span>}
                            </div>
                            <div style={{ color: 'var(--color-text-muted, #999)', fontSize: '13px', marginTop: '2px' }}>
                              {t.house}{ordinal(t.house)} house — {HOUSE_MEANINGS[t.house]?.split('—')[1]?.trim()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {upcomingTransits.length > 0 && (
                    <div style={{ marginTop: '18px' }}>
                      <h4 style={{ color: 'var(--gold-primary)', fontSize: '14px', marginBottom: '8px' }}>Upcoming Sign Changes This Period</h4>
                      {upcomingTransits.map((ev, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><PlanetIcon id={ev.planetId} size={16} /> {PLANET_META[ev.planetId]?.name || ev.planetId}: {ev.fromRashi} → {ev.toRashi}</span>
                          <span style={{ color: 'var(--color-text-muted)' }}>{new Date(ev.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '14px' }}>
                    Dot colors show each planet's classical natural temperament (green = benefic, red = malefic, grey = neutral) — a fixed classical property of the planet itself, not a verdict on today specifically.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChoghadiyaPage() {
  const [result, setResult] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: PanchangDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.panchang(details.date, details.latitude, details.longitude));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Choghadiya" title="Choghadiya Muhurat Table" description="All 8 day segments and 8 night segments, each ruled by one of 7 classical types — auspicious, neutral, or inauspicious.">
      <PanchangDetailsForm onSubmit={handleSubmit} submitLabel="Show Choghadiya" idPrefix="choghadiya" />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && !result.choghadiya && (
        <p style={{ textAlign: 'center', marginTop: '16px', color: 'var(--color-text-muted)' }}>Could not compute sunrise/sunset for this location and date.</p>
      )}
      {result?.choghadiya && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Day Choghadiya (Sunrise to Sunset)</h3>
          {result.choghadiya.day.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: s.auspicious ? '#2e7d32' : '#b23c3c', fontWeight: 500 }}>{s.name} {s.auspicious ? '(Auspicious)' : '(Inauspicious)'}</span>
              <span>{formatIst(s.start)} – {formatIst(s.end)} IST</span>
            </div>
          ))}
          <h3 className={styles.partnerTitle} style={{ border: 'none', marginTop: '20px' }}>Night Choghadiya (Sunset to Next Sunrise)</h3>
          {result.choghadiya.night.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: s.auspicious ? '#2e7d32' : '#b23c3c', fontWeight: 500 }}>{s.name} {s.auspicious ? '(Auspicious)' : '(Inauspicious)'}</span>
              <span>{formatIst(s.start)} – {formatIst(s.end)} IST</span>
            </div>
          ))}
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '12px' }}>
            Amrit, Labh, Shubh, and Chal are auspicious; Rog, Kaal, and Udveg are inauspicious — cross-check against any other Choghadiya table for the same date, time, and place.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function MuhuratFinderPage() {
  const [result, setResult] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: PanchangDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.panchang(details.date, details.latitude, details.longitude));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  const goodWindows = result?.choghadiya ? [...result.choghadiya.day, ...result.choghadiya.night].filter(s => s.auspicious) : [];

  return (
    <CalculatorPageShell eyebrow="Muhurat Finder" title="Find an Auspicious Muhurat" description="Filters the day's Choghadiya down to only the auspicious windows (Amrit, Shubh, Labh, Chal) — good times to start something new.">
      <PanchangDetailsForm onSubmit={handleSubmit} submitLabel="Find Good Muhurats" idPrefix="muhurat" />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result?.choghadiya && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>{goodWindows.length} Auspicious Windows on {result.date}</h3>
          {goodWindows.map((s, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <span style={{ color: '#2e7d32', fontWeight: 500 }}>{s.name}</span>
              <span>{formatIst(s.start)} – {formatIst(s.end)} IST</span>
            </div>
          ))}
          {result.abhijitMuhurat && (
            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.1)' }}>
              <strong>Also: Abhijit Muhurat</strong> — {formatIst(result.abhijitMuhurat.start)} – {formatIst(result.abhijitMuhurat.end)} IST (considered auspicious on any weekday, centered on solar noon).
            </div>
          )}
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function AbhijitMuhuratPage() {
  const [result, setResult] = useState<PanchangResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: PanchangDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.panchang(details.date, details.latitude, details.longitude));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Abhijit Muhurat" title="Find Today's Abhijit Muhurat" description="The 8th of 15 equal divisions of daylight, centered on solar noon — considered auspicious for starting important work on any weekday.">
      <PanchangDetailsForm onSubmit={handleSubmit} submitLabel="Find Abhijit Muhurat" idPrefix="abhijit" />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          {result.abhijitMuhurat ? (
            <>
              <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>{formatIst(result.abhijitMuhurat.start)} – {formatIst(result.abhijitMuhurat.end)} IST</h3>
              <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
                Sunrise was at {formatIst(result.sunrise)} IST and sunset is at {formatIst(result.sunset)} IST for this date and place — Abhijit Muhurat is the 8th of 15 equal muhurtas dividing that daylight span.
              </p>
            </>
          ) : (
            <p style={{ textAlign: 'center' }}>Could not compute sunrise/sunset for this location and date.</p>
          )}
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function ordinal(n: number): string {
  if (n % 10 === 1 && n !== 11) return 'st';
  if (n % 10 === 2 && n !== 12) return 'nd';
  if (n % 10 === 3 && n !== 13) return 'rd';
  return 'th';
}

// 2. Kundli Matching (Guna Milan) Page — real Ashtakoot calculation. `geo`
// is set only when the user actually picks a LocationAutocomplete
// suggestion (carrying its exact coordinates, same pattern as
// BirthDetailsForm's selectedGeo) — any further edit to the place text
// clears it, since it no longer necessarily matches what's in the box, and
// handleMatch below falls back to a plain geocode() of the typed text.
interface PartnerBirthValue {
  name: string;
  dob: string;
  tob: string;
  place: string;
  geo: GeocodeResult | null;
}

function PartnerBirthFields({ idPrefix, title, value, onChange }: { idPrefix: string; title: string; value: PartnerBirthValue; onChange: (v: PartnerBirthValue) => void }) {
  return (
    <div className={styles.partnerFormCard}>
      <h3 className={styles.partnerTitle}>✦ {title}</h3>
      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label className="form-label">Name</label>
        <input type="text" className="input-field input-cosmos" placeholder="Full name" value={value.name} onChange={e => onChange({ ...value, name: e.target.value })} />
      </div>
      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label className="form-label">Date of Birth</label>
        <AncientDatePicker className="input-field input-cosmos" value={value.dob} onChange={val => onChange({ ...value, dob: val })} placeholder="Select Date of Birth" />
      </div>
      <div className="form-group" style={{ marginBottom: '12px' }}>
        <label className="form-label">Time of Birth</label>
        <AncientTimePicker className="input-field input-cosmos" value={value.tob} onChange={val => onChange({ ...value, tob: val })} placeholder="Select Time of Birth" />
      </div>
      <div className="form-group">
        <label className="form-label">Place of Birth</label>
        <LocationAutocomplete
          id={`${idPrefix}-place`}
          className="input-field input-cosmos"
          placeholder="Start typing a city..."
          value={value.place}
          onChange={place => onChange({ ...value, place, geo: null })}
          onSelect={geo => onChange({ ...value, place: geo.displayName, geo })}
        />
      </div>
    </div>
  );
}

const EMPTY_PARTNER: PartnerBirthValue = { name: '', dob: '', tob: '', place: '', geo: null };

export function KundliMatchingPage() {
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<KundliMatchingReport | null>(null);
  const [boy, setBoy] = useState<PartnerBirthValue>(EMPTY_PARTNER);
  const [girl, setGirl] = useState<PartnerBirthValue>(EMPTY_PARTNER);
  const resultRef = useRef<HTMLDivElement>(null);

  // Jump straight to the output as soon as it's ready — on mobile the two
  // stacked partner forms push the result far below the fold, so without
  // this the user has to manually scroll past both to see anything.
  useEffect(() => {
    if (result) resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [result]);

  const handleMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boy.dob || !boy.tob || !boy.place || !girl.dob || !girl.tob || !girl.place) return;
    setCalculating(true);
    setError('');
    setResult(null);
    try {
      // A place picked from the autocomplete dropdown already carries exact
      // coordinates (boy.geo/girl.geo) — only fall back to a fresh geocode
      // of the typed text if they typed a place without picking a
      // suggestion from the list.
      const [boyGeo, girlGeo] = await Promise.all([
        boy.geo ?? calculatorService.geocode(boy.place),
        girl.geo ?? calculatorService.geocode(girl.place),
      ]);
      // India Standard Time (UTC+5:30) — matches the timezone assumption
      // used elsewhere on this form; a full per-partner timezone picker
      // would be the next refinement if international users need it.
      const data = await calculatorService.kundliMatching(
        { date: girl.dob, time: girl.tob, timezoneOffsetMinutes: 330, latitude: girlGeo.latitude, longitude: girlGeo.longitude },
        { date: boy.dob, time: boy.tob, timezoneOffsetMinutes: 330, latitude: boyGeo.latitude, longitude: boyGeo.longitude }
      );
      setResult(data);
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate the match. Please check the birth details and try again.');
    } finally {
      setCalculating(false);
    }
  };

  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">Ashta Koota Milan</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>Kundli Matching</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle} style={{ color: 'var(--color-text-dark-2)' }}>
            Traditional Guna Milan analysis to examine marriage compatibility based on Nakshatra alignment.
          </p>
        </div>

        <div className={styles.matchingLayout}>
          <form onSubmit={handleMatch} className={styles.matchingGrid}>
            <PartnerBirthFields idPrefix="km-boy" title="Partner 1 (Boy)" value={boy} onChange={setBoy} />
            <PartnerBirthFields idPrefix="km-girl" title="Partner 2 (Girl)" value={girl} onChange={setGirl} />

            <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '16px' }}>
              {error && <p style={{ color: '#d64545', marginBottom: '12px' }}>{error}</p>}
              <button type="submit" className="btn btn-gold btn-lg" disabled={calculating}>
                {calculating ? 'Analyzing Charts...' : 'Calculate Guna Match'}
              </button>
            </div>
          </form>

          {/* Results Output */}
          {result && (
            <div ref={resultRef}>
              <KundliMatchingResult result={result} brideName={girl.name.trim()} groomName={boy.name.trim()} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Nakshatra Finder, Sade Sati, Numerology — one shared shell:
// a single BirthDetailsForm feeding a calculator endpoint, with the result
// shown alongside the raw computed values (not just a verdict), so the
// numbers can be independently cross-checked against any other Kundli tool.
function CalculatorPageShell({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: React.ReactNode }) {
  return (
    <div className={`${styles.pageWrapper} ${styles.ivoryPage}`}>
      <div className={styles.container} style={{ maxWidth: '720px' }}>
        <div className={styles.pageHeader}>
          <span className="section-eyebrow">{eyebrow}</span>
          <h1 className={styles.pageTitle} style={{ color: 'var(--color-text-dark)' }}>{title}</h1>
          <div className={styles.divider}>✦ ❖ ✦</div>
          <p className={styles.pageSubtitle} style={{ color: 'var(--color-text-dark-2)' }}>{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

function ResultCard({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.compatibilityResult} style={{ marginTop: '32px' }}>
      {children}
    </div>
  );
}

export function NakshatraFinderPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<NakshatraResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.nakshatra(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Nakshatra Finder" title="Find Your Birth Nakshatra" description="Your Nakshatra (lunar mansion) is determined by the Moon's exact position at your birth moment.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find My Nakshatra" idPrefix="nakshatra" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Your Nakshatra: {result.name} (Pada {result.pada})</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your Moon sits at {result.moonLongitude.toFixed(2)}° sidereal longitude, in {result.rashi} Rashi — that places it in the {result.name} Nakshatra,
            {' '}Pada {result.pada}, ruled by {result.lord.charAt(0).toUpperCase() + result.lord.slice(1)}.
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            You can cross-check this against any other Kundli tool using the same birth date, time, and place — the Moon's longitude above should match closely.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function SadeSatiPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<SadeSatiResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.sadeSati(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  const phaseLabel: Record<string, string> = { rising: 'Rising phase (first 2.5 years)', peak: 'Peak phase (middle 2.5 years)', setting: 'Setting phase (final 2.5 years)' };

  return (
    <CalculatorPageShell eyebrow="Sade Sati" title="Sade Sati Checker" description="Checks whether Saturn is currently transiting the 12th, 1st, or 2nd rashi from your natal Moon.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check Sade Sati" idPrefix="sadesati" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>{result.active ? 'Sade Sati is currently active' : 'Sade Sati is not currently active'}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your natal Moon is in {result.moonRashi}. Saturn is currently transiting {result.saturnTransitRashi}.
            {result.active && result.phase ? ` This is your ${phaseLabel[result.phase]}.` : ' Saturn is not in the 12th, 1st, or 2nd sign from your Moon right now.'}
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function LuckyPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<LuckyAttributes | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.lucky(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Lucky Color & Date" title="Lucky Color & Date Calculator" description="Your ruling planet — the same lord your Ascendant (and Life Stone) is based on — gives a classical lucky color, number, and the dates in a month favorable to it.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find My Lucky Color & Date" idPrefix="lucky" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center', marginBottom: '16px' }}>
            <span style={{ width: '48px', height: '48px', borderRadius: '50%', background: result.colorHex, border: '2px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
            <div>
              <h3 className={styles.partnerTitle} style={{ border: 'none', margin: 0 }}>{result.color}</h3>
              <p className={styles.reviewText} style={{ margin: 0 }}>Lucky Number: {result.number} · Ruling Planet: {result.rulingPlanet.charAt(0).toUpperCase() + result.rulingPlanet.slice(1)}</p>
            </div>
          </div>
          <p className={styles.reviewText} style={{ textAlign: 'center' }}>Lucky Dates This Month: {result.luckyDates.join(', ')}</p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>{result.reason}</p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function BabyNamePage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<BabyNameResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.babyName(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Baby Name Calculator" title="Find Your Baby's Naming Syllable" description="The classical Namakaran system assigns one of 108 syllables to a baby's exact birth Nakshatra and Pada (quarter) — the traditional starting sound for an auspicious name.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find Naming Syllable" idPrefix="babyname" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>{result.syllable}</h3>
          <p className={styles.reviewText} style={{ textAlign: 'center' }}>
            Moon Nakshatra: {result.nakshatra}, Pada {result.pada}
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', textAlign: 'center' }}>
            All 4 padas of {result.nakshatra} use: {result.allSyllablesInNakshatra.join(', ')} — yours falls in Pada {result.pada}, so a name starting with "{result.syllable}" is the classical first choice.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function LalKitabPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<LalKitabResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.lalKitab(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Lal Kitab" title="Lal Kitab House Strength" description="Lal Kitab assigns each planet a fixed 'Pakka Ghar' (permanent house) — a framework distinct from classical Parashari sign-lordship. A planet placed in its own Pakka Ghar in your real chart is considered settled and strong.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check My Lal Kitab Houses" idPrefix="lalkitab" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          {result.houses.map(h => {
            const meta = PLANET_META[h.planetId];
            return (
              <div key={h.planetId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><PlanetIcon id={h.planetId} size={18} /> {meta?.name || h.planetId} — in house {h.house} (Pakka Ghar: {h.pakkaGhar.join(', ')})</span>
                <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '10px', background: h.inOwnHouse ? 'rgba(76,175,125,0.15)' : 'rgba(154,154,154,0.15)', color: h.inOwnHouse ? '#4caf7d' : 'var(--color-text-muted)' }}>
                  {h.inOwnHouse ? 'Settled (own house)' : 'Not settled'}
                </span>
              </div>
            );
          })}
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '14px' }}>
            Lal Kitab's "Rin" (planetary debt) concept is deliberately not included here — different Lal Kitab teachers give conflicting rules for it, with no single agreed classical table.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function KaalSarpDoshaPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<KaalSarpDoshaResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.kaalSarpDosha(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Kaal Sarp Dosha" title="Kaal Sarp Dosha Check" description="Checks whether all 7 classical planets fall within the same half of the zodiac bounded by Rahu and Ketu.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check Kaal Sarp Dosha" idPrefix="kaalsarp" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>{result.isKaalSarp ? 'Kaal Sarp Dosha is present' : 'Kaal Sarp Dosha is not present'}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your Rahu is in {result.rahuRashi} and Ketu is in {result.ketuRashi} — these two are always exactly opposite each other.
            {result.isKaalSarp
              ? ` All 7 other planets fall within the half of the zodiac running from ${result.enclosedSide === 'rahu-to-ketu' ? 'Rahu to Ketu' : 'Ketu to Rahu'} — the classical condition for Kaal Sarp Dosha.`
              : ' Your other 7 planets are split across both halves of the Rahu-Ketu axis, so the classical condition for Kaal Sarp Dosha is not met.'}
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            You can verify this yourself: check each planet's sign against your Rahu and Ketu signs above in the Free Kundli chart — if every planet falls on one side, the dosha applies.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function RahuKetuTransitPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<RahuKetuTransitResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.rahuKetuTransit(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Rahu-Ketu Transit" title="Rahu-Ketu Transit Tracker" description="Shows where the currently-transiting lunar nodes sit relative to your natal Moon.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Check Transit" idPrefix="rahuketu" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Transiting Rahu is in your {result.rahuHouseFromMoon}{ordinal(result.rahuHouseFromMoon)} house from the Moon</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your natal Moon is in {result.moonRashi}. Rahu is currently transiting {result.rahuTransitRashi} ({result.rahuHouseFromMoon}{ordinal(result.rahuHouseFromMoon)} house from your Moon),
            and Ketu is transiting {result.ketuTransitRashi} ({result.ketuHouseFromMoon}{ordinal(result.ketuHouseFromMoon)} house from your Moon).
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Classical sources disagree on which transit houses are favorable or challenging, so this reports the factual transit position rather than a one-size-fits-all verdict — read it alongside the rest of your chart.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function MoonSignPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<NakshatraResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.nakshatra(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Moon Sign Calculator" title="Find Your Moon Sign (Rashi)" description="Your Moon Sign is the zodiac sign (one of 12) the Moon occupied at your exact birth moment — the core of Vedic astrology, distinct from your Sun sign.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find My Moon Sign" idPrefix="moonsign" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Your Moon Sign is {result.rashi}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Your Moon sits at {result.moonLongitude.toFixed(2)}° sidereal longitude, placing it in {result.rashi} — the sign, out of 12, the Moon occupied at your birth moment.
            It also falls within the {result.name} Nakshatra (Pada {result.pada}); for the full 27-Nakshatra breakdown, see the dedicated Nakshatra Finder.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function AscendantPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [result, setResult] = useState<KundliResult | null>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.kundli(details));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    }
  };

  return (
    <CalculatorPageShell eyebrow="Lagna / Ascendant" title="Find Your Ascendant (Lagna)" description="Your Ascendant is the zodiac sign rising on the eastern horizon at your exact birth moment and place — it defines your 1st house and the whole-sign house layout of your chart.">
      <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Find My Ascendant" idPrefix="ascendant" showNameField={false} initialValues={toSavedBirthDetails(currentUser)} />
      {error && <p style={{ color: '#d64545', textAlign: 'center', marginTop: '16px' }}>{error}</p>}
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none' }}>Your Ascendant (Lagna) is {result.ascendant.rashi}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            At {result.ascendant.degreeInSign.toFixed(2)}° into {result.ascendant.rashi}, this sign is rising on the eastern horizon at your exact birth time and place.
            Because Vedic astrology uses whole-sign houses, {result.ascendant.rashi} becomes your 1st house, and every other sign follows in order for houses 2 through 12.
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            Since this depends on your exact birth time (it changes roughly every 2 hours), it's more time-sensitive than your Sun or Moon sign — double-check your birth time if this looks off.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function NumerologyPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [name, setName] = useState(currentUser?.name || '');
  const [dob, setDob] = useState(currentUser?.birthDate || '');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerology(name.trim(), dob));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Numerology" title="Full Numerology Report" description="All four Pythagorean numbers derived from your full name and date of birth, in one place.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="input-field input-cosmos" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Date of Birth</label>
          <AncientDatePicker className="input-field input-cosmos" value={dob} onChange={setDob} placeholder="Select Date of Birth" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading || !name.trim() || !dob}>
          {loading ? 'Calculating...' : 'Calculate My Numbers'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <div className={styles.compatGrid}>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Life Path</span><span className={styles.compatVal}>{result.lifePathNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Destiny</span><span className={styles.compatVal}>{result.destinyNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Soul Urge</span><span className={styles.compatVal}>{result.soulUrgeNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Personality</span><span className={styles.compatVal}>{result.personalityNumber}</span></div>
          </div>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '12px' }}>
            Life Path is derived from your full date of birth; Destiny, Soul Urge, and Personality from the letters in your name (Pythagorean system). Numbers 11, 22, and 33 are Master Numbers and are shown unreduced.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function LifePathNumberPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [name, setName] = useState(currentUser?.name || '');
  const [dob, setDob] = useState(currentUser?.birthDate || '');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerology(name.trim(), dob));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Life Path Number" title="Find Your Life Path Number" description="Derived purely from your date of birth — the single most important number in Pythagorean numerology, describing your core life direction.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="input-field input-cosmos" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Date of Birth</label>
          <AncientDatePicker className="input-field input-cosmos" value={dob} onChange={setDob} placeholder="Select Date of Birth" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading || !name.trim() || !dob}>
          {loading ? 'Calculating...' : 'Find My Life Path Number'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>Your Life Path Number is {result.lifePathNumber}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            This comes from reducing every digit of your full date of birth to a single digit (or a Master Number — 11, 22, 33 — shown unreduced). It's read as your core life direction, independent of your name.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function NameNumerologyPage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [name, setName] = useState(currentUser?.name || '');
  const [dob, setDob] = useState(currentUser?.birthDate || '');
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !dob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerology(name.trim(), dob));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Name Numerology" title="Numbers Derived From Your Name" description="Destiny, Soul Urge, and Personality numbers — all derived from the letters in your full name using the Pythagorean letter-value system.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '16px' }}>
          <label className="form-label">Full Name</label>
          <input type="text" className="input-field input-cosmos" value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
        </div>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Date of Birth</label>
          <AncientDatePicker className="input-field input-cosmos" value={dob} onChange={setDob} placeholder="Select Date of Birth" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading || !name.trim() || !dob}>
          {loading ? 'Calculating...' : 'Calculate My Name Numbers'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <div className={styles.compatGrid}>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Destiny</span><span className={styles.compatVal}>{result.destinyNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Soul Urge</span><span className={styles.compatVal}>{result.soulUrgeNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Personality</span><span className={styles.compatVal}>{result.personalityNumber}</span></div>
          </div>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '12px' }}>
            Destiny sums every letter in your name; Soul Urge sums only the vowels (your inner motivation); Personality sums only the consonants (how others perceive you). Your date of birth isn't used for any of these three.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function NumerologyMatchPage() {
  const [p1, setP1] = useState({ name: '', dob: '' });
  const [p2, setP2] = useState({ name: '', dob: '' });
  const [result, setResult] = useState<NumerologyMatchResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = p1.name.trim() && p1.dob && p2.name.trim() && p2.dob && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerologyMatch({ name: p1.name.trim(), date: p1.dob }, { name: p2.name.trim(), date: p2.dob }));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const affinityLabel: Record<string, string> = { same: 'Same number — strong resonance', grouped: 'Same numerology group — good affinity', different: 'Different groups — more contrast' };

  return (
    <CalculatorPageShell eyebrow="Numerology Match" title="Numerology Compatibility" description="Compares both people's Life Path, Destiny, and Soul Urge numbers using a widely-used numerology grouping — a distinct compatibility read from Kundli Matching, based on names and dates of birth only.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '560px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div>
            <h4 className={styles.partnerTitle}>Person 1</h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Full Name</label>
              <input type="text" className="input-field input-cosmos" value={p1.name} onChange={e => setP1({ ...p1, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <AncientDatePicker className="input-field input-cosmos" value={p1.dob} onChange={val => setP1({ ...p1, dob: val })} placeholder="Select Date" />
            </div>
          </div>
          <div>
            <h4 className={styles.partnerTitle}>Person 2</h4>
            <div className="form-group" style={{ marginBottom: '12px' }}>
              <label className="form-label">Full Name</label>
              <input type="text" className="input-field input-cosmos" value={p2.name} onChange={e => setP2({ ...p2, name: e.target.value })} placeholder="Full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Date of Birth</label>
              <AncientDatePicker className="input-field input-cosmos" value={p2.dob} onChange={val => setP2({ ...p2, dob: val })} placeholder="Select Date" />
            </div>
          </div>
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', margin: '16px 0 0' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '20px' }} disabled={!canSubmit}>
          {loading ? 'Calculating...' : 'Check Compatibility'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>Compatibility Score: {result.compatibilityScore} / 9</h3>
          <div className={styles.compatGrid}>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Life Path</span><span className={styles.compatVal}>{result.person1.lifePathNumber} · {result.person2.lifePathNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Destiny</span><span className={styles.compatVal}>{result.person1.destinyNumber} · {result.person2.destinyNumber}</span></div>
            <div className={styles.compatBox}><span className={styles.compatLabel}>Soul Urge</span><span className={styles.compatVal}>{result.person1.soulUrgeNumber} · {result.person2.soulUrgeNumber}</span></div>
          </div>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)' }}>
            Life Path: {affinityLabel[result.lifePathAffinity]}. Destiny: {affinityLabel[result.destinyAffinity]}. Soul Urge: {affinityLabel[result.soulUrgeAffinity]}.
          </p>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-muted)', fontSize: '13px' }}>
            This groups numbers 1/5/7, 2/4/8, and 3/6/9 by shared temperament — a common but simplified numerology convention, not a precise or universally-agreed system. Use it alongside Kundli Matching, not instead of it.
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function FlamesPage() {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [result, setResult] = useState<FlamesOutcome | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = name1.trim() && name2.trim() && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.flames(name1.trim(), name2.trim()));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="FLAMES" title="FLAMES Calculator" description="The classic letter-counting name game — Friends, Love, Affection, Marriage, Enemies, or Siblings. A fun word game, not an astrological reading.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '420px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '12px' }}>
          <label className="form-label">Your Name</label>
          <input type="text" className="input-field input-cosmos" value={name1} onChange={e => setName1(e.target.value)} placeholder="Your name" />
        </div>
        <div className="form-group">
          <label className="form-label">Their Name</label>
          <input type="text" className="input-field input-cosmos" value={name2} onChange={e => setName2(e.target.value)} placeholder="Their name" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', margin: '16px 0 0' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '20px' }} disabled={!canSubmit}>
          {loading ? 'Calculating...' : 'Play FLAMES'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>{result.result}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', textAlign: 'center' }}>
            {name1.trim()} + {name2.trim()} → {result.remainingCount} letter{result.remainingCount === 1 ? '' : 's'} left after crossing out shared letters, landing on "{result.letter}".
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function ChineseZodiacPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [result, setResult] = useState<ChineseZodiacResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.chineseZodiac(year));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Chinese Zodiac" title="Chinese Zodiac Calculator" description="A completely different, calendar-based system — a 12-animal cycle crossed with a 5-element 10-year cycle, no ephemeris involved.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '360px', margin: '0 auto' }}>
        <div className="form-group">
          <label className="form-label">Birth Year</label>
          <input type="number" className="input-field input-cosmos" value={year} min={1900} max={2100} onChange={e => setYear(Number(e.target.value))} />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', margin: '16px 0 0' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%', marginTop: '20px' }} disabled={loading}>
          {loading ? 'Calculating...' : 'Find My Chinese Zodiac'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <h3 className={styles.partnerTitle} style={{ border: 'none', textAlign: 'center' }}>{result.label}</h3>
          <p className={styles.reviewText} style={{ color: 'var(--color-text-dark-2)', textAlign: 'center' }}>
            Born in {result.year}, you're a {result.element} {result.animal} in the Chinese zodiac's 60-year cycle (12 animals × 5 elements).
          </p>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}

export function NumerologyHoroscopePage({ currentUser = null }: { currentUser?: MaybeUser } = {}) {
  const [dob, setDob] = useState(currentUser?.birthDate || '');
  const [result, setResult] = useState<PersonalNumerologyCycle | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dob) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      setResult(await calculatorService.numerologyHoroscope(dob));
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not calculate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <CalculatorPageShell eyebrow="Numerology Horoscope" title="Your Personal Year, Month & Day" description="Your Life Path number is fixed for life — but your Personal Year, Month, and Day numbers cycle every year, giving numerology's own version of a horoscope.">
      <form onSubmit={handleSubmit} style={{ maxWidth: '420px', margin: '0 auto' }}>
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label className="form-label">Date of Birth</label>
          <AncientDatePicker className="input-field input-cosmos" value={dob} onChange={setDob} placeholder="Select Date of Birth" />
        </div>
        {error && <p style={{ color: '#d64545', textAlign: 'center', marginBottom: '12px' }}>{error}</p>}
        <button type="submit" className="btn btn-gold btn-lg" style={{ width: '100%' }} disabled={loading || !dob}>
          {loading ? 'Calculating...' : 'Find My Numerology Horoscope'}
        </button>
      </form>
      {result && (
        <ResultCard>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '2rem', color: 'var(--gold-primary)' }}>{result.personalYear}</div>
              <div className={styles.reviewText}>Personal Year</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', color: 'var(--gold-primary)' }}>{result.personalMonth}</div>
              <div className={styles.reviewText}>Personal Month</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', color: 'var(--gold-primary)' }}>{result.personalDay}</div>
              <div className={styles.reviewText}>Personal Day</div>
            </div>
          </div>
        </ResultCard>
      )}
    </CalculatorPageShell>
  );
}
