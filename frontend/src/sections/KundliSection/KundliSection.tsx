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
  quality?: string;
  retrograde?: boolean;
}

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

// Converts any divisional-chart shape (Navamsa or the D2-D60 varga charts —
// which only carry a final sign + house, not the birth-degree D1 tracks)
// into the same ChartPlanet shape the visual North Indian chart renders, so
// every divisional chart gets an actual diagram, not just a text list.
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
  };
  const planets: ChartPlanet[] = result.planets.map(p => ({
    id: p.id,
    symbol: PLANET_META[p.id]?.symbol || '✦',
    name: PLANET_META[p.id]?.name || p.id,
    quality: PLANET_META[p.id]?.quality || '',
    sign: p.rashi,
    house: p.house,
    degree: formatDegree(p.degreeInSign),
    retrograde: p.retrograde,
  }));
  return [asc, ...planets];
}

export default function KundliSection() {
  const { birthProfile, setBirthProfile, setKundliGenerated, currentUser, isLoggedIn, saveBirthDetails, setPage } = useAppContext();
  const [fullResult, setFullResult] = useState<KundliFullResult | null>(null);
  const [submittedDetails, setSubmittedDetails] = useState<BirthDetailsSubmitValue | null>(null);
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedVarga, setSelectedVarga] = useState('D10');
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
                  <ChartDisplay title="Planetary Placements" planets={chartPlanets} />

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

              {activeTab === 'charts' && (
                <>
                  <ChartDisplay
                    title="Navamsa (D9)"
                    subtitle="The secondary chart classically used to judge marriage, spouse, and the inner strength of what D1 shows."
                    planets={toSimpleChartPlanets(fullResult.navamsaChart)}
                  />

                  <div className={styles.overview}>
                    <div className={styles.overviewTitleRow}>
                      <h3 className={styles.overviewTitle}>{VARGA_LABELS[selectedVarga] || selectedVarga}</h3>
                      <select className={styles.vargaSelect} value={selectedVarga} onChange={e => setSelectedVarga(e.target.value)}>
                        {Object.keys(fullResult.vargaCharts).map(key => (
                          <option key={key} value={key}>{VARGA_LABELS[key] || key}</option>
                        ))}
                      </select>
                    </div>
                    {fullResult.vargaCharts[selectedVarga] && (
                      <ChartDisplay title={`${VARGA_LABELS[selectedVarga] || selectedVarga} Placements`} planets={toSimpleChartPlanets(fullResult.vargaCharts[selectedVarga])} />
                    )}
                  </div>
                </>
              )}

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
                  <p className={styles.overviewText}>Each point's Sign, Sign Lord, Star (Nakshatra) Lord, and Sub Lord — the core KP technique. Based on the whole-sign Ascendant, not a full Bhav Chalit cuspal chart.</p>
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

// ---- Chart + planet-list panel, reused for D1, D9, and every D2-D60 varga
// chart — each instance owns its own tooltip state, so multiple charts can
// sit on the same tab without interfering with each other. ----
function ChartDisplay({ title, subtitle, planets }: { title: string; subtitle?: string; planets: ChartPlanet[] }) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [houseTooltip, setHouseTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const handlePlanetHover = (planet: ChartPlanet, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.closest(`.${styles.svgWrap}`) as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;
    const lines = [`${planet.name} · ${planet.sign} · ${ordinal(planet.house)} House`, planet.degree, planet.quality].filter(Boolean);
    setTooltip({ text: lines.join('\n'), x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top - 10 });
  };

  return (
    <div className={styles.chartLayout}>
      <div className={styles.svgWrap}>
        <KundliChart
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

      <div className={styles.planetList}>
        <h3 className={styles.planetListTitle}>{title}</h3>
        {subtitle && <p className={styles.chartNote} style={{ textAlign: 'left', marginBottom: 'var(--space-3)' }}>{subtitle}</p>}
        {planets.map(p => (
          <div key={p.id} className={styles.planetRow}>
            <span className={styles.planetSymbol}>{p.symbol}</span>
            <span className={styles.planetName}>{p.name}</span>
            <span className={styles.planetSign}>{p.sign}</span>
            <span className={styles.planetHouse}>{p.house}H</span>
          </div>
        ))}
        <div className={styles.chartNote}>Hover over planets and houses to explore their meanings.</div>
      </div>
    </div>
  );
}

