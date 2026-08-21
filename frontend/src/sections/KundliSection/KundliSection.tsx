import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { HOUSE_MEANINGS } from '../../data/mockData';
import BirthDetailsForm from '../../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../components/BirthDetailsForm/BirthDetailsForm';
import { toSavedBirthDetails } from '../../utils/birthDetails';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { KundliResult } from '../../services/calculatorService';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import { PLANET_META } from '../../data/planetMeta';
import styles from './KundliSection.module.css';

interface ChartPlanet {
  id: string;
  symbol: string;
  name: string;
  sign: string;
  house: number;
  degree: string;
  quality: string;
  retrograde?: boolean;
}

function formatDegree(degreeInSign: number): string {
  const deg = Math.floor(degreeInSign);
  const min = Math.round((degreeInSign - deg) * 60);
  return `${deg}°${min}'`;
}

// Generic, one-sentence-per-sign Lagna (Ascendant) descriptions — same
// wording for every user with that Ascendant, not personalized.
const ASCENDANT_BLURBS: Record<string, string> = {
  Aries: 'bold, direct, and quick to act — you tend to lead with energy and initiative.',
  Taurus: 'steady, patient, and grounded — you value comfort, stability, and follow-through.',
  Gemini: 'curious, communicative, and adaptable — you take in and process the world quickly.',
  Cancer: 'sensitive, nurturing, and protective — your instincts and emotions run deep.',
  Leo: 'confident, expressive, and warm — you naturally draw attention and like to lead.',
  Virgo: 'analytical, precise, and service-minded — you notice detail others miss.',
  Libra: 'diplomatic, balanced, and relationship-focused — you seek fairness and harmony.',
  Scorpio: 'intense, private, and resilient — you go deep rather than staying on the surface.',
  Sagittarius: "optimistic, independent, and philosophical — you're drawn to growth and exploration.",
  Capricorn: 'disciplined, ambitious, and practical — you build things that last.',
  Aquarius: 'independent, original, and idea-driven — you often think ahead of the crowd.',
  Pisces: "imaginative, empathetic, and intuitive — you feel and absorb what's around you.",
};

function buildOverview(result: KundliResult): string[] {
  const asc = result.ascendant.rashi;
  const moon = result.planets.find(p => p.id === 'moon');
  const sun = result.planets.find(p => p.id === 'sun');
  const lines: string[] = [];
  lines.push(`Your Ascendant (Lagna) is ${asc} — placed in your 1st house by definition, this is the lens the rest of the chart is read through: ${ASCENDANT_BLURBS[asc] || 'it colors how you come across to others.'}`);
  if (moon) {
    lines.push(`Your Moon is in ${moon.rashi} in your ${ordinal(moon.house)} house, and your Janma Nakshatra is ${result.moonNakshatra.name} (Pada ${result.moonNakshatra.pada}) — this shapes your emotional nature and instinctive reactions.`);
  }
  if (sun) {
    lines.push(`Your Sun is in ${sun.rashi} in your ${ordinal(sun.house)} house — in Vedic astrology this points to where you seek purpose, recognition, and authority.`);
  }
  return lines;
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
  const { birthProfile, setBirthProfile, setKundliGenerated, currentUser } = useAppContext();
  const [kundliResult, setKundliResult] = useState<KundliResult | null>(null);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [houseTooltip, setHouseTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const chartPlanets = kundliResult ? toChartPlanets(kundliResult) : [];
  const savedBirthDetails = toSavedBirthDetails(currentUser);

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    try {
      const result = await calculatorService.kundli(details);
      setKundliResult(result);
      setBirthProfile({ ...birthProfile, name: details.name, dob: details.date, tob: details.time, place: details.placeName });
      setKundliGenerated(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not generate your Kundli. Please try again.');
    }
  };

  const handlePlanetHover = (planet: ChartPlanet, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.closest('#kundli-chart') as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltip({
      text: `${planet.name} · ${planet.sign} · ${ordinal(planet.house)} House\n${planet.degree}\n${planet.quality}`,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 10,
    });
  };

  return (
    <section className={styles.section} id="kundli">
      <CelestialBackdrop variant="kundli" intensity="medium" />
      <div className={styles.container}>
        <AnimatePresence mode="wait">
          {!kundliResult ? (
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
                  onClick={() => setKundliResult(null)}
                  id="kundli-edit-btn"
                >
                  Edit Details
                </button>
              </div>

              <div className={styles.chartLayout}>
                {/* SVG Chart */}
                <div className={styles.svgWrap} id="kundli-chart">
                  <KundliChart
                    planets={chartPlanets}
                    onPlanetHover={handlePlanetHover}
                    onPlanetLeave={() => setTooltip(null)}
                    onHouseHover={(house, e) => {
                      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                      const containerRect = (e.currentTarget.closest('#kundli-chart') as HTMLElement)?.getBoundingClientRect();
                      if (!containerRect) return;
                      setHouseTooltip({
                        text: HOUSE_MEANINGS[house] || '',
                        x: rect.left - containerRect.left + rect.width / 2,
                        y: rect.top - containerRect.top,
                      });
                    }}
                    onHouseLeave={() => setHouseTooltip(null)}
                  />

                  {/* Planet Tooltip */}
                  {tooltip && (
                    <div
                      className={styles.tooltip}
                      style={{ left: tooltip.x, top: tooltip.y, transform: 'translate(-50%, -100%)' }}
                    >
                      {tooltip.text.split('\n').map((line, i) => (
                        <div key={i} className={i === 0 ? styles.tooltipTitle : i === 2 ? styles.tooltipQuality : styles.tooltipDeg}>
                          {line}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* House Tooltip */}
                  {houseTooltip && (
                    <div
                      className={styles.tooltip}
                      style={{ left: houseTooltip.x, top: houseTooltip.y, transform: 'translate(-50%, -100%) translateY(-8px)' }}
                    >
                      <div className={styles.tooltipTitle}>{houseTooltip.text}</div>
                    </div>
                  )}
                </div>

                {/* Planet List */}
                <div className={styles.planetList}>
                  <h3 className={styles.planetListTitle}>Planetary Placements</h3>
                  {chartPlanets.map(p => (
                    <div key={p.id} className={styles.planetRow}>
                      <span className={styles.planetSymbol}>{p.symbol}</span>
                      <span className={styles.planetName}>{p.name}</span>
                      <span className={styles.planetSign}>{p.sign}</span>
                      <span className={styles.planetHouse}>{p.house}H</span>
                    </div>
                  ))}
                  <div className={styles.chartNote}>
                    Hover over planets and houses to explore their meanings.
                  </div>
                </div>
              </div>

              {/* Plain-language overview — lets you sanity-check the chart above */}
              {kundliResult && (
                <div className={styles.overview}>
                  <h3 className={styles.overviewTitle}>What This Chart Means</h3>
                  {buildOverview(kundliResult).map((line, i) => (
                    <p key={i} className={styles.overviewText}>{line}</p>
                  ))}
                  <p className={styles.chartNote}>
                    To verify: the Ascendant/Moon/Sun signs and houses named above should exactly match what's shown in the chart and Planetary Placements list — including on any other Kundli tool given the same birth date, time, and place.
                  </p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
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

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
