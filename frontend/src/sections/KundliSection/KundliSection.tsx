import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext } from '../../context/AppContext';
import { KUNDLI_PLANETS, HOUSE_MEANINGS } from '../../data/mockData';
import AncientDatePicker from '../../components/AncientDatePicker/AncientDatePicker';
import AncientTimePicker from '../../components/AncientTimePicker/AncientTimePicker';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import styles from './KundliSection.module.css';

const ZODIAC_SIGNS = ['Ari', 'Tau', 'Gem', 'Can', 'Leo', 'Vir', 'Lib', 'Sco', 'Sag', 'Cap', 'Aqu', 'Pis'];
const ZODIAC_FULL = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

export default function KundliSection() {
  const { birthProfile, setBirthProfile, kundliGenerated, setKundliGenerated, setPage } = useAppContext();
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    tob: '',
    place: '',
  });
  const [loading, setLoading] = useState(false);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [houseTooltip, setHouseTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.dob) return;
    setLoading(true);
    setTimeout(() => {
      setBirthProfile({
        ...birthProfile,
        name: formData.name || birthProfile.name,
        dob: formData.dob || birthProfile.dob,
        tob: formData.tob || birthProfile.tob,
        place: formData.place || birthProfile.place,
      });
      setLoading(false);
      setKundliGenerated(true);
      setPage('kundli-result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 1800);
  };


  const handlePlanetHover = (planet: typeof KUNDLI_PLANETS[0], e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.closest('#kundli-chart') as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;
    setTooltip({
      text: `${planet.name} · ${planet.sign} · ${planet.house}${ordinal(planet.house)} House\n${planet.degree}\n${planet.quality}`,
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top - 10,
    });
  };

  return (
    <section className={styles.section} id="kundli">
      <CelestialBackdrop variant="kundli" intensity="medium" />
      <div className={styles.container}>
        <AnimatePresence mode="wait">
          {!kundliGenerated ? (
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

              {/* Form */}
              <form className={styles.form} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="kundli-name">Full Name</label>
                    <input
                      id="kundli-name"
                      type="text"
                      className={`${styles.input} input-field input-cosmos`}
                      placeholder="Your full name"
                      value={formData.name}
                      onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="kundli-dob">Date of Birth</label>
                    <AncientDatePicker
                      className={`${styles.input} input-field input-cosmos`}
                      value={formData.dob}
                      onChange={val => setFormData(p => ({ ...p, dob: val }))}
                      required
                      placeholder="Select Date of Birth"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="kundli-tob">Time of Birth</label>
                    <AncientTimePicker
                      className={`${styles.input} input-field input-cosmos`}
                      value={formData.tob}
                      onChange={val => setFormData(p => ({ ...p, tob: val }))}
                      placeholder="Select Time of Birth"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label} htmlFor="kundli-place">Place of Birth</label>
                    <input
                      id="kundli-place"
                      type="text"
                      className={`${styles.input} input-field input-cosmos`}
                      placeholder="City, Country"
                      value={formData.place}
                      onChange={e => setFormData(p => ({ ...p, place: e.target.value }))}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className={`${styles.submitBtn} btn btn-gold btn-lg`}
                  disabled={loading || !formData.name || !formData.dob}
                  id="kundli-generate-btn"
                >
                  {loading ? (
                    <>
                      <span className={styles.spinner} />
                      Generating your chart...
                    </>
                  ) : 'Generate My Free Kundli'}
                </button>
                <p className={styles.privacy}>
                  🔒 Your data is private and never shared with third parties.
                </p>
              </form>
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
                  onClick={() => setKundliGenerated(false)}
                  id="kundli-edit-btn"
                >
                  Edit Details
                </button>
              </div>

              <div className={styles.chartLayout}>
                {/* SVG Chart */}
                <div className={styles.svgWrap} id="kundli-chart">
                  <KundliChart
                    planets={KUNDLI_PLANETS}
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
                  {KUNDLI_PLANETS.map(p => (
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}

// ---- North Indian Style Kundli Chart (SVG) ----
interface KundliChartProps {
  planets: typeof KUNDLI_PLANETS;
  onPlanetHover: (p: typeof KUNDLI_PLANETS[0], e: React.MouseEvent) => void;
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
  const planetsByHouse: Record<number, typeof KUNDLI_PLANETS> = {};
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