// ---- North Indian Style Kundli Chart (SVG) ----
interface KundliChartProps {
  planets: ChartPlanet[];
  onPlanetHover: (p: ChartPlanet, e: React.MouseEvent) => void;
  onPlanetLeave: () => void;
  onHouseHover: (house: number, e: React.MouseEvent) => void;
  onHouseLeave: () => void;
}

function KundliChart({ planets, onPlanetHover, onPlanetLeave, onHouseHover, onHouseLeave }: KundliChartProps) {
  const SIZE = 400;
  const C = SIZE / 2;
  const S = SIZE;

  // North Indian diamond layout house positions (center x, center y, house number)
  const HOUSE_CENTERS: Record<number, [number, number]> = {
    1:  [C, C],
    2:  [C + S * 0.25, C - S * 0.25],
    3:  [C + S * 0.375, C],
    4:  [C + S * 0.25, C + S * 0.25],
    5:  [C, C + S * 0.25],
    6:  [C - S * 0.125, C + S * 0.375],
    7:  [C, C],  // mapped
    8:  [C - S * 0.25, C + S * 0.25],
    9:  [C - S * 0.375, C],
    10: [C - S * 0.25, C - S * 0.25],
    11: [C, C - S * 0.25],
    12: [C + S * 0.125, C - S * 0.375],
  };

  // Recalculate for clean North Indian layout
  const HP: Record<number, [number, number]> = {
    1:  [200, 200],
    2:  [300, 100],
    3:  [350, 200],
    4:  [300, 300],
    5:  [200, 350],
    6:  [100, 300],
    7:  [50, 200],
    8:  [100, 100],
    9:  [200, 50],
    10: [300, 300], // reused
    11: [200, 150],
    12: [300, 150],
  };

  // Simpler: use a 4x4 grid approach with triangular cells
  // Outer box: 0,0 to 400,400; diamond inside
  const BOX = 400;
  const MID = BOX / 2;

  // House centers for North Indian chart
  const housePos: Record<number, [number, number]> = {
    1:  [MID, MID],             // center
    2:  [MID + 100, MID - 100], // top-right
    3:  [MID + 160, MID],       // right
    4:  [MID + 100, MID + 100], // bottom-right
    5:  [MID, MID + 160],       // bottom
    6:  [MID - 100, MID + 100], // bottom-left
    7:  [MID - 160, MID],       // left
    8:  [MID - 100, MID - 100], // top-left
    9:  [MID, MID - 160],       // top
    10: [MID + 70, MID + 70],   // inner bottom-right
    11: [MID - 70, MID - 70],   // inner top-left  
    12: [MID + 70, MID - 70],   // inner top-right
  };

  // Map planets to house positions for display
  const planetsByHouse: Record<number, ChartPlanet[]> = {};
  planets.forEach(p => {
    if (!planetsByHouse[p.house]) planetsByHouse[p.house] = [];
    planetsByHouse[p.house].push(p);
  });

  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      width="100%"
      height="100%"
      className={styles.kundliSvg}
    >
      {/* Background */}
      <rect width={BOX} height={BOX} className={styles.svgBg} rx="12" />

      {/* Outer border */}
      <rect x="2" y="2" width={BOX-4} height={BOX-4} fill="none" className={styles.chartBorder} strokeWidth="1" rx="10" />

      {/* Diagonal lines forming the North Indian diamond */}
      <line x1="0" y1="0" x2={MID} y2={MID} className={styles.chartLine} strokeWidth="0.8" />
      <line x1={BOX} y1="0" x2={MID} y2={MID} className={styles.chartLine} strokeWidth="0.8" />
      <line x1="0" y1={BOX} x2={MID} y2={MID} className={styles.chartLine} strokeWidth="0.8" />
      <line x1={BOX} y1={BOX} x2={MID} y2={MID} className={styles.chartLine} strokeWidth="0.8" />

      {/* Mid lines */}
      <line x1={MID} y1="0" x2={MID} y2={BOX} className={styles.chartMidLine} strokeWidth="0.6" />
      <line x1="0" y1={MID} x2={BOX} y2={MID} className={styles.chartMidLine} strokeWidth="0.6" />

      {/* Inner diamond */}
      <polygon
        points={`${MID},${MID*0.4} ${MID*1.6},${MID} ${MID},${MID*1.6} ${MID*0.4},${MID}`}
        className={styles.chartPolygon}
        strokeWidth="0.8"
      />

      {/* House hover areas (invisible rectangles for interaction) */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
        const [cx, cy] = housePos[h] || [MID, MID];
        return (
          <circle
            key={`hover-${h}`}
            cx={cx}
            cy={cy}
            r={30}
            fill="transparent"
            className={styles.houseHover}
            onMouseEnter={e => onHouseHover(h, e)}
            onMouseLeave={onHouseLeave}
          />
        );
      })}

      {/* House numbers */}
      {Array.from({ length: 12 }, (_, i) => i + 1).map(h => {
        const [cx, cy] = housePos[h] || [MID, MID];
        return (
          <text
            key={`h-${h}`}
            x={cx}
            y={cy + 4}
            textAnchor="middle"
            fontSize="10"
            className={styles.houseNumberText}
            fontFamily="DM Sans, sans-serif"
            letterSpacing="0.05em"
          >
            {h}
          </text>
        );
      })}

      {/* Zodiac signs at corners/edges */}
      {[
        [MID, 14, 'Leo'],
        [BOX - 14, MID, 'Sco'],
        [MID, BOX - 8, 'Aqu'],
        [14, MID, 'Tau'],
      ].map(([x, y, sign]) => (
        <text
          key={sign as string}
          x={x as number}
          y={y as number}
          textAnchor="middle"
          fontSize="9"
          className={styles.zodiacText}
          fontFamily="DM Sans, sans-serif"
          letterSpacing="0.05em"
        >
          {sign}
        </text>
      ))}

      {/* Planets */}
      {planets.map(planet => {
        const [bx, by] = housePos[planet.house] || [MID, MID];
        const planetsInHouse = planetsByHouse[planet.house] || [];
        const idx = planetsInHouse.indexOf(planet);
        const offsetX = (idx % 2) * 16 - (planetsInHouse.length > 1 ? 8 : 0);
        const offsetY = Math.floor(idx / 2) * 16 - (planetsInHouse.length > 2 ? 8 : 0);
        const px = bx + offsetX - 8;
        const py = by + offsetY - 20;

        return (
          <g
            key={planet.id}
            className={styles.planetGroup}
            onMouseEnter={e => onPlanetHover(planet, e)}
            onMouseLeave={onPlanetLeave}
          >
            <circle cx={px + 10} cy={py + 10} r="12" className={styles.planetCircle} />
            <text
              x={px + 10}
              y={py + 7}
              textAnchor="middle"
              fontSize="10"
              className={styles.planetSymbolText}
              fontFamily="DM Sans, sans-serif"
            >
              {planet.symbol}
            </text>
            <text
              x={px + 10}
              y={py + 17}
              textAnchor="middle"
              fontSize="7"
              className={styles.planetNameText}
              fontFamily="DM Sans, sans-serif"
            >
              {planet.name.substring(0, 3)}
            </text>
          </g>
        );
      })}
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
