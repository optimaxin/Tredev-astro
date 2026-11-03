// Shapes a Stage 6 report into the ONLY form a browser ever receives.
//
// Stage 6's public_view() already removes raw retrieval evidence and chunk
// ids, but what it returns still carries things a report reader has no use
// for and some that must not leave the server: `chart_context.source` (the
// Kundli Engine's deployment URL and a local filesystem path), LLM usage and
// cost figures, quality-gate and validation internals, per-section
// generation/retrieval metadata, and the full normalized chart. This module
// is an allowlist: anything not named here is dropped, so a field Stage 6
// adds later stays server-side by default instead of leaking by default.
//
// The chart view below is the minimum the report viewer needs to DRAW the
// chart. Every value is copied from the engine-derived chart_context
// unchanged — nothing is recomputed here, and a section the engine did not
// return stays null rather than being filled in.

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const int = (v: unknown, lo: number, hi: number): number | null => (Number.isInteger(v) && (v as number) >= lo && (v as number) <= hi ? (v as number) : null);
const bool = (v: unknown): boolean | null => (typeof v === 'boolean' ? v : null);
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

const SECTION_FIELDS = ['section_id', 'title', 'kind', 'status', 'content', 'key_points', 'unavailable_factors', 'error'] as const;

function viewSection(s: unknown): Json | null {
  if (!isObj(s) || typeof s.section_id !== 'string') return null;
  const out: Json = {};
  for (const k of SECTION_FIELDS) if (k in s) out[k] = s[k];
  // A section error can carry an internal stage name or provider detail;
  // keep only what a reader can act on.
  if (isObj(out.error)) out.error = { code: str(out.error.code), message: str(out.error.message) };
  return out;
}

function period(p: unknown): Json | null {
  if (!isObj(p)) return null;
  const lord = str(p.lord), starts = str(p.starts_at), ends = str(p.ends_at);
  if (!lord || !starts || !ends) return null;
  return { lord, starts_at: starts, ends_at: ends };
}

function placements(v: unknown): Json[] {
  return arr(v).flatMap(p => {
    if (!isObj(p)) return [];
    const planet = str(p.planet), rashi = str(p.rashi), house = int(p.house, 1, 12);
    return planet && rashi && house ? [{ planet, rashi, house }] : [];
  });
}

// Malformed sub-sections become null (the viewer shows them as unavailable)
// instead of failing the whole report.
export function toChartView(ctx: unknown): Json | null {
  if (!isObj(ctx) || !isObj(ctx.lagna) || !Array.isArray(ctx.planets)) return null;
  const lagnaRashi = str(ctx.lagna.rashi);
  if (!lagnaRashi) return null;

  const planets = ctx.planets.flatMap(p => {
    if (!isObj(p)) return [];
    const planet = str(p.planet), rashi = str(p.rashi), house = int(p.house, 1, 12);
    if (!planet || !rashi || !house) return [];
    return [{
      planet,
      classical: bool(p.classical),
      rashi,
      degree_in_sign: num(p.degree_in_sign),
      house,
      nakshatra: str(p.nakshatra),
      nakshatra_pada: int(p.nakshatra_pada, 1, 4),
      nakshatra_lord: str(p.nakshatra_lord),
      retrograde: bool(p.retrograde),
    }];
  });

  const b = isObj(ctx.birth_details) ? ctx.birth_details : null;
  const dasha = isObj(ctx.dasha) ? ctx.dasha : null;
  const vim = dasha && isObj(dasha.vimshottari) ? dasha.vimshottari : null;
  const yog = dasha && isObj(dasha.yogini) ? dasha.yogini : null;

  const divisional = isObj(ctx.divisional_charts)
    ? Object.fromEntries(Object.entries(ctx.divisional_charts).flatMap(([code, c]) => {
        if (!/^D\d{1,2}$/.test(code) || !isObj(c) || !str(c.ascendant_rashi)) return [];
        return [[code, { ascendant_rashi: c.ascendant_rashi, placements: placements(c.placements) }]];
      }))
    : null;

  const doshas = isObj(ctx.doshas) ? ctx.doshas : null;

  return {
    // Only what the cover and birth-chart caption print. Latitude/longitude
    // are deliberately left out — the chart is already drawn, and the
    // owner's own Birth Details section carries them in full.
    birth: b ? { date: str(b.date), time: str(b.time), place: str(b.place_label), timezone_offset_minutes: num(b.timezone_offset_minutes) } : null,
    lagna: { rashi: lagnaRashi, degree_in_sign: num(ctx.lagna.degree_in_sign) },
    planets,
    moon_nakshatra: isObj(ctx.moon_nakshatra)
      ? { name: str(ctx.moon_nakshatra.name), pada: int(ctx.moon_nakshatra.pada, 1, 4), lord: str(ctx.moon_nakshatra.lord) }
      : null,
    // `active` flags are NOT forwarded: they were computed on the day the
    // chart was fetched and go stale. The viewer derives the current period
    // from the real dates against today.
    vimshottari: vim
      ? arr(vim.timeline).flatMap(md => {
          const p = period(md);
          if (!p || !isObj(md)) return [];
          return [{ ...p, antardashas: arr(md.antardashas).map(period).filter(Boolean) }];
        })
      : null,
    yogini: yog
      ? arr(yog.timeline).flatMap(y => {
          const p = period(y);
          return p && isObj(y) ? [{ ...p, yogini: str(y.yogini) }] : [];
        })
      : null,
    divisional_charts: divisional && Object.keys(divisional).length ? divisional : null,
    planet_strength: Array.isArray(ctx.planet_strength)
      ? ctx.planet_strength.flatMap(s => {
          if (!isObj(s)) return [];
          const planet = str(s.planet), rupas = num(s.shadbala_rupas), req = num(s.min_required_rupas);
          return planet && rupas !== null && req !== null ? [{ planet, shadbala_rupas: rupas, min_required_rupas: req, is_strong: bool(s.is_strong) }] : [];
        })
      : null,
    doshas: doshas
      ? {
          kaal_sarp: isObj(doshas.kaal_sarp) ? { present: bool(doshas.kaal_sarp.present) } : null,
          sade_sati: isObj(doshas.sade_sati) ? { active: bool(doshas.sade_sati.active), phase: str(doshas.sade_sati.phase) } : null,
          pitra: isObj(doshas.pitra) ? { present: bool(doshas.pitra.present) } : null,
        }
      : null,
    // When the time-dependent facts above (Sade Sati) were computed.
    as_of: isObj(ctx.source) ? str(ctx.source.time_dependent_as_of) : null,
  };
}

export function toClientReport(report: Json, subject: { name: string | null; date: string | null; place: string | null }): Json {
  return {
    report_id: report.report_id,
    status: report.status,
    created_at: report.created_at,
    updated_at: report.updated_at,
    error: isObj(report.error) ? { code: str(report.error.code), message: str(report.error.message) } : null,
    section_status: isObj(report.section_status) ? report.section_status : {},
    sections: arr(report.sections).map(viewSection).filter(Boolean),
    chart: toChartView(report.chart_context),
    subject,
  };
}
