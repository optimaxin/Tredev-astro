import type { PanchangResult } from '../../services/calculatorService';
import {
  HINDI_WEEKDAY, HINDI_RASHI, HINDI_NAKSHATRA, HINDI_TITHI, HINDI_YOGA, HINDI_KARANA,
  HINDI_PLANET, PAKSHA_HI, hindiTime12, hindiOr, formatPanchangTransition, isValidInterval,
} from '../../utils/panchangHindi';

// The share-only layout: a traditional printed-almanac poster, deliberately
// NOT what the site itself shows. The on-page card stays the light dashboard
// it always was; this renders off-screen at a fixed 900px width purely so
// html2canvas has something poster-shaped to capture (see Panchang.tsx's
// shareCard). Everything here is inline-styled with literal colors — no CSS
// variables, gradients-on-text, filters or shadows — because html2canvas
// renders those unreliably, and a share image that silently loses its
// styling is worse than a plain one.

// U+FE0E (variation selector-15) forces TEXT presentation — without it most
// platforms render these astrological signs as full-colour emoji, which on a
// gold-on-maroon almanac reads as a pile of stray purple blobs.
const TEXT = '︎';

// Follows the site's own theme, so a light-themed site never shares a dark
// poster (and vice versa).
interface Palette {
  page: string; panel: string; edge: string; gold: string; goldDim: string; ink: string; accent: string;
}
const PALETTES: Record<'dark' | 'light', Palette> = {
  dark: { page: '#1a0c04', panel: '#2a150a', edge: '#6b4519', gold: '#e3b55f', goldDim: '#b98f43', ink: '#f4e3bd', accent: '#c4501f' },
  light: { page: '#faf5e9', panel: '#fffdf6', edge: '#dcc9a0', gold: '#9b6f1f', goldDim: '#a8895a', ink: '#3a2c18', accent: '#b8501d' },
};

const MAAS_HI: Record<string, string> = {
  Chaitra: 'चैत्र', Vaishakha: 'वैशाख', Jyeshtha: 'ज्येष्ठ', Ashadha: 'आषाढ़',
  Shravana: 'श्रावण', Bhadrapada: 'भाद्रपद', Ashwin: 'आश्विन', Kartika: 'कार्तिक',
  Margashirsha: 'मार्गशीर्ष', Pausha: 'पौष', Magha: 'माघ', Phalguna: 'फाल्गुन',
};

const RITU_HI: Record<string, string> = {
  Vasanta: 'वसंत', Grishma: 'ग्रीष्म', Varsha: 'वर्षा',
  Sharad: 'शरद', Hemanta: 'हेमंत', Shishira: 'शिशिर',
};

const PLANET_GLYPH: Record<string, string> = {
  sun: `☉${TEXT}`, moon: `☾${TEXT}`, mars: `♂${TEXT}`, mercury: `☿${TEXT}`, jupiter: `♃${TEXT}`,
  venus: `♀${TEXT}`, saturn: `♄${TEXT}`, rahu: `☊${TEXT}`, ketu: `☋${TEXT}`,
};

const RASHI_ORDER = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

function Panel({ p, children, style }: { p: Palette; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      border: `1px solid ${p.edge}`, borderRadius: 10, background: p.panel,
      padding: '14px 16px', ...style,
    }}>{children}</div>
  );
}

function PanelTitle({ p, icon, text }: { p: Palette; icon: string; text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontSize: 17, color: p.gold }}>{icon}</span>
      <span style={{ fontSize: 17, color: p.ink, letterSpacing: '0.02em' }}>{text}</span>
    </div>
  );
}

// The 12-sign wheel from a traditional panchang's "राशि स्थिति" corner — the
// site's own zodiac artwork (the same /images/zodiac set the Horoscope
// section uses) around an Om centre, with the Moon's sign highlighted.
function RashiWheel({ p, moonRashi }: { p: Palette; moonRashi: string }) {
  const size = 186;
  const r = size / 2;
  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `1px solid ${p.edge}`, background: p.page,
      }} />
      <div style={{
        position: 'absolute', left: r - 34, top: r - 34, width: 68, height: 68, borderRadius: '50%',
        border: `1px solid ${p.goldDim}`, background: p.panel,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 34, color: p.gold, lineHeight: 1,
      }}>ॐ</div>
      {RASHI_ORDER.map((rashi, i) => {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
        const ring = r - 22;
        const active = rashi === moonRashi;
        return (
          <div
            key={rashi}
            style={{
              position: 'absolute',
              left: r + Math.cos(angle) * ring - 16,
              top: r + Math.sin(angle) * ring - 16,
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              // The artwork is itself gold, so the Moon's sign is marked with
              // a ring on the page colour rather than a filled gold disc —
              // gold-on-gold just swallowed the icon.
              background: active ? p.panel : 'transparent',
              border: active ? `2px solid ${p.gold}` : '2px solid transparent',
            }}
          >
            <img src={`/images/zodiac/${rashi}.png`} alt="" width={22} height={22} style={{ display: 'block' }} />
          </div>
        );
      })}
    </div>
  );
}

