import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { HOUSE_MEANINGS } from '../../data/mockData';
import BirthDetailsForm from '../../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../components/BirthDetailsForm/BirthDetailsForm';
import { toSavedBirthDetails } from '../../utils/birthDetails';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { KundliFullResult, KundliResult } from '../../services/calculatorService';
import { VARGA_LABELS } from '../../services/calculatorService';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import { PLANET_META } from '../../data/planetMeta';
import styles from './KundliSection.module.css';

interface ChartPlanet {
  id: string;
  symbol: string;
  name: string;
  sign: string;
  house: number;
  degree?: string;
  decimalDegree?: string;
  quality?: string;
  retrograde?: boolean;
}

// Every chart selectable in the Charts tab — D1/Chandra carry real ecliptic
// degrees (they're the same underlying placements, just re-housed); the
// D2-D60 varga charts only ever resolve to a final sign, so no degree is
// shown for those rather than fabricating one.
const CHART_KEYS = ['D1', 'BHAV_CHALIT', 'CHANDRA', 'D9', 'D4', 'D6', 'D7', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60', 'D2', 'D3'] as const;
const CHART_LABELS: Record<string, string> = {
  D1: 'D1 — Rashi (Birth Chart)', BHAV_CHALIT: 'Bhav Chalit (Real KP Cusps)', CHANDRA: 'Chandra (Moon) Chart', D9: 'D9 — Navamsa (Marriage)',
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'charts', label: 'Charts' },
  { key: 'dasha', label: 'Dasha' },
  { key: 'strength', label: 'Strength' },
  { key: 'kp', label: 'KP' },
  { key: 'ashtakavarga', label: 'Ashtakvarga' },
  { key: 'predictions', label: 'Predictions' },
  { key: 'remedies', label: 'Remedies' },
  { key: 'doshas', label: 'Doshas' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

// Fixed classical sign-lord assignments — same universal fact used
// throughout Vedic astrology, safe to keep as a static lookup here (not
// computed logic that could drift from the backend's own copy).
const RASHI_LORD_BY_NAME: Record<string, string> = {
  Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon', Leo: 'sun', Virgo: 'mercury',
  Libra: 'venus', Scorpio: 'mars', Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter',
};

// Panchang sunrise/sunset come back as UTC ISO instants — shift by the
// birth's timezone offset to show the actual local clock time, matching how
// a printed Panchang always states sunrise/sunset in local time.
function formatLocalTime(isoUtc: string, timezoneOffsetMinutes: number): string {
  const utcMs = new Date(isoUtc).getTime();
  const localMs = utcMs - timezoneOffsetMinutes * 60_000;
  const d = new Date(localMs);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

function formatDegree(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  const min = Math.round((degreeInSign - deg) * 60);
  return `${deg}°${min}'`;
}

// Compact decimal-degree label shown directly on the chart (e.g. "6.38°"),
// matching the reference report's own on-chart labeling convention.
function formatDecimalDegree(degreeInSign: number): string {
  return `${degreeInSign.toFixed(2)}°`;
}

// Converts any divisional-chart shape (Navamsa or the D2-D60 varga charts —
// which only carry a final sign + house, not the birth-degree D1 tracks)
// into the same ChartPlanet shape the visual chart renders, so every
// divisional chart gets an actual diagram, not just a text list.
function toSimpleChartPlanets(chart: { ascendant: { rashi: string }; planets: { id: string; rashi: string; house: number }[] }): ChartPlanet[] {
  const asc: ChartPlanet = { id: 'asc', ...PLANET_META.asc, sign: chart.ascendant.rashi, house: 1 };
  const planets: ChartPlanet[] = chart.planets.map(p => ({
    id: p.id,
    symbol: PLANET_META[p.id]?.symbol || '✦',
    name: PLANET_META[p.id]?.name || p.id,
    quality: PLANET_META[p.id]?.quality || '',
    sign: p.rashi,
    house: p.house,
  }));
  return [asc, ...planets];
}

function toChartPlanets(result: KundliResult): ChartPlanet[] {
  const asc: ChartPlanet = {
    id: 'asc',
    ...PLANET_META.asc,
    sign: result.ascendant.rashi,
    house: 1,
    degree: formatDegree(result.ascendant.degreeInSign),
    decimalDegree: formatDecimalDegree(result.ascendant.degreeInSign),
  };
  const planets: ChartPlanet[] = result.planets.map(p => ({
    id: p.id,
    symbol: PLANET_META[p.id]?.symbol || '✦',
    name: PLANET_META[p.id]?.name || p.id,
    quality: PLANET_META[p.id]?.quality || '',
    sign: p.rashi,
    house: p.house,
    degree: formatDegree(p.degreeInSign),
    decimalDegree: formatDecimalDegree(p.degreeInSign),
    retrograde: p.retrograde,
  }));
  return [asc, ...planets];
}

// Chandra chart carries the same real degrees/retrograde as D1 (same
// physical placements, just re-housed from the Moon) — no synthetic
// Ascendant entry here, since "house 1" in this chart is the Moon's own
// sign, not a separate rising point.
function toChandraChartPlanets(chandra: { moonRashi: string; planets: { id: string; rashi: string; degreeInSign: number; house: number; retrograde: boolean }[] }): ChartPlanet[] {
  return chandra.planets.map(p => ({
    id: p.id,
    symbol: PLANET_META[p.id]?.symbol || '✦',
    name: PLANET_META[p.id]?.name || p.id,
    quality: PLANET_META[p.id]?.quality || '',
    sign: p.rashi,
    house: p.house,
    degree: formatDegree(p.degreeInSign),
    decimalDegree: formatDecimalDegree(p.degreeInSign),
    retrograde: p.retrograde,
  }));
}

export default function KundliSection() {
  const { birthProfile, setBirthProfile, setKundliGenerated, currentUser, isLoggedIn, saveBirthDetails, setPage } = useAppContext();
  const [fullResult, setFullResult] = useState<KundliFullResult | null>(null);
  const [submittedDetails, setSubmittedDetails] = useState<BirthDetailsSubmitValue | null>(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedChart, setSelectedChart] = useState<string>('D1');
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  const kundliResult = fullResult?.kundli ?? null;
  const chartPlanets = kundliResult ? toChartPlanets(kundliResult) : [];
  const savedBirthDetails = toSavedBirthDetails(currentUser);
  const alreadySavedThisProfile = !!(currentUser?.birthDate && submittedDetails && currentUser.birthDate === submittedDetails.date);

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    try {
      const result = await calculatorService.kundliFull(details);
      setFullResult(result);
      setSubmittedDetails(details);
      setSaveState('idle');
      setBirthProfile({ ...birthProfile, name: details.name, dob: details.date, tob: details.time, place: details.placeName });
      setKundliGenerated(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not generate your Kundli. Please try again.');
    }
  };

  const handleSaveBirthDetails = async () => {
    if (!submittedDetails) return;
    setSaveState('saving');
    const ok = await saveBirthDetails({
      birthDate: submittedDetails.date,
      birthTime: submittedDetails.time,
      birthPlace: submittedDetails.placeName,
      birthLatitude: submittedDetails.latitude,
      birthLongitude: submittedDetails.longitude,
      birthTimezoneOffsetMinutes: submittedDetails.timezoneOffsetMinutes,
    });
    setSaveState(ok ? 'saved' : 'error');
  };

  return (
    <section className={styles.section} id="kundli">
      <CelestialBackdrop variant="kundli" intensity="medium" />
      <div className={styles.container}>
        <AnimatePresence mode="wait">
          {!fullResult ? (
            <motion.div
              key="form"
              className={styles.formWrap}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
            >
              {/* Section Header */}
              <div className={styles.header}>
                <span className="section-eyebrow">Janam Kundli</span>
                <h2 className={styles.sectionTitle}>Apni Janam Kundli Banayein</h2>
                <div className={styles.divider}>✦ ❖ ✦</div>
                <p className={styles.subtitle}>
                  Your birth chart is the blueprint of your soul's journey. Enter your exact birth coordinates
                  to map your Grahas, Bhavas, and Nakshatras.
                </p>
              </div>

              <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Generate My Free Kundli" idPrefix="kundli" initialValues={savedBirthDetails} />
              {savedBirthDetails && (
                <p className={styles.privacy}>✦ Pre-filled from the birth details you gave at sign-up — edit any field if it's wrong.</p>
              )}
              {error && <p className={styles.privacy} style={{ color: '#d64545' }}>{error}</p>}
            </motion.div>
          ) : (
            <motion.div
              key="chart"
              className={styles.chartWrap}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Chart Header */}
              <div className={styles.chartHeader}>
                <div>
                  <span className="section-eyebrow">Your Birth Chart</span>
                  <h2 className="section-title-cosmos">{birthProfile.name}&apos;s Kundli</h2>
                  <p className={styles.chartMeta}>
                    {birthProfile.dob} · {birthProfile.tob} · {birthProfile.place}
                  </p>
                </div>
                <button
                  className="btn btn-outline-gold"
                  onClick={() => setFullResult(null)}
                  id="kundli-edit-btn"
                >
                  Edit Details
                </button>
              </div>

              {/* Tab bar — swaps content below instead of one long continuous scroll */}
              <div className={styles.tabBar} role="tablist">
                {TABS.map(t => (
                  <button
                    key={t.key}
                    role="tab"
                    aria-selected={activeTab === t.key}
                    className={`${styles.tabButton} ${activeTab === t.key ? styles.tabButtonActive : ''}`}
                    onClick={() => setActiveTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {activeTab === 'overview' && (
                <>
                  <ChartDisplay title="Planetary Placements" planets={chartPlanets} ascendantRashi={kundliResult?.ascendant.rashi ?? ''} />

                  <div className={styles.overview}>
                    <h3 className={styles.overviewTitle}>Panchang at Birth</h3>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Tithi</div><div className={styles.infoValue}>{fullResult.panchang.tithi.paksha} {fullResult.panchang.tithi.name}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Vara (Weekday)</div><div className={styles.infoValue}>{fullResult.panchang.vara}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Yoga</div><div className={styles.infoValue}>{fullResult.panchang.yoga}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Karana</div><div className={styles.infoValue}>{fullResult.panchang.karana}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Nakshatra</div><div className={styles.infoValue}>{fullResult.panchang.nakshatra.name} (Pada {fullResult.panchang.nakshatra.pada})</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Nakshatra Lord</div><div className={styles.infoValue}>{cap(fullResult.panchang.nakshatra.lord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Moon Rashi</div><div className={styles.infoValue}>{fullResult.panchang.moonRashi}</div></div>
                      {kundliResult && <div className={styles.infoCard}><div className={styles.infoLabel}>Ascendant Lord</div><div className={styles.infoValue}>{cap(RASHI_LORD_BY_NAME[kundliResult.ascendant.rashi] || '')}</div></div>}
                      {fullResult.panchang.sunrise && <div className={styles.infoCard}><div className={styles.infoLabel}>Sunrise</div><div className={styles.infoValue}>{formatLocalTime(fullResult.panchang.sunrise, submittedDetails?.timezoneOffsetMinutes ?? 0)}</div></div>}
                      {fullResult.panchang.sunset && <div className={styles.infoCard}><div className={styles.infoLabel}>Sunset</div><div className={styles.infoValue}>{formatLocalTime(fullResult.panchang.sunset, submittedDetails?.timezoneOffsetMinutes ?? 0)}</div></div>}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h3 className={styles.overviewTitle}>What This Chart Means</h3>
                    <p className={styles.overviewText}>{fullResult.analysis.lagna}</p>
                    <p className={styles.overviewText}>{fullResult.analysis.moon}</p>
                    {fullResult.analysis.planets.filter(p => p.id !== 'moon').map(p => (
                      <p key={p.id} className={styles.overviewText}>{p.text}</p>
                    ))}
                    <p className={styles.chartNote}>
                      To verify: the Ascendant/Moon/Sun signs and houses named above should exactly match what's shown in the chart above — including on any other Kundli tool given the same birth date, time, and place.
                    </p>
                  </div>

                  <div className={styles.overview}>
                    <h3 className={styles.overviewTitle}>Avakhada Chakra</h3>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Varna</div><div className={styles.infoValue}>{fullResult.avakhada.varna}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Vashya</div><div className={styles.infoValue}>{fullResult.avakhada.vashya}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Yoni</div><div className={styles.infoValue}>{fullResult.avakhada.yoni}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Gana</div><div className={styles.infoValue}>{fullResult.avakhada.gana}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Nadi</div><div className={styles.infoValue}>{fullResult.avakhada.nadi}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Paya</div><div className={styles.infoValue}>{fullResult.avakhada.paya}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Tatva</div><div className={styles.infoValue}>{fullResult.avakhada.tatva}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Sign Lord</div><div className={styles.infoValue}>{cap(fullResult.avakhada.signLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Nakshatra Lord</div><div className={styles.infoValue}>{cap(fullResult.avakhada.nakshatraLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>Charan (Pada)</div><div className={styles.infoValue}>{fullResult.avakhada.pada}</div></div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'charts' && (() => {
                const chartPlanetsForKey: ChartPlanet[] =
                  selectedChart === 'D1' ? chartPlanets :
                  selectedChart === 'BHAV_CHALIT' ? toSimpleChartPlanets(fullResult.bhavChalit) :
                  selectedChart === 'CHANDRA' ? toChandraChartPlanets(fullResult.chandraChart) :
                  selectedChart === 'D9' ? toSimpleChartPlanets(fullResult.navamsaChart) :
                  fullResult.vargaCharts[selectedChart] ? toSimpleChartPlanets(fullResult.vargaCharts[selectedChart]) : [];
                const ascendantRashiForKey =
                  selectedChart === 'CHANDRA' ? fullResult.chandraChart.moonRashi :
                  chartPlanetsForKey.find(p => p.id === 'asc')?.sign ?? kundliResult?.ascendant.rashi ?? '';
                return (
                  <div className={styles.overview}>
                    <div className={styles.overviewTitleRow}>
                      <h3 className={styles.overviewTitle}>{CHART_LABELS[selectedChart] || VARGA_LABELS[selectedChart] || selectedChart}</h3>
                      <select className={styles.vargaSelect} value={selectedChart} onChange={e => setSelectedChart(e.target.value)}>
                        {CHART_KEYS.map(key => (
                          <option key={key} value={key}>{CHART_LABELS[key] || VARGA_LABELS[key] || key}</option>
                        ))}
                      </select>
                    </div>
                    <ChartDisplay title="Placements" planets={chartPlanetsForKey} ascendantRashi={ascendantRashiForKey} />
                  </div>
                );
              })()}

              {activeTab === 'dasha' && (
                <>
                  <div className={styles.timelinePanel}>
                    <h3 className={styles.overviewTitle}>Your Vimshottari Mahadasha Timeline</h3>
                    <p className={styles.overviewText}>The nine planetary periods of your life, starting from your Moon's nakshatra at birth.</p>
                    <div className={styles.timelineList}>
                      {fullResult.mahadashaTimeline.map((period, i) => (
                        <div key={i}>
                          <div className={`${styles.timelineItem} ${period.active ? styles.timelineItemActive : ''}`}>
                            <span className={styles.timelineLord}>{cap(period.lord)} Mahadasha{period.active ? ' (current)' : ''}</span>
                            <span className={styles.timelineDates}>{period.startsAt} → {period.endsAt}</span>
                          </div>
                          {fullResult.dashaPredictions.find(d => d.lord === period.lord) && (
                            <p className={styles.dashaPredictionText}>{fullResult.dashaPredictions.find(d => d.lord === period.lord)!.text}</p>
                          )}
                          {period.active && (
                            <div className={styles.antardashaList}>
                              {period.antardashas.map((sub, j) => (
                                <div key={j} className={styles.antardashaItem}>
                                  <span>{cap(sub.lord)} Antardasha</span>
                                  <span>{sub.startsAt} → {sub.endsAt}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.timelinePanel}>
                    <h3 className={styles.overviewTitle}>Your Yogini Dasha Timeline</h3>
                    <p className={styles.overviewText}>An alternate 36-year, 8-period dasha cycle, also timed from your Moon's nakshatra at birth.</p>
                    <div className={styles.timelineList}>
                      {fullResult.yoginiDashaTimeline.map((period, i) => (
                        <div key={i} className={`${styles.timelineItem} ${period.active ? styles.timelineItemActive : ''}`}>
                          <span className={styles.timelineLord}>{period.yogini} Yogini ({cap(period.lord)}){period.active ? ' (current)' : ''}</span>
                          <span className={styles.timelineDates}>{period.startsAt} → {period.endsAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'strength' && (
                <>
                  <div className={styles.overview}>
                    <h3 className={styles.overviewTitle}>Shadbala (Planetary Strength)</h3>
                    <p className={styles.overviewText}>Six-fold classical strength score per planet, in Rupas — a planet at or above its classical minimum is considered strong enough to deliver its significations well.</p>
                    <div className={styles.dataTable}>
                      <div className={`${styles.dataRow} ${styles.dataRowHead}`}>
                        <span>Planet</span><span>Rupas</span><span>Required</span><span>Status</span>
                      </div>
                      {fullResult.shadbala.planets.map(p => (
                        <div key={p.planet} className={styles.dataRow}>
                          <span className={styles.dataRowPlanet}><span className={styles.planetSymbol}>{PLANET_META[p.planet]?.symbol || '✦'}</span>{PLANET_META[p.planet]?.name || p.planet}</span>
                          <span>{p.rupas.toFixed(2)}</span>
                          <span>{p.minRequiredRupas.toFixed(1)}</span>
                          <span className={`${styles.statusBadge} ${p.isStrong ? styles.statusBadgeClear : styles.statusBadgeActive}`}>{p.isStrong ? 'Strong' : 'Weak'}</span>
                        </div>
                      ))}
                    </div>
                    <p className={styles.chartNote}>Ishta/Kashta Bala and the Sthana/Dig/Kaala/Cheshta/Naisargika/Drik breakdown are computed but not all shown here — ask if you want the full per-component view.</p>
                  </div>

                  <div className={styles.overview}>
                    <h3 className={styles.overviewTitle}>Bhavbala (House Strength)</h3>
                    <div className={styles.infoGrid}>
                      {fullResult.shadbala.houses.map(h => (
                        <div key={h.house} className={styles.infoCard}>
                          <div className={styles.infoLabel}>House {h.house}</div>
                          <div className={styles.infoValue}>{h.total.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'kp' && (
                <div className={styles.overview}>
                  <h3 className={styles.overviewTitle}>KP Sub-Lord Table</h3>
                  <p className={styles.overviewText}>Each point's Sign, Sign Lord, Star (Nakshatra) Lord, and Sub Lord — the core KP technique, for the Ascendant and every planet.</p>
                  <div className={styles.dataTable}>
                    <div className={`${styles.dataRow} ${styles.dataRowHeadKp}`}>
                      <span>Point</span><span>Sign</span><span>Star Lord</span><span>Sub Lord</span>
                    </div>
                    {fullResult.kp.table.map(row => (
                      <div key={row.id} className={`${styles.dataRow} ${styles.dataRowKp}`}>
                        <span className={styles.dataRowPlanet}>{row.id === 'asc' ? 'Ascendant' : (PLANET_META[row.id]?.name || row.id)}</span>
                        <span>{row.rashi} ({cap(row.signLord)})</span>
                        <span>{cap(row.starLord)}</span>
                        <span>{cap(row.subLord)}</span>
                      </div>
                    ))}
                  </div>

                  <h3 className={styles.overviewTitle} style={{ marginTop: 'var(--space-6)' }}>KP Cusps (Bhav Chalit)</h3>
                  <p className={styles.overviewText}>Sub-lords of the real Placidus house cusps — the technique's genuine cuspal analysis, computed from Swiss Ephemeris rather than a whole-sign approximation.</p>
                  <div className={styles.dataTable}>
                    <div className={`${styles.dataRow} ${styles.dataRowHeadKp}`}>
                      <span>Cusp</span><span>Sign</span><span>Star Lord</span><span>Sub Lord</span>
                    </div>
                    {fullResult.kp.cusps.map(row => (
                      <div key={row.id} className={`${styles.dataRow} ${styles.dataRowKp}`}>
                        <span className={styles.dataRowPlanet}>House {row.id.replace('cusp', '')}</span>
                        <span>{row.rashi} ({cap(row.signLord)})</span>
                        <span>{cap(row.starLord)}</span>
                        <span>{cap(row.subLord)}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoCard}><div className={styles.infoLabel}>Lagna Star Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.lagnaStarLord)}</div></div>
                    <div className={styles.infoCard}><div className={styles.infoLabel}>Lagna Sub Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.lagnaSubLord)}</div></div>
                    <div className={styles.infoCard}><div className={styles.infoLabel}>Moon Star Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.moonStarLord)}</div></div>
                    <div className={styles.infoCard}><div className={styles.infoLabel}>Moon Sub Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.moonSubLord)}</div></div>
                    <div className={styles.infoCard}><div className={styles.infoLabel}>Day Lord</div><div className={styles.infoValue}>{cap(fullResult.kp.rulingPlanets.dayLord)}</div></div>
                  </div>
                </div>
              )}

              {activeTab === 'ashtakavarga' && (
                <div className={styles.overview}>
                  <h3 className={styles.overviewTitle}>Sarvashtakavarga (Bindu Strength)</h3>
                  <p className={styles.overviewText}>Total classical strength points (bindus) each sign receives, summed across all 7 grahas — higher means a stronger sign to have planets or transits pass through. The 12 signs always sum to exactly 337.</p>
                  <div className={styles.infoGrid}>
                    {fullResult.ashtakavarga.sarva.map(s => (
                      <div key={s.rashi} className={styles.infoCard}>
                        <div className={styles.infoLabel}>{s.rashi}</div>
                        <div className={styles.infoValue}>{s.bindus} bindus</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'predictions' && (
                <>
                  <div className={styles.overview}>
                    <h3 className={styles.overviewTitle}>Ascendant Predictions</h3>
                    <p className={styles.overviewText}>{fullResult.ascendantPredictions.description}</p>
                    <p className={styles.chartNote} style={{ marginBottom: 'var(--space-4)' }}>Your Ascendant is {fullResult.ascendantPredictions.ascendant}</p>
                    <div className={styles.predictionGrid}>
                      {([
                        ['Personality', fullResult.ascendantPredictions.personality],
                        ['Physical', fullResult.ascendantPredictions.physical],
                        ['Health', fullResult.ascendantPredictions.health],
                        ['Career', fullResult.ascendantPredictions.career],
                        ['Relationship', fullResult.ascendantPredictions.relationship],
                      ] as const).map(([label, text]) => (
                        <div key={label} className={styles.predictionCard}>
                          <div className={styles.predictionCardTitle}>{label}</div>
                          <p className={styles.doshaCardText}>{text}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h3 className={styles.overviewTitle}>Yoga Combinations</h3>
                    <div className={styles.doshaYogaGrid}>
                      {fullResult.yogas.map(y => (
                        <div key={y.name} className={styles.doshaCard}>
                          <div className={styles.doshaCardHead}>
                            <span className={styles.doshaCardTitle}>{y.name}</span>
                            <span className={`${styles.statusBadge} ${y.present ? styles.statusBadgeClear : styles.statusBadgeActive}`}>
                              {y.present ? 'Present' : 'Not formed'}
                            </span>
                          </div>
                          <p className={styles.doshaCardText}>{y.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'remedies' && (
                /* Gemstone & Rudraksha Remedies — Life/Lucky/Fortune stones plus the
                   nakshatra-lord Rudraksha, each with a self-contained SVG "image",
                   mantra, and how-to-wear detail. No external shop links are used —
                   the CTA below routes to this app's own astrologer consult flow,
                   matching how the reference report itself only ever links to
                   "Chat with Astrologer" rather than any third-party seller. */
                <div className={styles.overview}>
                  <h3 className={styles.overviewTitle}>Gemstone &amp; Rudraksha Remedies</h3>
                  <p className={styles.overviewText}>Three classical gemstone picks — Life (Ascendant lord), Lucky (5th house/Purva Punya lord), and Fortune (9th house/Bhagya lord) — plus the Rudraksha ruled by your birth Nakshatra's lord.</p>
                  <div className={styles.gemGrid}>
                    {[fullResult.gemstones.life, fullResult.gemstones.lucky, fullResult.gemstones.fortune].map(g => (
                      <div key={g.purpose} className={styles.gemCard}>
                        <div className={styles.gemCardHead}>
                          <GemIcon color={g.color} />
                          <div>
                            <div className={styles.gemCardPurpose}>{g.purpose}</div>
                            <div className={styles.gemCardName}>{g.gemstone} ({g.sanskritName})</div>
                          </div>
                        </div>
                        <p className={styles.doshaCardText}>{g.reason}</p>
                        <div className={styles.gemCardMeta}>
                          <span><strong>Metal:</strong> {g.metal}</span>
                          <span><strong>Wear on:</strong> {g.finger}</span>
                        </div>
                        <p className={styles.gemMantra}>{g.mantra}</p>
                      </div>
                    ))}
                    <div className={styles.gemCard}>
                      <div className={styles.gemCardHead}>
                        <RudrakshaIcon mukhi={fullResult.rudraksha.mukhi} />
                        <div>
                          <div className={styles.gemCardPurpose}>Rudraksha</div>
                          <div className={styles.gemCardName}>{fullResult.rudraksha.mukhi} Mukhi ({fullResult.rudraksha.deity})</div>
                        </div>
                      </div>
                      <p className={styles.doshaCardText}>{fullResult.rudraksha.reason}</p>
                      <ul className={styles.gemBenefitList}>
                        {fullResult.rudraksha.benefits.map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                      <p className={styles.gemMantra}>{fullResult.rudraksha.howToWear}</p>
                    </div>
                  </div>
                  <details className={styles.precautionsBox}>
                    <summary>Precautions before wearing any gemstone or Rudraksha</summary>
                    <ul className={styles.gemBenefitList}>
                      {fullResult.rudraksha.precautions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </details>
                  <p className={styles.chartNote}>These are classical, chart-derived starting points — not a substitute for a full consultation, since remedial choices can shift with other placements in your chart.</p>
                  <button className="btn btn-gold" style={{ marginTop: 'var(--space-4)' }} onClick={() => setPage('astrologers')}>
                    Consult an Astrologer for Remedies
                  </button>
                </div>
              )}

              {activeTab === 'doshas' && (
                <div className={styles.overview}>
                  <h3 className={styles.overviewTitle}>Doshas</h3>
                  <div className={styles.doshaYogaGrid}>
                    <div className={styles.doshaCard}>
                      <div className={styles.doshaCardHead}>
                        <span className={styles.doshaCardTitle}>Mangal Dosha</span>
                        <span className={`${styles.statusBadge} ${fullResult.doshas.mangal.isManglik ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                          {fullResult.doshas.mangal.isManglik ? 'Present' : 'Clear'}
                        </span>
                      </div>
                      <p className={styles.doshaCardText}>Mars sits in your {ordinal(fullResult.doshas.mangal.marsHouse)} house from the Ascendant.</p>
                    </div>
                    <div className={styles.doshaCard}>
                      <div className={styles.doshaCardHead}>
                        <span className={styles.doshaCardTitle}>Kaal Sarp Dosha</span>
                        <span className={`${styles.statusBadge} ${fullResult.doshas.kaalSarp.isKaalSarp ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                          {fullResult.doshas.kaalSarp.isKaalSarp ? 'Present' : 'Clear'}
                        </span>
                      </div>
                      <p className={styles.doshaCardText}>Rahu in {fullResult.doshas.kaalSarp.rahuRashi}, Ketu in {fullResult.doshas.kaalSarp.ketuRashi}.</p>
                    </div>
                    <div className={styles.doshaCard}>
                      <div className={styles.doshaCardHead}>
                        <span className={styles.doshaCardTitle}>Sade Sati</span>
                        <span className={`${styles.statusBadge} ${fullResult.doshas.sadeSati.active ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                          {fullResult.doshas.sadeSati.active ? `Active · ${fullResult.doshas.sadeSati.phase}` : 'Not active'}
                        </span>
                      </div>
                      <p className={styles.doshaCardText}>Saturn is currently transiting {fullResult.doshas.sadeSati.saturnTransitRashi}; your Moon sign is {fullResult.doshas.sadeSati.moonRashi}.</p>
                    </div>
                    <div className={styles.doshaCard}>
                      <div className={styles.doshaCardHead}>
                        <span className={styles.doshaCardTitle}>Rahu-Ketu Transit</span>
                      </div>
                      <p className={styles.doshaCardText}>Rahu transiting {fullResult.doshas.rahuKetuTransit.rahuTransitRashi} ({ordinal(fullResult.doshas.rahuKetuTransit.rahuHouseFromMoon)} from Moon), Ketu transiting {fullResult.doshas.rahuKetuTransit.ketuTransitRashi} ({ordinal(fullResult.doshas.rahuKetuTransit.ketuHouseFromMoon)} from Moon).</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save birth details to account, so the next visit prefills automatically */}
              {isLoggedIn && submittedDetails && !alreadySavedThisProfile && (
                <div className={styles.saveBar}>
                  <span className={styles.saveText}>
                    {saveState === 'saved' ? '✓ Saved to your account — this will prefill automatically next time.' : 'Save these birth details to your account so you never have to re-enter them.'}
                  </span>
                  {saveState !== 'saved' && (
                    <button className="btn btn-gold btn-sm" disabled={saveState === 'saving'} onClick={handleSaveBirthDetails}>
                      {saveState === 'saving' ? 'Saving...' : saveState === 'error' ? 'Retry Save' : 'Save to My Account'}
                    </button>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ---- Chart + planet-list panel, reused for every chart in the Charts tab
// (D1, Chandra, D9, and every D2-D60 varga chart) — each instance owns its
// own tooltip state and North/South style toggle, so multiple charts can
// sit on the same tab without interfering with each other. ----
function ChartDisplay({ title, subtitle, planets, ascendantRashi }: { title: string; subtitle?: string; planets: ChartPlanet[]; ascendantRashi: string }) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [houseTooltip, setHouseTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [style, setStyle] = useState<'north' | 'south'>('north');

  const handlePlanetHover = (planet: ChartPlanet, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.closest(`.${styles.svgWrap}`) as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;
    const lines = [`${planet.name} · ${planet.sign} · ${ordinal(planet.house)} House`, planet.degree, planet.retrograde ? 'Retrograde (℞)' : null, planet.quality].filter(Boolean);
    setTooltip({ text: lines.join('\n'), x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top - 10 });
  };

  return (
    <div className={styles.chartLayout}>
      <div>
        <div className={styles.chartStyleToggle}>
          <button className={`${styles.chartStyleBtn} ${style === 'north' ? styles.chartStyleBtnActive : ''}`} onClick={() => setStyle('north')}>North Indian</button>
          <button className={`${styles.chartStyleBtn} ${style === 'south' ? styles.chartStyleBtnActive : ''}`} onClick={() => setStyle('south')}>South Indian</button>
        </div>
        <div className={styles.svgWrap}>
          {style === 'north' ? (
            <NorthIndianChart
              planets={planets}
              onPlanetHover={handlePlanetHover}
              onPlanetLeave={() => setTooltip(null)}
              onHouseHover={(house, e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const containerRect = (e.currentTarget.closest(`.${styles.svgWrap}`) as HTMLElement)?.getBoundingClientRect();
                if (!containerRect) return;
                setHouseTooltip({ text: HOUSE_MEANINGS[house] || '', x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top });
              }}
              onHouseLeave={() => setHouseTooltip(null)}
            />
          ) : (
            <SouthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={handlePlanetHover} onPlanetLeave={() => setTooltip(null)} />
          )}

          {tooltip && (
            <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}>
              {tooltip.text.split('\n').map((line, i) => (
                <div key={i} className={i === 0 ? styles.tooltipTitle : styles.tooltipDeg}>{line}</div>
              ))}
            </div>
          )}

          {houseTooltip && (
            <div className={styles.tooltip} style={{ left: houseTooltip.x, top: houseTooltip.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}>
              <div className={styles.tooltipTitle}>{houseTooltip.text}</div>
            </div>
          )}
        </div>
      </div>

      <div className={styles.planetList}>
        <h3 className={styles.planetListTitle}>{title}</h3>
        {subtitle && <p className={styles.chartNote} style={{ textAlign: 'left', marginBottom: 'var(--space-3)' }}>{subtitle}</p>}
        {planets.map(p => (
          <div key={p.id} className={styles.planetRow}>
            <span className={styles.planetSymbol}>{p.symbol}</span>
            <span className={styles.planetName}>{p.name}</span>
            <span className={styles.planetSign}>{p.sign}{p.decimalDegree ? ` ${p.decimalDegree}` : ''}{p.retrograde ? ' ℞' : ''}</span>
            <span className={styles.planetHouse}>{p.house}H</span>
          </div>
        ))}
        <div className={styles.chartNote}>Hover over planets and houses to explore their meanings. ℞ marks a retrograde planet.</div>
      </div>
    </div>
  );
}

// ---- North Indian chart geometry, verified against real chart topology ----
// A square with both full corner-to-corner diagonals plus the diamond
// connecting the four edge midpoints. Together these create exactly 12
// regions: 4 "kite" quadrilaterals at the cardinal points (houses 1/4/7/10,
// the Kendras) and 8 corner triangles pairing up around each corner for the
// rest. House 1 (Lagna) is always the top kite, and house numbers increase
// clockwise — confirmed against multiple sources: "house 2 sits to the
// right of house 1." (The previous version of this chart placed numbers at
// arbitrary hand-picked pixel coordinates that didn't correspond to any
// actual drawn boundary — this rewrite fixes that from the geometry up.)
const NORTH_HOUSE_POLYGONS: Record<number, [number, number][]> = {
  1: [[100, 100], [200, 200], [300, 100], [200, 0]],
  2: [[200, 0], [300, 100], [400, 0]],
  3: [[300, 100], [400, 200], [400, 0]],
  4: [[300, 100], [200, 200], [300, 300], [400, 200]],
  5: [[300, 300], [400, 400], [400, 200]],
  6: [[300, 300], [200, 400], [400, 400]],
  7: [[100, 300], [200, 400], [300, 300], [200, 200]],
  8: [[100, 300], [0, 400], [200, 400]],
  9: [[0, 200], [0, 400], [100, 300]],
  10: [[0, 200], [100, 300], [200, 200], [100, 100]],
  11: [[0, 0], [0, 200], [100, 100]],
  12: [[0, 0], [100, 100], [200, 0]],
};
const NORTH_CENTER: [number, number] = [200, 200];

function polygonCentroid(points: [number, number][]): [number, number] {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

// House-number label sits near the polygon's own outermost vertex (pulled
// 20% back toward center), matching how printed charts keep the number in
// a corner of the cell rather than overlapping the planets in its middle.
function outerLabelPos(points: [number, number][]): [number, number] {
  let best = points[0], bestDist = -1;
  for (const p of points) {
    const d = (p[0] - NORTH_CENTER[0]) ** 2 + (p[1] - NORTH_CENTER[1]) ** 2;
    if (d > bestDist) { bestDist = d; best = p; }
  }
  return [best[0] + 0.2 * (NORTH_CENTER[0] - best[0]), best[1] + 0.2 * (NORTH_CENTER[1] - best[1])];
}

interface KundliChartProps {
  planets: ChartPlanet[];
  onPlanetHover: (p: ChartPlanet, e: React.MouseEvent) => void;
  onPlanetLeave: () => void;
  onHouseHover: (house: number, e: React.MouseEvent) => void;
  onHouseLeave: () => void;
}

function NorthIndianChart({ planets, onPlanetHover, onPlanetLeave, onHouseHover, onHouseLeave }: KundliChartProps) {
  const BOX = 400;
  const planetsByHouse: Record<number, ChartPlanet[]> = {};
  planets.forEach(p => { (planetsByHouse[p.house] ||= []).push(p); });

  return (
    <svg viewBox={`0 0 ${BOX} ${BOX}`} width="100%" height="100%" className={styles.kundliSvg}>
      <rect width={BOX} height={BOX} className={styles.svgBg} rx="12" />
      <rect x="2" y="2" width={BOX - 4} height={BOX - 4} fill="none" className={styles.chartBorder} strokeWidth="1" rx="10" />

      {/* The real structural frame: both diagonals plus the edge-midpoint diamond */}
      <line x1="0" y1="0" x2={BOX} y2={BOX} className={styles.chartLine} strokeWidth="0.8" />
      <line x1={BOX} y1="0" x2="0" y2={BOX} className={styles.chartLine} strokeWidth="0.8" />
      <polygon points="200,0 400,200 200,400 0,200" fill="none" className={styles.chartPolygon} strokeWidth="0.8" />

      {/* Invisible per-house hit areas, using the true polygon boundaries */}
      {Object.entries(NORTH_HOUSE_POLYGONS).map(([hStr, points]) => (
        <polygon
          key={`hover-${hStr}`}
          points={points.map(p => p.join(',')).join(' ')}
          fill="transparent"
          className={styles.houseHover}
          onMouseEnter={e => onHouseHover(Number(hStr), e)}
          onMouseLeave={onHouseLeave}
        />
      ))}

      {/* House numbers, anchored toward each cell's outer corner */}
      {Object.entries(NORTH_HOUSE_POLYGONS).map(([hStr, points]) => {
        const [lx, ly] = outerLabelPos(points);
        return (
          <text key={`num-${hStr}`} x={lx} y={ly + 3} textAnchor="middle" fontSize="9" className={styles.houseNumberText} fontFamily="DM Sans, sans-serif">
            {hStr}
          </text>
        );
      })}

      {/* Planets, stacked around each house's centroid */}
      {planets.map(planet => {
        const points = NORTH_HOUSE_POLYGONS[planet.house];
        if (!points) return null;
        const [cx, cy] = polygonCentroid(points);
        const planetsInHouse = planetsByHouse[planet.house] || [];
        const idx = planetsInHouse.indexOf(planet);
        const cols = planetsInHouse.length > 2 ? 2 : 1;
        const px = cx + (idx % cols) * 32 - ((cols - 1) * 16);
        const py = cy + Math.floor(idx / cols) * 22 - (Math.ceil(planetsInHouse.length / cols) > 1 ? 11 : 0);

        return (
          <g key={planet.id} className={styles.planetGroup} onMouseEnter={e => onPlanetHover(planet, e)} onMouseLeave={onPlanetLeave}>
            <text x={px} y={py} textAnchor="middle" fontSize="11" className={styles.planetSymbolText} fontFamily="DM Sans, sans-serif">
              {planet.symbol}
            </text>
            <text x={px} y={py + 10} textAnchor="middle" fontSize="6" className={styles.planetNameText} fontFamily="DM Sans, sans-serif">
              {planet.decimalDegree || ''}{planet.retrograde ? ' ℞' : ''}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---- South Indian chart — a fixed 4x4 grid where each of the 12 outer
// cells is permanently one rashi (never rotates with the Ascendant, unlike
// North Indian); the Ascendant is marked with a small corner notch inside
// whichever cell matches its sign. This is the other major regional chart
// format, requested alongside North Indian. ----
const SOUTH_GRID: (string | null)[][] = [
  ['Pisces', 'Aries', 'Taurus', 'Gemini'],
  ['Aquarius', null, null, 'Cancer'],
  ['Capricorn', null, null, 'Leo'],
  ['Sagittarius', 'Scorpio', 'Libra', 'Virgo'],
];

function SouthIndianChart({ planets, ascendantRashi, onPlanetHover, onPlanetLeave }: { planets: ChartPlanet[]; ascendantRashi: string; onPlanetHover: (p: ChartPlanet, e: React.MouseEvent) => void; onPlanetLeave: () => void }) {
  const BOX = 400;
  const CELL = 100;
  const planetsByRashi: Record<string, ChartPlanet[]> = {};
  planets.filter(p => p.id !== 'asc').forEach(p => { (planetsByRashi[p.sign] ||= []).push(p); });

  return (
    <svg viewBox={`0 0 ${BOX} ${BOX}`} width="100%" height="100%" className={styles.kundliSvg}>
      <rect width={BOX} height={BOX} className={styles.svgBg} rx="12" />
      <rect x="2" y="2" width={BOX - 4} height={BOX - 4} fill="none" className={styles.chartBorder} strokeWidth="1" rx="10" />

      {SOUTH_GRID.map((row, r) => row.map((rashi, c) => {
        const x = c * CELL, y = r * CELL;
        if (!rashi) return <rect key={`${r}-${c}`} x={x} y={y} width={CELL} height={CELL} fill="none" className={styles.chartMidLine} strokeWidth="0.6" />;
        const inHouse = planetsByRashi[rashi] || [];
        const isAscendant = rashi === ascendantRashi;
        return (
          <g key={rashi}>
            <rect x={x} y={y} width={CELL} height={CELL} fill="none" className={styles.chartBorder} strokeWidth="0.8" />
            <text x={x + 6} y={y + 13} fontSize="8" className={styles.zodiacText} fontFamily="DM Sans, sans-serif">{rashi.slice(0, 3)}</text>
            {isAscendant && <line x1={x} y1={y} x2={x + 22} y2={y + 22} className={styles.chartLine} strokeWidth="1.4" />}
            {inHouse.map((p, i) => {
              const cols = inHouse.length > 2 ? 2 : 1;
              const px = x + 30 + (i % cols) * 32;
              const py = y + 45 + Math.floor(i / cols) * 26;
              return (
                <g key={p.id} className={styles.planetGroup} onMouseEnter={e => onPlanetHover(p, e)} onMouseLeave={onPlanetLeave}>
                  <text x={px} y={py} textAnchor="middle" fontSize="11" className={styles.planetSymbolText} fontFamily="DM Sans, sans-serif">{p.symbol}</text>
                  <text x={px} y={py + 10} textAnchor="middle" fontSize="6" className={styles.planetNameText} fontFamily="DM Sans, sans-serif">
                    {p.decimalDegree || ''}{p.retrograde ? ' ℞' : ''}
                  </text>
                </g>
              );
            })}
          </g>
        );
      }))}

      <text x={200} y={196} textAnchor="middle" fontSize="10" className={styles.zodiacText} fontFamily="DM Sans, sans-serif">South Indian</text>
      <text x={200} y={210} textAnchor="middle" fontSize="7" className={styles.houseNumberText} fontFamily="DM Sans, sans-serif">Asc: {ascendantRashi}</text>
    </svg>
  );
}

// Simple self-contained SVG "image" for a gemstone — a faceted gem shape
// tinted with that stone's real color, so each recommendation card has a
// visual without depending on any external image/icon library or URL.
function GemIcon({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <polygon points="24,4 40,16 34,44 14,44 8,16" fill={color} stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
      <polygon points="24,4 40,16 24,20 8,16" fill="rgba(255,255,255,0.35)" />
      <line x1="24" y1="4" x2="24" y2="44" stroke="rgba(0,0,0,0.15)" strokeWidth="0.75" />
      <line x1="8" y1="16" x2="40" y2="16" stroke="rgba(0,0,0,0.15)" strokeWidth="0.75" />
    </svg>
  );
}

// A Rudraksha bead icon — a round bead with radial facet lines equal to the
// mukhi (face) count, so the count itself is visually legible.
function RudrakshaIcon({ mukhi }: { mukhi: number }) {
  const lines = Array.from({ length: mukhi }, (_, i) => {
    const angle = (i / mukhi) * Math.PI * 2;
    return { x2: 24 + Math.cos(angle) * 18, y2: 24 + Math.sin(angle) * 18 };
  });
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="#5c3a21" stroke="#2e1c0f" strokeWidth="1.5" />
      {lines.map((l, i) => (
        <line key={i} x1="24" y1="24" x2={l.x2} y2={l.y2} stroke="#8d5a35" strokeWidth="1" />
      ))}
      <circle cx="24" cy="24" r="3" fill="#c7a15a" />
    </svg>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
