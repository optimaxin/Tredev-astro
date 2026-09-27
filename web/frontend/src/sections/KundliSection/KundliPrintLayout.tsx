import type { ReactNode } from 'react';
import { NorthIndianChart, cap, toChartPlanets, toSimpleChartPlanets } from './KundliCharts';
import { VARGA_LABELS, VARGA_LABELS_HI } from '../../services/calculatorService';
import type { KundliFullResult } from '../../services/calculatorService';
import { HINDI_RASHI, HINDI_NAKSHATRA, HINDI_PLANET, HINDI_TITHI, HINDI_YOGA, HINDI_KARANA, PAKSHA_HI } from '../../utils/panchangHindi';
import chartStyles from './KundliSection.module.css';

// A dedicated, non-interactive, print-styled layout captured via
// html2canvas for the "Download PDF" feature (see handleDownloadPdf in
// KundliSection.tsx). Deliberately plain inline styles rather than the
// site's dark cosmic theme/CSS-module cards — a downloaded report should
// default to a light, ink-friendly page regardless of the viewer's current
// site theme, the same way browser print stylesheets do. The chart
// components (NorthIndianChart) are the one shared piece with the live
// tabs: reusing the exact same, already accuracy-verified component instead
// of re-drawing the chart means a future geometry/data fix never has to be
// applied twice.
//
// Structure/section order modeled on a real commercial report
// (Extra/kundli.pdf): numbered section badges (01 Basic ... 07 Free
// Report), every divisional chart, full prediction text. Every section
// maps to a REAL field already computed by the backend — nothing here is
// invented text.
//
// Density: the FIRST version of this rebuild captured every chart and every
// prediction card as its OWN html2canvas block (~70-90 captures) — modeled
// too literally on the reference's "one item per page" layout. Each capture
// has real fixed overhead regardless of how small the content is, so that
// many of them made generation slow and, on some machines, made it fail
// outright before finishing. Charts and cards inside the SAME topic are
// still batched several-per-block (a grid captured as ONE image), keeping
// capture count down.
//
// Only the 7 NUMBERED sections (data-pdf-newpage on "01 Basic" ... "07 Free
// Report") force a fresh page — that's what "point 1, 2, 3..." means here.
// Everything under a numbered section (Shadbala, KP Cusps, Yogini Dasha,
// Rudraksha, etc.) still packs normally within that section's own pages —
// forcing EVERY sub-heading onto its own page was tried and produced too
// many mostly-blank pages; the generation effect's chapter-scoped packer
// (see KundliSection.tsx) fills each numbered section's pages tightly.
// Every one of the 20 divisional charts is included (05 Charts), so this
// is a real, full-length report, not a condensed one.
//
// Rendered off-screen (see the wrapping div in KundliSection.tsx) — never
// shown to the user, only rasterized.
//
// Hindi/English toggle: `language` picks which set of already-computed
// backend fields to read (result.ascendantPredictions, .dashaPredictions,
// .avakhada, .gemstones, .rudraksha, .yogas all come back pre-translated
// from the backend when the request itself asked for language:'hi' — see
// KundliSection.tsx's language state and calculatorService.kundliFull).
// What this file translates ITSELF is everything the backend can't: every
// static label/heading/table-column here, plus raw computed VALUES the
// core astrology engine always returns in English regardless of language
// (rashi/nakshatra/planet names, yes/no, strong/weak, ordinal house
// numbers) — via the LABELS dictionary and the small helper functions
// below it.
const INK = '#182333', MUTED = '#68717A', FAINT = '#8C8A84', GOLD = '#B58A3B', LINE = '#E8DEC8', TINT = '#F2EBD9', PAGE_BG = '#FAF7F0';
const FONT = { title: 30, section: 14, sub: 12.5, body: 11.5, label: 9.5 };
const COVER_BANNER_SRC = '/images/kundli-cover-banner.jpg';