export default function PanchangSharePoster({ data, isHindi, location, theme, posterRef, shlok }: {
  data: PanchangResult;
  isHindi: boolean;
  location: string;
  theme: 'dark' | 'light';
  posterRef: React.RefObject<HTMLDivElement | null>;
  /** The day's shlok, set by staff — omitted on days nothing was queued. */
  shlok?: string;
}) {
  const p = PALETTES[theme];
  const lang = isHindi ? 'hi' : 'en';
  const L = (hi: string, en: string) => (isHindi ? hi : en);
  // Clock-only for the fixed points of the day (sunrise/muhurat windows all
  // sit inside the selected date); date-aware for the angas, which regularly
  // end on the following day.
  const time = (iso: string | null) => hindiTime12(iso);
  const moment = (iso: string | null) => formatPanchangTransition(iso, data.date, isHindi);

  const gregorian = new Date(`${data.date}T00:00:00Z`).toLocaleDateString(isHindi ? 'hi-IN' : 'en-IN', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });

  const tithiText = hindiOr(lang, HINDI_TITHI, data.tithi.name);
  const pakshaText = isHindi ? `${PAKSHA_HI[data.tithi.paksha]} पक्ष` : `${data.tithi.paksha} Paksha`;
  const varaText = hindiOr(lang, HINDI_WEEKDAY, data.vara);

  const angaCards = [
    {
      icon: `☽${TEXT}`, title: L('आज की तिथि', "Today's Tithi"), name: tithiText,
      start: data.tithi.start, end: data.tithi.end,
    },
    {
      icon: '✦', title: L('नक्षत्र', 'Nakshatra'), name: hindiOr(lang, HINDI_NAKSHATRA, data.nakshatra.name),
      start: data.nakshatra.start, end: data.nakshatra.end,
    },
    {
      icon: '∞', title: L('योग', 'Yoga'), name: hindiOr(lang, HINDI_YOGA, data.yoga),
      start: data.yogaWindow.start, end: data.yogaWindow.end,
    },
  ];

  const detailRows = [
    {
      icon: `☀${TEXT}`,
      // A day runs through several karanas, so the one shown has to say which
      // it is rather than reading as "the day's karana".
      label: data.angaReference === 'now'
        ? L('करण (वर्तमान)', 'Karana (current)')
        : L('करण (सूर्योदय पर)', 'Karana (at sunrise)'),
      value: hindiOr(lang, HINDI_KARANA, data.karana),
    },
    { icon: '✺', label: L('वार', 'Weekday'), value: varaText },
    { icon: `☾${TEXT}`, label: L('पक्ष', 'Paksha'), value: pakshaText },
    { icon: '❁', label: L('ऋतु', 'Ritu'), value: isHindi ? `${RITU_HI[data.ritu] ?? data.ritu} ऋतु` : `${data.ritu} Ritu` },
    { icon: '◈', label: L('मास', 'Maas'), value: isHindi ? `${MAAS_HI[data.maas] ?? data.maas} मास` : `${data.maas} Maas` },
  ];

  return (
    // Off-screen but fully laid out — html2canvas needs real geometry, so this
    // can't use display:none or visibility:hidden.
    <div style={{ position: 'fixed', left: -10000, top: 0, pointerEvents: 'none', zIndex: -1 }} aria-hidden="true">
      <div
        ref={posterRef}
        data-panchang-poster="true"
        lang={isHindi ? 'hi' : 'en'}
        style={{
          width: 900, background: p.page, color: p.ink, padding: 26,
          fontFamily: "'Noto Serif', 'Georgia', serif",
        }}
      >
        <div style={{ border: `2px solid ${p.goldDim}`, borderRadius: 14, padding: '22px 24px 18px', position: 'relative' }}>
          {/* The same acharya cutout the on-site card carries, so a shared
              poster still reads as this site's. */}
          <img
            src="/images/acharya.png"
            alt=""
            // Height-constrained (not width-) so the cutout always ends above
            // the date bar below it instead of being clipped by that panel.
            style={{ position: 'absolute', right: 12, top: 2, height: 152, width: 'auto' }}
          />

          {/* Masthead */}
          <div style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ color: p.goldDim, fontSize: 14, letterSpacing: '0.35em' }}>❖ ── ✦ ── ❖</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 4 }}>
              <img src="/logo.png" alt="" width={58} height={58} style={{ display: 'block', objectFit: 'contain' }} />
              <span style={{ fontSize: 50, color: p.gold, lineHeight: 1.1, letterSpacing: '0.01em' }}>TredevaAstro</span>
              <span style={{ fontSize: 38, color: p.accent }}>ॐ</span>
            </div>
            <div style={{ marginTop: 10, fontSize: 17, color: p.ink, lineHeight: 1.55 }}>
              वक्रतुंड महाकाय, सूर्यकोटि समप्रभ।<br />
              निर्विघ्नं कुरु मे देव, सर्वकार्येषु सर्वदा॥
            </div>
          </div>

          {/* Date + era bar */}
          <Panel p={p} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 18 }}>
            <span style={{ fontSize: 46, lineHeight: 1, color: p.gold }}>{`☾${TEXT}`}</span>
            <div style={{ flex: 1, textAlign: 'center', fontSize: 19, lineHeight: 1.5 }}>
              <div style={{ color: p.gold }}>{gregorian}</div>
              <div>{varaText}, {pakshaText}</div>
              <div>{tithiText} {L('तिथि', 'Tithi')}</div>
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: p.edge }} />
            <div style={{ flex: 1, textAlign: 'center', fontSize: 19, lineHeight: 1.5 }}>
              <div>{L('विक्रम संवत', 'Vikram Samvat')} {data.samvat.vikram}</div>
              <div>{L('शक संवत', 'Shaka Samvat')} {data.samvat.shaka}</div>
              <div style={{ color: p.goldDim, fontSize: 16 }}>{location}</div>
            </div>
            <span style={{ fontSize: 40, lineHeight: 1, color: p.gold }}>ॐ</span>
          </Panel>

          {/* Tithi / Nakshatra / Yoga */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            {angaCards.map(c => (
              <Panel p={p} key={c.title} style={{ flex: 1, textAlign: 'center' }}>
                <PanelTitle p={p} icon={c.icon} text={c.title} />
                <div style={{ fontSize: 24, color: p.gold, margin: '4px 0 8px' }}>{c.name}</div>
                {/* An interval that doesn't run forwards means the instants
                    themselves are wrong — show the anga without invented
                    times rather than printing an impossible window. */}
                {isValidInterval(c.start, c.end) && (
                  <div style={{ fontSize: 15, lineHeight: 1.6 }}>
                    <div>{L('आरंभ', 'Starts')} — {moment(c.start)}</div>
                    <div>{L('समाप्त', 'Ends')} — {moment(c.end)}</div>
                  </div>
                )}
              </Panel>
            ))}
          </div>

          {/* Sun & Moon timings */}
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <Panel p={p} style={{ flex: 1 }}>
              <PanelTitle p={p} icon="☀" text={L('सूर्योदय एवं सूर्यास्त', 'Sunrise & Sunset')} />
              <div style={{ display: 'flex', textAlign: 'center', fontSize: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: p.goldDim }}>{L('सूर्योदय', 'Sunrise')}</div>
                  <div style={{ fontSize: 19, marginTop: 2 }}>{time(data.sunrise)}</div>
                </div>
                <div style={{ width: 1, background: p.edge }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: p.goldDim }}>{L('सूर्यास्त', 'Sunset')}</div>
                  <div style={{ fontSize: 19, marginTop: 2 }}>{time(data.sunset)}</div>
                </div>
              </div>
            </Panel>
            <Panel p={p} style={{ flex: 1 }}>
              <PanelTitle p={p} icon="☾" text={L('चंद्रोदय एवं चंद्रास्त', 'Moonrise & Moonset')} />
              <div style={{ display: 'flex', textAlign: 'center', fontSize: 16 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ color: p.goldDim }}>{L('चंद्रोदय', 'Moonrise')}</div>
                  <div style={{ fontSize: 19, marginTop: 2 }}>{time(data.moonrise)}</div>
                </div>
                <div style={{ width: 1, background: p.edge }} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: p.goldDim }}>{L('चंद्रास्त', 'Moonset')}</div>
                  <div style={{ fontSize: 19, marginTop: 2 }}>{time(data.moonset)}</div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Details / graha positions / rashi wheel */}
          <Panel p={p} style={{ marginTop: 12, display: 'flex', gap: 18 }}>
            <div style={{ width: 210 }}>
              {detailRows.map(row => (
                <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
                  <span style={{
                    width: 30, height: 30, borderRadius: '50%', border: `1px solid ${p.edge}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: p.gold,
                  }}>{row.icon}</span>
                  <span style={{ fontSize: 15, lineHeight: 1.35 }}>
                    <span style={{ color: p.goldDim }}>{row.label}</span><br />{row.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ width: 1, background: p.edge }} />

            <div style={{ flex: 1 }}>
              <div style={{ textAlign: 'center', color: p.gold, fontSize: 17, marginBottom: 6 }}>
                ✧ {L('ग्रह स्थिति', 'Graha Positions')} ✧
              </div>
              {data.grahaPositions.map(g => (
                <div key={g.id} style={{ display: 'flex', alignItems: 'center', fontSize: 15, padding: '2px 0' }}>
                  <span style={{ width: 24, color: p.gold, fontSize: 16 }}>{PLANET_GLYPH[g.id] ?? '•'}</span>
                  <span style={{ width: 86 }}>{hindiOr(lang, HINDI_PLANET, g.id) === g.id
                    ? g.id.charAt(0).toUpperCase() + g.id.slice(1)
                    : hindiOr(lang, HINDI_PLANET, g.id)}</span>
                  <span style={{ color: p.goldDim, padding: '0 8px' }}>—</span>
                  <span>{hindiOr(lang, HINDI_RASHI, g.rashi)}</span>
                </div>
              ))}
            </div>

            <div style={{ width: 1, background: p.edge }} />

            <div style={{ width: 210 }}>
              <div style={{ textAlign: 'center', color: p.gold, fontSize: 16, marginBottom: 6 }}>
                {L('राशि स्थिति', 'Rashi Positions')}
                <div style={{ fontSize: 13, color: p.goldDim }}>({L('चंद्र राशि अनुसार', 'by Moon sign')})</div>
              </div>
              <RashiWheel p={p} moonRashi={data.moonRashi} />
            </div>
          </Panel>

          {/* Today's notable windows — real computed muhurats, not filler prose */}
          <Panel p={p} style={{ marginTop: 12, display: 'flex', gap: 16, alignItems: 'center' }}>
            <div style={{ width: 96, textAlign: 'center', color: p.gold, fontSize: 16, lineHeight: 1.3 }}>
              {L('आज का', "Today's")}<br />{L('विशेष', 'Highlights')}
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: p.edge }} />
            <div style={{ flex: 1, fontSize: 15, lineHeight: 1.7 }}>
              {data.abhijitMuhurat && (
                <div>{L('अभिजीत मुहूर्त', 'Abhijit Muhurat')} — {time(data.abhijitMuhurat.start)} {L('से', 'to')} {time(data.abhijitMuhurat.end)}</div>
              )}
              {data.rahuKaal && (
                <div>{L('राहु काल', 'Rahu Kaal')} — {time(data.rahuKaal.start)} {L('से', 'to')} {time(data.rahuKaal.end)}</div>
              )}
              {data.sarvarthaSiddhiYoga && (
                <div style={{ color: p.gold }}>{L('सर्वार्थ सिद्धि योग आज विद्यमान है।', 'Sarvartha Siddhi Yoga is present today.')}</div>
              )}
            </div>
          </Panel>

          <div style={{ textAlign: 'center', marginTop: 14, color: p.goldDim, fontSize: 14, letterSpacing: '0.3em' }}>
            ❖ ── ✦ ── ❖
          </div>
          {shlok && (
            <div style={{ textAlign: 'center', marginTop: 8, color: p.gold, fontSize: 16, lineHeight: 1.5, fontStyle: 'italic' }}>
              {shlok}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: 6, color: p.goldDim, fontSize: 14 }}>
            tredevastro.com
          </div>
        </div>
      </div>
    </div>
  );
}