// Every divisional chart the app computes, in ascending order — D1/D9 are
// already shown in "02 Kundli" above, so only the rest appears here.
const DIVISIONAL_ORDER = ['D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D10', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'];

type SimplePlanets = Parameters<typeof NorthIndianChart>[0]['planets'];
type Language = 'en' | 'hi';

const YOGINI_HI: Record<string, string> = {
  Mangala: 'मंगला', Pingala: 'पिंगला', Dhanya: 'धान्या', Bhramari: 'भ्रामरी',
  Bhadrika: 'भद्रिका', Ulka: 'उल्का', Siddha: 'सिद्धा', Sankata: 'संकटा',
};
const DOSHA_PHASE_HI: Record<string, string> = { rising: 'प्रारंभिक', peak: 'चरम', setting: 'अंतिम' };

// Every static label/heading/table-column in the report, English + Hindi
// side by side — kept as one dictionary (rather than scattered ternaries
// through the JSX below) so the two languages stay easy to compare and
// keep in sync as this file's content changes.
const LABELS = {
  en: {
    brand: 'TredevaAstro · Vedic Astrology Report', generated: 'Generated',
    thankYou: 'Thank You For Reading', brandFooter: 'TREDEVAASTRO · YOUR SKY. YOUR STORY.',
    basic: 'Basic', birthDetails: 'Birth Details', name: 'Name', dob: 'Date of Birth', tob: 'Time of Birth', pob: 'Place of Birth',
    tobNotProvided: 'Not provided',
    timeUnknownNotice: "This Kundli isn't fully accurate — since the exact time of birth wasn't provided, the current time was used as an approximation. Time-sensitive details such as the Ascendant, houses, and exact Nakshatra Pada may differ from the real birth chart.",
    panchang: 'Panchang', tithi: 'Tithi', karana: 'Karana', yoga: 'Yoga', nakshatra: 'Nakshatra', nakshatraLord: 'Nakshatra Lord',
    ascendant: 'Ascendant', sunrise: 'Sunrise', sunset: 'Sunset',
    avakhadaDetails: 'Avakhada Details', varna: 'Varna', vashya: 'Vashya', yoni: 'Yoni', gan: 'Gan', nadi: 'Nadi',
    sign: 'Sign', signLord: 'Sign Lord', charan: 'Charan', tatva: 'Tatva', paya: 'Paya',
    kundli: 'Kundli', lagnaChart: 'Lagna Chart (D1)', navamsaChart: 'Navamsa Chart (D9)',
    planetaryPositions: 'Planetary Positions', colPlanet: 'Planet', colSign: 'Sign', colNakshatra: 'Nakshatra',
    colNakshLord: 'Naksh Lord', colDegree: 'Degree', colRetro: 'Retro', yes: 'Yes', no: 'No',
    vimshottariDasha: 'Vimshottari Dasha', mahadasha: 'Mahadasha', antardasha: 'Antardasha', active: 'active',
    shadbala: 'Shadbala — Planetary Strength', colTotalRupas: 'Total (Rupas)', colRequired: 'Required', colRatio: 'Ratio',
    colVerdict: 'Verdict', strong: 'Strong', weak: 'Weak',
    bhavbala: 'Bhavbala — House Strength', colHouse: 'House', colAdhipatiBala: 'Adhipati Bala', colDigBala: 'Dig Bala',
    colDrikBala: 'Drik Bala', colTotal: 'Total',
    kp: 'KP', bhavChalitChart: 'Bhav Chalit Chart', rulingPlanets: 'Ruling Planets',
    ascSignLord: 'Asc Sign Lord', ascStarLord: 'Asc Star Lord', ascSubLord: 'Asc Sub Lord',
    moonSignLord: 'Moon Sign Lord', moonStarLord: 'Moon Star Lord', moonSubLord: 'Moon Sub Lord', dayLord: 'Day Lord',
    kpPlanets: 'KP Planets', colBhavCusp: 'Bhav (Cusp)', colSignLord: 'Sign Lord', colStarLord: 'Star Lord', colSubLord: 'Sub Lord',
    kpCusps: 'KP Cusps', colCusp: 'Cusp',
    ashtakvarga: 'Ashtakvarga', ashtakvargaDesc: (total: number) => `Total bindus per rashi. SAV is the combined Sarvashtakvarga (total: ${total}).`,
    charts: 'Charts', chartsDesc: 'Every divisional (varga) chart computed for this birth, plus a Moon-referenced Chandra chart.',
    dasha: 'Dasha', dashaDesc: "Each card describes one Mahadasha — what the ruling planet's house and sign placement mean while it runs.",
    yoginiDasha: 'Yogini Dasha', colYogini: 'Yogini', colLord: 'Lord', colStart: 'Start', colEnd: 'End',
    freeReport: 'Free Report', ascendantPredictionsFor: (asc: string) => `Ascendant Predictions — ${asc}`,
    personality: 'Personality', physical: 'Physical', health: 'Health', career: 'Career', relationship: 'Relationship',
    dosAndDonts: "Do's and Don'ts", dos: "Do's", donts: "Don'ts",
    planetaryPredictions: 'Planetary Predictions', considerationFor: (planet: string) => `${planet} Consideration`,
    yogaCombinations: 'Yoga Combinations',
    rudrakshaRecommendation: 'Rudraksha Recommendation', mukhiRudraksha: (mukhi: number, deity: string) => `${mukhi}-Mukhi Rudraksha — ${deity}`,
    ruledBy: (planet: string) => `Ruled by ${planet}.`, howToWear: 'How to wear:', benefits: 'Benefits', precautions: 'Precautions',
    gemstoneRecommendations: 'Gemstone Recommendations', finger: 'finger',
    doshaAnalysis: 'Dosha Analysis', notPresent: 'Not Present',
    kaalSarpDosha: 'Kaal Sarp Dosha', present: 'Present',
    kaalSarpText: (r: string, k: string) => `All planets fall between Rahu (${r}) and Ketu (${k}).`, kaalSarpFreeText: 'Kundli is free from Kaal Sarp Dosha.',
    sadeSati: 'Sade Sati', sadeSatiActive: (p: string) => `Active — ${p}`, notActive: 'Not Active',
    sadeSatiText: (p: string) => `Saturn's Sade Sati is currently in its ${p} phase.`, sadeSatiFreeText: 'Sade Sati is not currently active.',
    journeyContinues: (n: string) => `Your journey continues, ${n}`,
    coverTitle: (n: string) => `${n}'s Kundli`,
    vedicReport: 'Vedic Astrology Report', latitude: 'Latitude', longitude: 'Longitude', timezone: 'Timezone', ascendantLord: 'Ascendant Lord',
    birth: 'Birth', startDate: 'Start Date', endDate: 'End Date',
    shadbalaDesc: 'Six-fold strength analysis of planets — a key metric for evaluating planetary power in your chart.',
    bhavbalaDesc: 'House strength analysis — shows the relative power of each of the 12 bhavas in your chart.',
    component: 'Component', sthanaBala: 'Sthaana Bala', kaalaBala: 'Kaala Bala', cheshtaBala: 'Cheshta Bala', naisargikaBala: 'Naisargika Bala',
    totalShadbala: 'Total Shad Bala', shadbalaRupas: 'Shad Bala Rupas', ranking: 'Ranking', ishtaPhala: 'Ishta Phala', kashtaPhala: 'Kashta Phala',
    totalBhavabala: 'Total Bhava Bala', bhavabalaRupas: 'Bhava Bala (Rupas)',
    description: 'Description', planetaryPredictionsDesc: 'What each planet means for you, based on its house, sign and nakshatra placement.',
    yogaDesc: 'Special planetary alignments present in your chart.', gemstoneDesc: 'Each stone supports a different area of life.',
    gemstone: 'Gemstone', metal: 'Metal', wearOn: 'How to wear', mantra: 'Mantra',
    closingInvite: 'Want a deeper, personalised reading? Chat with a verified TredevaAstro astrologer for one-on-one guidance on your chart.',
    endOfReport: '— End of Report —',
  },
  hi: {
    brand: 'TredevaAstro · वैदिक ज्योतिष रिपोर्ट', generated: 'तैयार किया गया',
    thankYou: 'पढ़ने के लिए धन्यवाद', brandFooter: 'TREDEVAASTRO · आपका आकाश। आपकी कहानी।',
    basic: 'मूल विवरण', birthDetails: 'जन्म विवरण', name: 'नाम', dob: 'जन्म तिथि', tob: 'जन्म समय', pob: 'जन्म स्थान',
    tobNotProvided: 'उपलब्ध नहीं',
    timeUnknownNotice: 'यह कुंडली पूर्ण रूप से सटीक नहीं है — सही जन्म समय उपलब्ध न होने के कारण वर्तमान समय का उपयोग किया गया है। लग्न, भाव और नक्षत्र पद जैसे समय-संवेदनशील विवरण वास्तविक जन्म कुंडली से भिन्न हो सकते हैं।',
    panchang: 'पंचांग', tithi: 'तिथि', karana: 'करण', yoga: 'योग', nakshatra: 'नक्षत्र', nakshatraLord: 'नक्षत्र स्वामी',
    ascendant: 'लग्न', sunrise: 'सूर्योदय', sunset: 'सूर्यास्त',
    avakhadaDetails: 'अवाखड़ा विवरण', varna: 'वर्ण', vashya: 'वश्य', yoni: 'योनि', gan: 'गण', nadi: 'नाड़ी',
    sign: 'राशि', signLord: 'राशि स्वामी', charan: 'चरण', tatva: 'तत्व', paya: 'पाया',
    kundli: 'कुंडली', lagnaChart: 'लग्न चार्ट (D1)', navamsaChart: 'नवांश चार्ट (D9)',
    planetaryPositions: 'ग्रह स्थिति', colPlanet: 'ग्रह', colSign: 'राशि', colNakshatra: 'नक्षत्र',
    colNakshLord: 'नक्ष. स्वामी', colDegree: 'अंश', colRetro: 'वक्री', yes: 'हाँ', no: 'नहीं',
    vimshottariDasha: 'विंशोत्तरी दशा', mahadasha: 'महादशा', antardasha: 'अंतर्दशा', active: 'सक्रिय',
    shadbala: 'षड्बल — ग्रह शक्ति', colTotalRupas: 'कुल (रूपा)', colRequired: 'आवश्यक', colRatio: 'अनुपात',
    colVerdict: 'निष्कर्ष', strong: 'मजबूत', weak: 'कमजोर',
    bhavbala: 'भावबल — भाव शक्ति', colHouse: 'भाव', colAdhipatiBala: 'अधिपति बल', colDigBala: 'दिग् बल',
    colDrikBala: 'दृक् बल', colTotal: 'कुल',
    kp: 'केपी', bhavChalitChart: 'भाव चलित चार्ट', rulingPlanets: 'शासक ग्रह',
    ascSignLord: 'लग्न राशि स्वामी', ascStarLord: 'लग्न नक्षत्र स्वामी', ascSubLord: 'लग्न उप स्वामी',
    moonSignLord: 'चन्द्र राशि स्वामी', moonStarLord: 'चन्द्र नक्षत्र स्वामी', moonSubLord: 'चन्द्र उप स्वामी', dayLord: 'दिन स्वामी',
    kpPlanets: 'केपी ग्रह', colBhavCusp: 'भाव (कस्प)', colSignLord: 'राशि स्वामी', colStarLord: 'नक्षत्र स्वामी', colSubLord: 'उप स्वामी',
    kpCusps: 'केपी कस्प', colCusp: 'कस्प',
    ashtakvarga: 'अष्टकवर्ग', ashtakvargaDesc: (total: number) => `प्रति राशि कुल बिंदु। SAV संयुक्त सर्वाष्टकवर्ग है (कुल: ${total})।`,
    charts: 'चार्ट्स', chartsDesc: 'इस जन्म के लिए गणना किए गए सभी विभाजन (वर्ग) चार्ट, साथ ही चन्द्र-आधारित चंद्र चार्ट।',
    dasha: 'दशा', dashaDesc: 'प्रत्येक कार्ड एक महादशा का वर्णन करता है — इसके दौरान शासक ग्रह की भाव और राशि स्थिति का क्या अर्थ है।',
    yoginiDasha: 'योगिनी दशा', colYogini: 'योगिनी', colLord: 'स्वामी', colStart: 'प्रारंभ', colEnd: 'समाप्ति',
    freeReport: 'निःशुल्क रिपोर्ट', ascendantPredictionsFor: (asc: string) => `लग्न भविष्यवाणी — ${asc}`,
    personality: 'व्यक्तित्व', physical: 'शारीरिक', health: 'स्वास्थ्य', career: 'करियर', relationship: 'संबंध',
    dosAndDonts: 'क्या करें और क्या न करें', dos: 'क्या करें', donts: 'क्या न करें',
    planetaryPredictions: 'ग्रह भविष्यवाणी', considerationFor: (planet: string) => `${planet} विचार`,
    yogaCombinations: 'योग संयोजन',
    rudrakshaRecommendation: 'रुद्राक्ष सुझाव', mukhiRudraksha: (mukhi: number, deity: string) => `${mukhi}-मुखी रुद्राक्ष — ${deity}`,
    ruledBy: (planet: string) => `${planet} द्वारा शासित।`, howToWear: 'कैसे पहनें:', benefits: 'लाभ', precautions: 'सावधानियां',
    gemstoneRecommendations: 'रत्न सुझाव', finger: 'उंगली',
    doshaAnalysis: 'दोष विश्लेषण', notPresent: 'अनुपस्थित',
    kaalSarpDosha: 'कालसर्प दोष', present: 'उपस्थित',
    kaalSarpText: (r: string, k: string) => `सभी ग्रह राहु (${r}) और केतु (${k}) के बीच स्थित हैं।`, kaalSarpFreeText: 'कुंडली कालसर्प दोष से मुक्त है।',
    sadeSati: 'साढ़े साती', sadeSatiActive: (p: string) => `सक्रिय — ${p}`, notActive: 'सक्रिय नहीं',
    sadeSatiText: (p: string) => `शनि की साढ़े साती वर्तमान में अपने ${p} चरण में है।`, sadeSatiFreeText: 'साढ़े साती वर्तमान में सक्रिय नहीं है।',
    journeyContinues: (n: string) => `आपकी यात्रा जारी है, ${n}`,
    coverTitle: (n: string) => `${n} की कुंडली`,
    vedicReport: 'वैदिक ज्योतिष रिपोर्ट', latitude: 'अक्षांश', longitude: 'देशांतर', timezone: 'समय क्षेत्र', ascendantLord: 'लग्न स्वामी',
    birth: 'जन्म', startDate: 'प्रारंभ तिथि', endDate: 'समाप्ति तिथि',
    shadbalaDesc: 'ग्रहों का षड्विध बल विश्लेषण — आपकी कुंडली में ग्रहों की शक्ति आंकने का प्रमुख मापदंड।',
    bhavbalaDesc: 'भाव बल विश्लेषण — आपकी कुंडली के 12 भावों की सापेक्ष शक्ति दर्शाता है।',
    component: 'घटक', sthanaBala: 'स्थान बल', kaalaBala: 'काल बल', cheshtaBala: 'चेष्टा बल', naisargikaBala: 'नैसर्गिक बल',
    totalShadbala: 'कुल षड्बल', shadbalaRupas: 'षड्बल रूपा', ranking: 'क्रम', ishtaPhala: 'इष्ट फल', kashtaPhala: 'कष्ट फल',
    totalBhavabala: 'कुल भावबल', bhavabalaRupas: 'भावबल (रूपा)',
    description: 'विवरण', planetaryPredictionsDesc: 'भाव, राशि और नक्षत्र स्थिति के आधार पर प्रत्येक ग्रह आपके लिए क्या दर्शाता है।',
    yogaDesc: 'आपकी कुंडली में उपस्थित विशेष ग्रह योग।', gemstoneDesc: 'प्रत्येक रत्न जीवन के एक अलग क्षेत्र को सहारा देता है।',
    gemstone: 'रत्न', metal: 'धातु', wearOn: 'कैसे पहनें', mantra: 'मंत्र',
    closingInvite: 'और गहराई से व्यक्तिगत विश्लेषण चाहते हैं? अपनी कुंडली पर व्यक्तिगत मार्गदर्शन के लिए TredevaAstro के सत्यापित ज्योतिषी से बात करें।',
    endOfReport: '— रिपोर्ट समाप्त —',
  },
} as const;

interface KundliPrintLayoutProps {
  name: string;
  dob: string;
  tob: string;
  // When true, `tob` is a substituted current-time value, not the visitor's
  // real birth time — this report prints "Not provided" in its place plus a
  // disclaimer, rather than presenting that substituted clock value as fact.
  timeUnknown?: boolean;
  place: string;
  // For converting the Panchang's UTC sunrise/sunset instants back to the
  // birth place's local clock time — see formatLocalTime below.
  timezoneOffsetMinutes: number;
  // Birth coordinates, printed as-is in Birth Details (optional — older
  // callers such as saved-history resumes may not have them handy).
  latitude?: number;
  longitude?: number;
  result: KundliFullResult;
  // "05 Charts" (Chandra + every D2-D60 varga chart, one full html2canvas
  // capture EACH) is by far the single biggest cost in this report — ~19 of
  // the ~30-40 real captures the generation loop does. D1 and Navamsa (D9)
  // already have their own charts in "02 Kundli" regardless, so skipping
  // this section only drops the extra, rarely-consulted divisional charts,
  // not the two anyone actually looks at. Used by the campaign microsite,
  // where a ~2-3 minute wait is a conversion killer; the main site keeps
  // the full report.
  skipExtraDivisionalCharts?: boolean;
  // Shown on the cover and closing pages instead of the plain circular
  // logo mark — the caller's own hero banner (e.g. the campaign
  // microsite's), so the report carries matching branding. A plain <img>
  // like the rest of this file's decorative images (html2canvas captures
  // the whole cover/closing block as one image, so this rasterizes with
  // everything else — no separate load/draw step needed).
  bannerImageSrc?: string;
  // Picks which pre-translated fields to read off `result` (the backend
  // computes both when asked — see calculatorService.kundliFull's language
  // param) AND which language this file's own labels/computed-value
  // lookups (rashi/nakshatra/planet names, yes/no, ordinals) render in.
  language?: Language;
}

export default function KundliPrintLayout({ name, dob, tob, timeUnknown = false, place, timezoneOffsetMinutes, latitude, longitude, result, skipExtraDivisionalCharts = false, bannerImageSrc, language = 'en' }: KundliPrintLayoutProps) {
  const L = LABELS[language];
  const isHi = language === 'hi';

  // Small helpers for values the core astrology engine always computes in
  // English regardless of `language` (rashi/nakshatra/planet id, ordinal
  // house numbers, yes/no) — the backend only pre-translates PROSE fields
  // (predictions, dosha reasons, remedies), not these raw lookups.
  const rashiText = (r: string) => (isHi ? HINDI_RASHI[r] || r : r);
  const nakshatraText = (n: string) => (isHi ? HINDI_NAKSHATRA[n] || n : n);
  const planetText = (id: string) => (isHi ? HINDI_PLANET[id] || cap(id) : cap(id));
  const yesNoText = (b: boolean) => (b ? L.yes : L.no);
  const yoginiText = (y: string) => (isHi ? YOGINI_HI[y] || y : cap(y));
  const phaseText = (p: string) => (isHi ? DOSHA_PHASE_HI[p] || p : p);
  const tithiText = (t: string) => (isHi ? HINDI_TITHI[t] || t : t);
  const pakshaText = (p: string) => (isHi ? PAKSHA_HI[p] || p : p);
  const yogaNameText = (y: string) => (isHi ? HINDI_YOGA[y] || y : y);
  const karanaText = (k: string) => (isHi ? HINDI_KARANA[k] || k : k);
  // Backend dates are plain YYYY-MM-DD — shown as "Jun 12, 2016" (UTC so the
  // viewer's own timezone can never shift the printed day).
  const fmtDate = (iso: string) => {
    const d = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(isHi ? 'hi-IN' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric', timeZone: 'UTC' });
  };

  const chartPlanets = toChartPlanets(result.kundli, result.bhavChalit);
  const navamsaPlanets = toSimpleChartPlanets(result.navamsaChart);
  const bhavChalitPlanets = toSimpleChartPlanets(result.bhavChalit);
  const chandraPlanets: SimplePlanets = result.chandraChart.planets.map(p => ({
    id: p.id, symbol: '', name: '', sign: p.rashi, house: p.house, degree: undefined, decimalDegree: undefined, quality: '', retrograde: p.retrograde,
  }));

  const gems = [result.gemstones.life, result.gemstones.lucky, result.gemstones.fortune];
  const presentYogas = result.yogas.filter(y => y.present);
  const moonSign = result.kundli.planets.find(p => p.id === 'moon')?.rashi ?? '—';
  // Sign lords straight from the backend's KP table (asc + every planet) —
  // no separate lookup table to drift out of sync with the engine.
  const signLordById = new Map(result.kp.table.map(r => [r.id, r.signLord]));
  const ascLord = signLordById.get('asc');
  const bhavHouseById = new Map(result.bhavChalit.planets.map(p => [p.id, p.house]));
  const generatedDate = new Date().toLocaleDateString(isHi ? 'hi-IN' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  const ASHTAKAVARGA_GROUPS = [
    { label: 'SAV', points: result.ashtakavarga.sarva },
    ...['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'].map(id => ({
      label: planetText(id),
      points: result.ashtakavarga.bhinna.find(b => b.planet === id)?.points ?? [],
    })),
  ];

  const allCharts: { title: string; planets: SimplePlanets; ascendantRashi: string }[] = skipExtraDivisionalCharts ? [] : [
    { title: isHi ? 'चंद्र (चन्द्र)' : 'Chandra (Moon)', planets: chandraPlanets, ascendantRashi: result.chandraChart.moonRashi },
    ...DIVISIONAL_ORDER.map(key => {
      const varga = key === 'D9' ? result.navamsaChart : result.vargaCharts[key];
      if (!varga) return null;
      return { title: isHi ? (VARGA_LABELS_HI[key] || key) : (VARGA_LABELS[key] || key), planets: toSimpleChartPlanets(varga), ascendantRashi: varga.ascendant.rashi };
    }).filter((v): v is { title: string; planets: SimplePlanets; ascendantRashi: string } => v !== null),
  ];

  return (
    <div data-theme="light" style={{ width: 800, position: 'relative', background: '#FAF7F0' }}>
      <div style={{ position: 'relative', zIndex: 1, color: INK, fontFamily: 'DM Sans, sans-serif', padding: 40 }}>

        {/* Cover — its own dedicated first page. `breakAfter: 'page'` is
            what actually enforces that under native print pagination
            (page.pdf() in kundliPdf.routes.ts) — the data-pdf-cover
            attribute itself is only read by the OLD client-side capture
            loop in KundliSection.tsx now; it doesn't mean anything to the
            server-rendered path on its own. */}
        <div data-pdf-block data-pdf-cover="true" style={{ minHeight: 960, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '50px 20px', breakAfter: 'page' }}>
          {/* The Acharya portrait lives in the running header of every page
              instead (see drawHeader in KundliSection.tsx) — the cover
              stays a clean, single-focal-point brand mark. */}
          {/* Festive cover banner — the same on every report (main site and
              campaign alike); the caller's own bannerImageSrc still appears
              on the closing page. */}
          {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
          <img src={COVER_BANNER_SRC} style={{ width: '100%', height: 'auto', borderRadius: 14, marginBottom: 34, boxShadow: '0 10px 28px rgba(122, 44, 20, 0.16)' }} />
          {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
          <img src="/logo.png" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 10 }} />
          <div style={{ fontSize: FONT.label, letterSpacing: '0.28em', color: MUTED, textTransform: 'uppercase', fontWeight: 700 }}>TredevaAstro</div>
          <div style={{ fontSize: FONT.label, letterSpacing: '0.22em', color: GOLD, textTransform: 'uppercase', margin: '8px 0 14px', fontWeight: 700 }}>{L.vedicReport}</div>
          <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 40, color: INK, margin: '0 0 10px', maxWidth: 600 }}>{L.coverTitle(name)}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ width: 40, height: 1, background: GOLD }} />
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: GOLD }} />
            <span style={{ width: 40, height: 1, background: GOLD }} />
          </div>
          <div style={{ fontSize: FONT.body, color: MUTED, marginBottom: 20 }}>{dob} · {timeUnknown ? L.tobNotProvided : tob} · {place}</div>
          <span style={{ display: 'inline-block', padding: '5px 16px', borderRadius: 999, background: GOLD, color: '#FAF7F0', fontSize: FONT.label, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 700 }}>
            {L.generated} {generatedDate}
          </span>
          <div style={{ fontSize: 8.5, letterSpacing: '0.2em', color: FAINT, textTransform: 'uppercase', marginTop: 22 }}>{L.brandFooter}</div>
        </div>

        {/* ── 01 Basic ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 24, breakBefore: 'page' }}>
          <SectionHeader num="01" title={L.basic} />
          <SubHeading>{L.birthDetails}</SubHeading>
          <KVGrid cols={2}>
            <KVRow label={L.name}>{name}</KVRow>
            <KVRow label={L.dob}>{dob}</KVRow>
            {/* The substituted current-time value itself never gets printed
                here as though it were a real answer — only the disclaimer
                below says a time was assumed. */}
            <KVRow label={L.tob}>{timeUnknown ? L.tobNotProvided : tob}</KVRow>
            <KVRow label={L.pob}>{place}</KVRow>
            {latitude != null && <KVRow label={L.latitude}>{latitude.toFixed(4)}</KVRow>}
            {longitude != null && <KVRow label={L.longitude}>{longitude.toFixed(4)}</KVRow>}
            <KVRow label={L.timezone}>{formatGmtOffset(timezoneOffsetMinutes)}</KVRow>
          </KVGrid>
          {timeUnknown && (
            <p style={{ fontSize: FONT.label, color: '#b8860b', margin: '6px 0 0', lineHeight: 1.5 }}>⚠ {L.timeUnknownNotice}</p>
          )}

          <SubHeading>{L.panchang}</SubHeading>
          <KVGrid cols={2}>
            <KVRow label={L.tithi}>{pakshaText(result.panchang.tithi.paksha)} {tithiText(result.panchang.tithi.name)}</KVRow>
            <KVRow label={L.karana}>{karanaText(result.panchang.karana)}</KVRow>
            <KVRow label={L.yoga}>{yogaNameText(result.panchang.yoga)}</KVRow>
            <KVRow label={L.nakshatra}>{nakshatraText(result.kundli.moonNakshatra.name)}</KVRow>
            <KVRow label={L.nakshatraLord}>{planetText(result.kundli.moonNakshatra.lord)}</KVRow>
            <KVRow label={L.ascendant}>{rashiText(result.kundli.ascendant.rashi)}</KVRow>
            {ascLord && <KVRow label={L.ascendantLord}>{planetText(ascLord)}</KVRow>}
            {result.panchang.sunrise && <KVRow label={L.sunrise}>{formatLocalTime(result.panchang.sunrise, timezoneOffsetMinutes)}</KVRow>}
            {result.panchang.sunset && <KVRow label={L.sunset}>{formatLocalTime(result.panchang.sunset, timezoneOffsetMinutes)}</KVRow>}
          </KVGrid>

          <SubHeading>{L.avakhadaDetails}</SubHeading>
          <KVGrid cols={3}>
            <KVRow label={L.varna}>{result.avakhada.varna}</KVRow>
            <KVRow label={L.vashya}>{result.avakhada.vashya}</KVRow>
            <KVRow label={L.yoni}>{result.avakhada.yoni}</KVRow>
            <KVRow label={L.gan}>{result.avakhada.gana}</KVRow>
            <KVRow label={L.nadi}>{result.avakhada.nadi}</KVRow>
            <KVRow label={L.sign}>{rashiText(moonSign)}</KVRow>
            <KVRow label={L.signLord}>{planetText(result.avakhada.signLord)}</KVRow>
            <KVRow label={L.charan}>{result.avakhada.pada}</KVRow>
            <KVRow label={L.tatva}>{result.avakhada.tatva}</KVRow>
            <KVRow label={L.paya}>{result.avakhada.paya}</KVRow>
          </KVGrid>
        </div>

        {/* ── 02 Kundli — D1 + D9 + Planetary Positions used to be ONE block
            (so they'd never land on separate pages), but that meant one
            html2canvas call rasterizing 2 FULL-SIZE chart SVGs (not the
            "small" MiniChart variant used elsewhere — these are the biggest
            individual charts in the whole report) plus a 10-row table, all
            synchronously, in one go. That was consistently the single
            longest freeze in the report (this generates automatically the
            moment the chart renders, silently in the background — a long
            enough freeze here reads as the whole page hanging). Split into
            3 blocks: each chart is now its own fast capture, and the table
            a third. Trades a small chance the table starts on the next page
            for the page not locking up early in every single generation. ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 8, breakBefore: 'page' }}>
          <SectionHeader num="02" title={L.kundli} />
        </div>
        <div data-pdf-block data-pdf-weight="2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
          <MiniChart title={L.lagnaChart} planets={chartPlanets} ascendantRashi={result.kundli.ascendant.rashi} language={language} />
          <MiniChart title={L.navamsaChart} planets={navamsaPlanets} ascendantRashi={result.navamsaChart.ascendant.rashi} language={language} />
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.planetaryPositions}</SubHeading>
          <Table head={[L.colPlanet, L.colSign, L.colSignLord, L.colNakshatra, L.colNakshLord, L.colDegree, L.colRetro]}>
            <tr style={{ borderTop: `1px solid ${LINE}` }}>
              <Td><b>{L.ascendant}</b></Td><Td>{rashiText(result.kundli.ascendant.rashi)}</Td><Td>{ascLord ? planetText(ascLord) : '—'}</Td><Td>—</Td><Td>—</Td><Td>{formatDeg(result.kundli.ascendant.degreeInSign)}</Td><Td>{L.no}</Td>
            </tr>
            {result.kundli.planets.map(p => (
              <tr key={p.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>{planetText(p.id)}</b></Td><Td>{rashiText(p.rashi)}</Td><Td>{signLordById.has(p.id) ? planetText(signLordById.get(p.id)!) : '—'}</Td><Td>{nakshatraText(p.nakshatra)}</Td><Td>{planetText(p.nakshatraLord)}</Td><Td>{formatDeg(p.degreeInSign)}</Td><Td>{yesNoText(p.retrograde)}</Td>
              </tr>
            ))}
          </Table>
        </div>

        {/* Vimshottari: a Mahadasha summary table, then every Antardasha as
            3-across cards (one row = one capture block). */}
        <div data-pdf-block style={{ marginBottom: 14 }}>
          <SubHeading>{L.vimshottariDasha}</SubHeading>
          <MinorHeading>{L.mahadasha}</MinorHeading>
          <Table head={[L.colPlanet, L.startDate, L.endDate]}>
            {result.mahadashaTimeline.map((period, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${LINE}`, background: period.active ? TINT : undefined }}>
                <Td><b>{planetText(period.lord)}</b>{period.active && <ActiveBadge label={L.active} />}</Td>
                <Td>{i === 0 ? L.birth : fmtDate(period.startsAt)}</Td>
                <Td>{fmtDate(period.endsAt)}</Td>
              </tr>
            ))}
          </Table>
        </div>
        <div data-pdf-block style={{ marginBottom: 6 }}>
          <MinorHeading>{L.antardasha}</MinorHeading>
        </div>
        {chunk(result.mahadashaTimeline, 3).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10, alignItems: 'start' }}>
            {group.map((period, i) => (
              <div key={i} style={{ border: `1px solid ${period.active ? GOLD : LINE}`, borderRadius: 8, padding: '8px 8px 6px', background: period.active ? TINT : PAGE_BG }}>
                <div style={{ textAlign: 'center', fontSize: FONT.body, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>
                  {planetText(period.lord)}{period.active && <ActiveBadge label={L.active} />}
                </div>
                <div style={{ textAlign: 'center', fontSize: 8.5, color: MUTED, marginBottom: 6 }}>
                  {gi === 0 && i === 0 ? L.birth : fmtDate(period.startsAt)} – {fmtDate(period.endsAt)}
                </div>
                {period.antardashas.map((sub, j) => (
                  <div key={j} style={{ display: 'flex', justifyContent: 'space-between', gap: 4, padding: '3px 0', borderTop: `1px solid ${LINE}`, fontSize: 8.5 }}>
                    <span style={{ fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>{planetText(sub.lord)}</span>
                    <span style={{ color: MUTED }}>{fmtDate(sub.startsAt)} – {fmtDate(sub.endsAt)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}

        {/* Shadbala / Bhavbala — every component the engine computes, planets
            (or houses) as columns like the reference report. Ranking is by
            total strength (1 = strongest). */}
        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.shadbala}</SubHeading>
          <p style={{ fontSize: FONT.label, color: MUTED, margin: '0 0 8px' }}>{L.shadbalaDesc}</p>
          <MatrixTable
            corner={L.component}
            columns={result.shadbala.planets.map(p => planetText(p.planet))}
            rows={[
              { label: L.sthanaBala, cells: result.shadbala.planets.map(p => p.sthanabala.total.toFixed(2)) },
              { label: L.kaalaBala, cells: result.shadbala.planets.map(p => p.kaalabala.total.toFixed(2)) },
              { label: L.colDigBala, cells: result.shadbala.planets.map(p => p.digbala.toFixed(2)) },
              { label: L.cheshtaBala, cells: result.shadbala.planets.map(p => p.cheshtabala.toFixed(2)) },
              { label: L.naisargikaBala, cells: result.shadbala.planets.map(p => p.naisargikabala.toFixed(2)) },
              { label: L.colDrikBala, cells: result.shadbala.planets.map(p => p.drikbala.toFixed(2)) },
              { label: L.totalShadbala, strong: true, cells: result.shadbala.planets.map(p => p.totalVirupas.toFixed(2)) },
              { label: L.shadbalaRupas, strong: true, cells: result.shadbala.planets.map(p => p.rupas.toFixed(2)) },
              { label: L.colRequired, cells: result.shadbala.planets.map(p => p.minRequiredRupas.toFixed(2)) },
              { label: L.colRatio, cells: result.shadbala.planets.map(p => <span style={{ color: p.isStrong ? '#2E7D4F' : '#B05A2E', fontWeight: 600 }}>{(p.rupas / p.minRequiredRupas).toFixed(2)}</span>) },
              { label: L.ranking, cells: rankDesc(result.shadbala.planets.map(p => p.rupas)).map(String) },
              { label: L.ishtaPhala, cells: result.shadbala.planets.map(p => p.ishtabala.toFixed(2)) },
              { label: L.kashtaPhala, cells: result.shadbala.planets.map(p => p.kashtabala.toFixed(2)) },
              { label: L.colVerdict, cells: result.shadbala.planets.map(p => <span style={{ color: p.isStrong ? '#2E7D4F' : '#B05A2E', fontWeight: 600 }}>{p.isStrong ? L.strong : L.weak}</span>) },
            ]}
          />
        </div>
        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.bhavbala}</SubHeading>
          <p style={{ fontSize: FONT.label, color: MUTED, margin: '0 0 8px' }}>{L.bhavbalaDesc}</p>
          <MatrixTable
            corner={L.component}
            columns={result.shadbala.houses.map(h => (isHi ? `भा${h.house}` : `H${h.house}`))}
            rows={[
              { label: L.colAdhipatiBala, cells: result.shadbala.houses.map(h => h.adhipatiBala.toFixed(0)) },
              { label: L.colDigBala, cells: result.shadbala.houses.map(h => h.digBala.toFixed(0)) },
              { label: L.colDrikBala, cells: result.shadbala.houses.map(h => h.drikBala.toFixed(0)) },
              { label: L.totalBhavabala, strong: true, cells: result.shadbala.houses.map(h => h.total.toFixed(0)) },
              { label: L.bhavabalaRupas, strong: true, cells: result.shadbala.houses.map(h => (h.total / 60).toFixed(2)) },
              { label: L.ranking, cells: rankDesc(result.shadbala.houses.map(h => h.total)).map(String) },
            ]}
          />
        </div>

        {/* ── 03 KP ── */}
        <div data-pdf-block data-pdf-weight="2" data-pdf-newpage="true" style={{ marginBottom: 22, breakBefore: 'page' }}>
          <SectionHeader num="03" title={L.kp} />
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
            <MiniChart title={L.bhavChalitChart} planets={bhavChalitPlanets} ascendantRashi={result.bhavChalit.ascendant.rashi} language={language} />
            <div>
              <SubHeading>{L.rulingPlanets}</SubHeading>
              <KVGrid cols={2}>
                <KVRow label={L.ascSignLord}>{planetText(result.kp.rulingPlanets.lagnaSignLord)}</KVRow>
                <KVRow label={L.ascStarLord}>{planetText(result.kp.rulingPlanets.lagnaStarLord)}</KVRow>
                <KVRow label={L.ascSubLord}>{planetText(result.kp.rulingPlanets.lagnaSubLord)}</KVRow>
                <KVRow label={L.moonSignLord}>{planetText(result.kp.rulingPlanets.moonSignLord)}</KVRow>
                <KVRow label={L.moonStarLord}>{planetText(result.kp.rulingPlanets.moonStarLord)}</KVRow>
                <KVRow label={L.moonSubLord}>{planetText(result.kp.rulingPlanets.moonSubLord)}</KVRow>
                <KVRow label={L.dayLord}>{planetText(result.kp.rulingPlanets.dayLord)}</KVRow>
              </KVGrid>
            </div>
          </div>
        </div>

        {/* KP Planets/Cusps split into 2 blocks (was 1) — same page-fill
            reasoning as the Shadbala/Bhavbala split above. */}
        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.kpPlanets}</SubHeading>
          <Table head={[L.colPlanet, L.colBhavCusp, L.colSign, L.colSignLord, L.colStarLord, L.colSubLord]}>
            {result.kp.table.filter(r => r.id !== 'asc').map(row => (
              <tr key={row.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>{planetText(row.id)}</b></Td><Td>{bhavHouseById.get(row.id) ?? '—'}</Td><Td>{rashiText(row.rashi)}</Td><Td>{planetText(row.signLord)}</Td><Td>{planetText(row.starLord)}</Td><Td>{planetText(row.subLord)}</Td>
              </tr>
            ))}
          </Table>
        </div>
        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.kpCusps}</SubHeading>
          <Table head={[L.colCusp, L.colDegree, L.colSign, L.colSignLord, L.colStarLord, L.colSubLord]}>
            {result.kp.cusps.map((row, i) => (
              <tr key={row.id} style={{ borderTop: `1px solid ${LINE}` }}>
                <Td><b>{i + 1}</b></Td><Td>{formatDeg(result.bhavChalit.cusps[i]?.degreeInSign ?? 0)}</Td><Td>{rashiText(row.rashi)}</Td><Td>{planetText(row.signLord)}</Td><Td>{planetText(row.starLord)}</Td><Td>{planetText(row.subLord)}</Td>
              </tr>
            ))}
          </Table>
        </div>

        {/* ── 04 Ashtakvarga — 8 grids (SAV + 7 grahas), 4 per block (was
            all 8 in one block — split for the same page-fill reasoning as
            Shadbala/KP above) ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 8, breakBefore: 'page' }}>
          <SectionHeader num="04" title={L.ashtakvarga} />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>{L.ashtakvargaDesc(result.ashtakavarga.sarvaTotal)}</p>
        </div>
        {chunk(ASHTAKAVARGA_GROUPS, 2).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 12 }}>
            {group.map(g => (
              <div key={g.label}>
                <div style={{ fontSize: FONT.label, fontWeight: 700, color: GOLD, textTransform: 'uppercase', marginBottom: 4 }}>{g.label}</div>
                <BinduGrid points={g.points} rashiText={rashiText} />
              </div>
            ))}
          </div>
        ))}

        {/* ── 05 Charts — every divisional chart the app computes, batched
            3-per-row in ONE real grid per block (an earlier version made
            each chart its OWN block, but that block was still full content
            width with the chart centered in only a 33% inner column —
            html2canvas captured the whole mostly-blank row every time, so
            the page-packer (which only looks at each capture's real height)
            happily stacked 2-3 of these near-empty captures on the same
            page: a small chart floating in acres of white space, repeated.
            Capturing an actual 3-column grid as ONE block fixes both the
            wasted-space capture AND cuts total chart captures to a third —
            still one clean html2canvas call per row, same as the
            D1/Navamsa pair above, not the giant single mega-block (many
            charts + a table) that caused the original freeze this report
            was rebuilt to avoid. ── */}
        {!skipExtraDivisionalCharts && (
          <>
            <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 8, breakBefore: 'page' }}>
              <SectionHeader num="05" title={L.charts} />
              <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>{L.chartsDesc}</p>
            </div>
            {chunk(allCharts, 2).map((row, gi) => (
              <div key={gi} data-pdf-block data-pdf-weight="2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
                {row.map(c => <MiniChart key={c.title} title={c.title} planets={c.planets} ascendantRashi={c.ascendantRashi} language={language} />)}
              </div>
            ))}
          </>
        )}

        {/* ── 06 Dasha — 4 prediction cards per block instead of 2 ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 8, breakBefore: 'page' }}>
          <SectionHeader num="06" title={L.dasha} />
          <p style={{ fontSize: FONT.body, color: MUTED, margin: 0 }}>{L.dashaDesc}</p>
        </div>
        {chunk(result.dashaPredictions, 2).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {group.map(d => {
              const period = result.mahadashaTimeline.find(m => m.lord === d.lord);
              return (
                <PredictionCard key={d.lord} title={`${planetText(d.lord)} ${L.mahadasha}${period?.active ? ` (${cap(L.active)})` : ''}`} subtitle={period ? `${fmtDate(period.startsAt)} – ${fmtDate(period.endsAt)}` : undefined} active={period?.active}>
                  {d.text}
                </PredictionCard>
              );
            })}
          </div>
        ))}

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.yoginiDasha}</SubHeading>
          <Table head={[L.colYogini, L.colLord, L.colStart, L.colEnd]}>
            {result.yoginiDashaTimeline.map((period, i) => (
              <tr key={i} style={{ borderTop: `1px solid ${LINE}`, background: period.active ? TINT : undefined }}>
                <Td><b>{yoginiText(period.yogini)}</b>{period.active ? ` (${L.active})` : ''}</Td><Td>{planetText(period.lord)}</Td><Td>{period.startsAt}</Td><Td>{period.endsAt}</Td>
              </tr>
            ))}
          </Table>
        </div>

        {/* ── 07 Free Report ── */}
        <div data-pdf-block data-pdf-newpage="true" style={{ marginBottom: 22, breakBefore: 'page' }}>
          <SectionHeader num="07" title={L.freeReport} />
          <SubHeading>{L.ascendantPredictionsFor(rashiText(result.ascendantPredictions.ascendant))}</SubHeading>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {([
              [L.description, result.ascendantPredictions.description],
              [L.personality, result.ascendantPredictions.personality],
              [L.physical, result.ascendantPredictions.physical],
              [L.health, result.ascendantPredictions.health],
              [L.career, result.ascendantPredictions.career],
              [L.relationship, result.ascendantPredictions.relationship],
            ] as const).map(([label, text]) => (
              <PredictionCard key={label} title={label}>{text}</PredictionCard>
            ))}
          </div>

          {(result.ascendantPredictions.dos.length > 0 || result.ascendantPredictions.donts.length > 0) && (
            <div style={{ marginTop: 14 }}>
              <SubHeading>{L.dosAndDonts}</SubHeading>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <p style={{ fontSize: FONT.body, margin: '0 0 2px', fontWeight: 600, color: GOLD }}>{L.dos}</p>
                  <ul style={{ fontSize: FONT.label, color: MUTED, margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
                    {result.ascendantPredictions.dos.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
                <div>
                  <p style={{ fontSize: FONT.body, margin: '0 0 2px', fontWeight: 600, color: GOLD }}>{L.donts}</p>
                  <ul style={{ fontSize: FONT.label, color: MUTED, margin: 0, paddingLeft: 16, lineHeight: 1.6 }}>
                    {result.ascendantPredictions.donts.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        <div data-pdf-block style={{ marginBottom: 8 }}>
          <SubHeading>{L.planetaryPredictions}</SubHeading>
          <p style={{ fontSize: FONT.label, color: MUTED, margin: 0 }}>{L.planetaryPredictionsDesc}</p>
        </div>
        {chunk(result.analysis.planets, 2).map((group, gi) => (
          <div key={gi} data-pdf-block style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {group.map(p => <PredictionCard key={p.id} title={L.considerationFor(planetText(p.id))}>{p.text}</PredictionCard>)}
          </div>
        ))}

        {presentYogas.length > 0 && (
          <div data-pdf-block style={{ marginBottom: 22 }}>
            <SubHeading>{L.yogaCombinations}</SubHeading>
            <p style={{ fontSize: FONT.label, color: MUTED, margin: '0 0 8px' }}>{L.yogaDesc}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {presentYogas.map(y => <PredictionCard key={y.name} title={yogaNameText(y.name)}>{y.description}</PredictionCard>)}
            </div>
          </div>
        )}

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.rudrakshaRecommendation}</SubHeading>
          <p style={{ fontSize: FONT.section, fontWeight: 700, margin: '0 0 4px' }}>{L.mukhiRudraksha(result.rudraksha.mukhi, result.rudraksha.deity)}</p>
          <p style={{ fontSize: FONT.body, lineHeight: 1.6, margin: '0 0 8px', color: MUTED }}>{L.ruledBy(planetText(result.rudraksha.rulingPlanet))} {result.rudraksha.reason}</p>
          <p style={{ fontSize: FONT.body, margin: '0 0 4px' }}><b>{L.howToWear}</b> <span style={{ color: MUTED }}>{result.rudraksha.howToWear}</span></p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 6 }}>
            <div>
              <p style={{ fontSize: FONT.body, margin: '0 0 2px', fontWeight: 600 }}>{L.benefits}</p>
              <ul style={{ fontSize: FONT.label, color: MUTED, margin: 0, paddingLeft: 16 }}>
                {result.rudraksha.benefits.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
            <div>
              <p style={{ fontSize: FONT.body, margin: '0 0 2px', fontWeight: 600 }}>{L.precautions}</p>
              <ul style={{ fontSize: FONT.label, color: MUTED, margin: 0, paddingLeft: 16 }}>
                {result.rudraksha.precautions.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          </div>
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.gemstoneRecommendations}</SubHeading>
          <p style={{ fontSize: FONT.label, color: MUTED, margin: '0 0 8px' }}>{L.gemstoneDesc}</p>
          {gems.map(g => (
            <div key={g.purpose} style={{ borderTop: `1px solid ${LINE}`, padding: '10px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: g.color, flexShrink: 0 }} />
                <span style={{ fontSize: FONT.sub, fontWeight: 700, color: INK, textTransform: 'uppercase' }}>{g.purpose} — {g.gemstone} ({g.sanskritName})</span>
              </div>
              <p style={{ fontSize: FONT.label, lineHeight: 1.6, color: MUTED, margin: '0 0 6px' }}>{g.reason}</p>
              <KVGrid cols={2}>
                <KVRow label={L.gemstone}>{g.gemstone} ({g.sanskritName})</KVRow>
                <KVRow label={L.metal}>{g.metal}</KVRow>
                <KVRow label={L.wearOn}>{g.finger}</KVRow>
                <KVRow label={L.mantra}><span style={{ fontStyle: 'italic', color: GOLD }}>{g.mantra}</span></KVRow>
              </KVGrid>
            </div>
          ))}
        </div>

        <div data-pdf-block style={{ marginBottom: 22 }}>
          <SubHeading>{L.doshaAnalysis}</SubHeading>
          <DoshaRow label={L.kaalSarpDosha} active={result.doshas.kaalSarp.isKaalSarp} activeText={L.present} inactiveText={L.notPresent}>
            {result.doshas.kaalSarp.isKaalSarp ? L.kaalSarpText(rashiText(result.doshas.kaalSarp.rahuRashi), rashiText(result.doshas.kaalSarp.ketuRashi)) : L.kaalSarpFreeText}
          </DoshaRow>
          <DoshaRow label={L.sadeSati} active={result.doshas.sadeSati.active} activeText={L.sadeSatiActive(phaseText(result.doshas.sadeSati.phase ?? ''))} inactiveText={L.notActive}>
            {result.doshas.sadeSati.active ? L.sadeSatiText(phaseText(result.doshas.sadeSati.phase ?? '')) : L.sadeSatiFreeText}
          </DoshaRow>
        </div>

        {/* Closing — its own dedicated last page. `breakBefore: 'page'` +
            `breakInside: 'avoid'` are what actually enforce that under
            native print pagination: without them, this block just flows
            wherever it happens to land, and if it doesn't fully fit in
            whatever room is left on the previous page, its last line or
            two silently spills onto an otherwise-blank trailing page. */}
        {/* minHeight roughly matches a full page's usable height under the
            server-rendered path (page height minus the reserved header/
            footer bands — see kundliPdf.routes.ts) so the whole message
            actually centers on the page instead of clustering at the top
            with a slab of dead cream space below it. */}
        <div data-pdf-block data-pdf-closing="true" style={{ minHeight: 880, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 20px', breakBefore: 'page', breakInside: 'avoid' }}>
          {!bannerImageSrc && (
            // eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic
            <img src="/logo.png" style={{ width: 72, height: 72, objectFit: 'contain', marginBottom: 20, opacity: 0.9 }} />
          )}
          <div style={{ fontSize: FONT.label, letterSpacing: '0.15em', color: GOLD, textTransform: 'uppercase', marginBottom: 10, fontWeight: 700 }}>{L.thankYou}</div>
          {/* Banner sits below the "Thank You" line, not above it — the
              closing page's own farewell text is still the first thing
              read, the banner a festive sign-off underneath. */}
          {bannerImageSrc && (
            // eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic
            <img src={bannerImageSrc} style={{ width: '100%', maxWidth: 380, height: 'auto', borderRadius: 12, margin: '4px 0 28px', opacity: 0.95, boxShadow: '0 8px 24px rgba(122, 74, 30, 0.18)' }} />
          )}
          {/* A bordered card instead of the message floating loose on the
              page — reads as a designed closing panel rather than
              leftover text under the banner. */}
          <div style={{ border: `1px solid ${LINE}`, borderRadius: 14, background: TINT, padding: '28px 36px', maxWidth: 460 }}>
            <div style={{ fontFamily: 'Yatra One, Georgia, serif', fontSize: 26, color: INK, margin: '0 0 12px' }}>{L.journeyContinues(name)}</div>
            <p style={{ fontSize: FONT.body, lineHeight: 1.6, color: MUTED, margin: '0 0 16px' }}>{L.closingInvite}</p>
            <div style={{ width: 48, height: 2, background: GOLD, margin: '0 auto 14px' }} />
            <div style={{ fontSize: FONT.label, color: FAINT, letterSpacing: '0.08em' }}>{L.brandFooter}</div>
            <div style={{ fontSize: 8.5, color: FAINT, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 10 }}>{L.endOfReport}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// "Ranking" rows: 1 = highest value.
function rankDesc(values: number[]): number[] {
  const order = values.map((v, i) => [v, i] as const).sort((x, y) => y[0] - x[0]);
  const ranks: number[] = [];
  order.forEach(([, i], r) => { ranks[i] = r + 1; });
  return ranks;
}

// Floors through arc-seconds so 19.9999° reads 19° 59′ 59″, never the
// "19° 60′" plain minute rounding used to print.
function formatDeg(degreeInSign: number): string {
  const totalSec = Math.floor(degreeInSign * 3600);
  const deg = Math.floor(totalSec / 3600);
  const min = Math.floor((totalSec % 3600) / 60);
  return `${deg}° ${min}′ ${totalSec % 60}″`;
}

// "local = UTC + offset" minutes (IST = +330) -> "GMT +05:30".
function formatGmtOffset(offsetMinutes: number): string {
  const abs = Math.abs(offsetMinutes);
  return `GMT ${offsetMinutes < 0 ? '-' : '+'}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

// Panchang sunrise/sunset come back as UTC ISO instants — shift to the
// birth place's local clock time before printing. timezoneOffsetMinutes
// uses this app's "local = UTC + offset" convention (IST = +330).
function formatLocalTime(isoUtc: string, timezoneOffsetMinutes: number): string {
  const localMs = new Date(isoUtc).getTime() + timezoneOffsetMinutes * 60_000;
  const d = new Date(localMs);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// A chart + its title, sized to sit several-to-a-block (NOT its own capture
// — callers place this inside a shared data-pdf-block grid). `small` is
// used for the dense 3-per-row "05 Charts" grid.
function MiniChart({ title, planets, ascendantRashi, small, language = 'en' }: { title: string; planets: SimplePlanets; ascendantRashi: string; small?: boolean; language?: Language }) {
  const noop = () => {};
  return (
    <div>
      <div style={{ fontSize: small ? FONT.label : FONT.sub, fontWeight: 700, color: INK, textAlign: 'center', marginBottom: 4 }}>{title}</div>
      <div className={chartStyles.svgWrap} style={{ maxWidth: small ? 200 : 320, margin: '0 auto' }}>
        <NorthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={noop} onPlanetLeave={noop} onHouseHover={noop} onHouseLeave={noop} language={language} />
        {/* Every chart already has its own centered logo watermark
            (ChartWatermark, an SVG <image href> inside NorthIndianChart) —
            but html2canvas doesn't reliably rasterize an SVG-embedded
            external image reference, so it silently didn't survive capture
            here. A plain HTML <img> sibling does — this is PDF-only (the
            live site keeps using ChartWatermark, which renders fine in a
            real browser), so it doesn't touch the shared chart component. */}
        {/* eslint-disable-next-line jsx-a11y/alt-text -- decorative, purely cosmetic */}
        <img src="/logo.png" style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '22%', opacity: 0.14, pointerEvents: 'none' }} />
      </div>
    </div>
  );
}

// Numbered gold-circle badge + bold title + rule — the reference's "01
// Basic" / "02 Kundli" style section marker.
function SectionHeader({ num, title }: { num: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: '50%', background: GOLD, color: '#FAF7F0', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{num}</span>
      <span style={{ fontSize: 19, fontWeight: 700, color: INK }}>{title}</span>
      <span style={{ flex: 1, height: 1, background: LINE }} />
    </div>
  );
}

// A gold accent bar + bold subtitle — the reference's "BIRTH DETAILS" /
// "PANCHANG" style sub-heading within a numbered section.
function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 0 8px' }}>
      <span style={{ width: 3, height: 14, background: GOLD, borderRadius: 2, flexShrink: 0 }} />
      <span style={{ fontSize: FONT.sub, fontWeight: 700, color: INK, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{children}</span>
    </div>
  );
}

// Dotted-underline label/value rows in a multi-column grid — the
// reference's "NAME ... Sparsh Bansal" key-value list style.
function KVGrid({ cols, children }: { cols: number; children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, columnGap: 24 }}>{children}</div>;
}

function KVRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, padding: '6px 0', borderBottom: `1px dotted ${LINE}` }}>
      <span style={{ fontSize: FONT.label, color: FAINT, textTransform: 'uppercase', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: FONT.body, fontWeight: 600, color: INK, textAlign: 'right' }}>{children}</span>
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: ReactNode }) {
  return (
    <table style={{ width: '100%', fontSize: FONT.body, borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', color: FAINT, textTransform: 'uppercase', fontSize: FONT.label }}>
          {head.map(h => <th key={h} style={{ padding: '3px 4px' }}>{h}</th>)}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

// Small gold uppercase label under a SubHeading (e.g. MAHADASHA / ANTARDASHA).
function MinorHeading({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: FONT.label, fontWeight: 700, color: GOLD, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '6px 0 6px' }}>{children}</div>;
}

function ActiveBadge({ label }: { label: string }) {
  return <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 999, background: GOLD, color: '#FAF7F0', fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', verticalAlign: 'middle' }}>{label}</span>;
}

// Rows-by-columns grid (components down the side, planets/houses across the
// top) — the reference report's Shadbala/Bhavbala layout.
function MatrixTable({ corner, columns, rows }: { corner: string; columns: string[]; rows: { label: string; cells: ReactNode[]; strong?: boolean }[] }) {
  return (
    <table style={{ width: '100%', fontSize: FONT.label, borderCollapse: 'collapse', border: `1px solid ${LINE}` }}>
      <thead>
        <tr style={{ color: FAINT, textTransform: 'uppercase', fontSize: 8 }}>
          <th style={{ padding: '5px 6px', textAlign: 'left' }}>{corner}</th>
          {columns.map(c => <th key={c} style={{ padding: '5px 3px', textAlign: 'center' }}>{c}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map(r => (
          <tr key={r.label} style={{ borderTop: `1px solid ${LINE}`, background: r.strong ? TINT : undefined, fontWeight: r.strong ? 700 : 400 }}>
            <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{r.label}</td>
            {r.cells.map((c, i) => <td key={i} style={{ padding: '4px 3px', textAlign: 'center' }}>{c}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Td({ children }: { children: ReactNode }) {
  return <td style={{ padding: '3px 4px' }}>{children}</td>;
}

// Compact 4-column bindu-count grid — a real, complete stand-in for the
// reference's diamond-shaped bindu charts (12 rashi x bindus, same data).
function BinduGrid({ points, rashiText }: { points: { rashi: string; bindus: number }[]; rashiText: (r: string) => string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 3 }}>
      {points.map(p => (
        <div key={p.rashi} style={{ background: TINT, borderRadius: 4, padding: '3px 2px', textAlign: 'center' }}>
          <div style={{ fontSize: 7, color: FAINT, textTransform: 'uppercase' }}>{rashiText(p.rashi).slice(0, 3)}</div>
          <div style={{ fontSize: FONT.label, fontWeight: 700, color: INK }}>{p.bindus}</div>
        </div>
      ))}
    </div>
  );
}

// A bordered card for one prediction paragraph — used for Dasha, Ascendant,
// Planetary, and Yoga predictions alike (all real generated-from-real-
// placement text, never templated filler). Callers place several inside one
// shared data-pdf-block grid.
// PAGE_BG (not white) for the inactive state — a stark white card on an
// otherwise all-cream report read as an unwanted blank patch.
function PredictionCard({ title, subtitle, active, children }: { title: string; subtitle?: string; active?: boolean; children: ReactNode }) {
  return (
    <div style={{ border: `1px solid ${active ? GOLD : LINE}`, borderRadius: 8, padding: 10, background: active ? TINT : PAGE_BG }}>
      <div style={{ fontSize: FONT.sub, fontWeight: 700, color: INK }}>{title}</div>
      {subtitle && <div style={{ fontSize: FONT.label, color: MUTED, marginBottom: 4 }}>{subtitle}</div>}
      <p style={{ fontSize: FONT.label, lineHeight: 1.6, margin: subtitle ? 0 : '4px 0 0', color: MUTED }}>{children}</p>
    </div>
  );
}

function DoshaRow({ label, active, activeText, inactiveText, children }: { label: string; active: boolean; activeText: string; inactiveText: string; children: ReactNode }) {
  return (
    <div style={{ borderTop: `1px solid ${LINE}`, padding: '10px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: FONT.sub, fontWeight: 700, color: INK, textTransform: 'uppercase' }}>{label}</span>
        <span style={{ fontSize: FONT.label, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: active ? '#B23A3A' : '#2E7D4F', background: active ? 'rgba(214,69,69,0.12)' : 'rgba(46,125,79,0.12)' }}>
          {active ? activeText : inactiveText}
        </span>
      </div>
      <p style={{ fontSize: FONT.body, color: MUTED, margin: '4px 0 0' }}>{children}</p>
    </div>
  );
}
