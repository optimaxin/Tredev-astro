import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppContext, TRANSLATIONS } from '../../context/AppContext';
import { HOUSE_MEANINGS } from '../../data/mockData';
import BirthDetailsForm from '../../components/BirthDetailsForm/BirthDetailsForm';
import type { BirthDetailsSubmitValue } from '../../components/BirthDetailsForm/BirthDetailsForm';
import { toSavedBirthDetails } from '../../utils/birthDetails';
import { calculatorService, CalculatorApiError } from '../../services/calculatorService';
import type { KundliFullResult, KundliResult, DailyHoroscopeResult } from '../../services/calculatorService';
import { VARGA_LABELS, VARGA_LABELS_HI } from '../../services/calculatorService';
import { transliterateNameToHindi } from '../../utils/nameTransliterate';
import { kundliHistoryService } from '../../services/kundliHistoryService';
import type { KundliHistoryEntry } from '../../services/kundliHistoryService';
import CelestialBackdrop from '../../components/CelestialBackdrop/CelestialBackdrop';
import KundliChatWidget from './KundliChatWidget';
import { PLANET_META } from '../../data/planetMeta';
import PlanetIcon from '../../components/PlanetIcon/PlanetIcon';
import {
  RashiChakraIcon, ConstellationIcon, AcharyaIcon, WealthIcon, VastuIcon, ClockIcon,
  SunIcon, MoonIcon, SunsetIcon, LotusIcon, CheckCircleIcon,
} from '../../components/Icons/Icons';
import { NorthIndianChart, SouthIndianChart, cap, ordinal, toChartPlanets, toSimpleChartPlanets, toChandraChartPlanets } from './KundliCharts';
import type { ChartPlanet } from './KundliCharts';
import { generateBrandedPdf } from '../../utils/brandedPdf';
import KundliPrintLayout from './KundliPrintLayout';
import PdfLoader from './PdfLoader';
import { HINDI_PLANET, HINDI_RASHI, HINDI_NAKSHATRA, HINDI_TITHI, HINDI_YOGA, HINDI_KARANA, HINDI_WEEKDAY, PAKSHA_HI, hindiOr } from '../../utils/panchangHindi';
import { getVastuChartReading, VASTU_CHART_VERDICT_META } from '../../data/vastuKundli';
import styles from './KundliSection.module.css';

// Every chart selectable in the Charts tab — D1/Chandra carry real ecliptic
// degrees (they're the same underlying placements, just re-housed); the
// D2-D60 varga charts only ever resolve to a final sign, so no degree is
// shown for those rather than fabricating one.
// Main 8 first (this exact order is the highlighted quick-pick row below),
// then the rest of the divisional charts in ascending order, with the
// alternate Bhav Chalit chart last. D1 stays positioned by whole-sign house
// (matching every real reference chart, this app's own AstroTalk comparison
// included) — a real Bhav-repositioned D1 was tried and reverted, since two
// planets sharing a sign can have different real bhav numbers, so a single
// wedge can't consistently represent "one bhav." The separate Bhav Chalit
// tile is where wedges are actually positioned by real cuspal house.
const CHART_KEYS = ['D1', 'CHANDRA', 'D9', 'D4', 'D6', 'D7', 'D10', 'D60', 'D2', 'D3', 'D5', 'D8', 'D11', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'BHAV_CHALIT'] as const;
const CHART_LABELS: Record<string, string> = {
  D1: 'D1 — Rashi (Birth Chart)', BHAV_CHALIT: 'Bhav Chalit (Real KP Cusps)', CHANDRA: 'Chandra (Moon) Chart', D9: 'D9 — Navamsa (Marriage)',
};
const CHART_LABELS_HI: Record<string, string> = {
  D1: 'D1 — राशि (जन्म कुंडली)', BHAV_CHALIT: 'भाव चलित (वास्तविक केपी कस्प)', CHANDRA: 'चंद्र चार्ट', D9: 'D9 — नवांश (विवाह)',
};

// Consolidated from an earlier 9-tab layout (Overview/Charts/Dasha/
// Strength/KP/Ashtakvarga/Predictions/Remedies/Doshas) — 9 top-level tabs
// read as overwhelming/confusing, and 3 of them (Strength/KP/Ashtakvarga)
// are dense classical-scoring detail most casual users never need. Timeline
// absorbs Dasha+Doshas (both are "what's happening/will happen in life");
// Advanced absorbs the 3 technical tabs behind one clearly-labeled, opt-in
// destination instead of competing for attention in the main tab bar.
// `labelKey` is a translation key (see TRANSLATIONS in AppContext.tsx), not
// display text — TABS lives at module scope so it can't call t() itself;
// the tab bar below looks it up at render time, where t() is available.
const TABS = [
  { key: 'overview', labelKey: 'kundli_tab_overview' },
  { key: 'charts', labelKey: 'kundli_tab_charts' },
  { key: 'gochar', labelKey: 'kundli_tab_gochar' },
  { key: 'timeline', labelKey: 'kundli_tab_timeline' },
  { key: 'predictions', labelKey: 'kundli_tab_predictions' },
  { key: 'remedies', labelKey: 'kundli_tab_remedies' },
  { key: 'advanced', labelKey: 'kundli_tab_advanced' },
] as const;
type TabKey = (typeof TABS)[number]['key'];

const TAB_ICONS: Record<TabKey, React.ComponentType<{ size?: number }>> = {
  overview: RashiChakraIcon,
  gochar: ConstellationIcon,
  charts: ConstellationIcon,
  timeline: ClockIcon,
  predictions: AcharyaIcon,
  remedies: WealthIcon,
  advanced: VastuIcon,
};

// Fixed classical sign-lord assignments — same universal fact used
// throughout Vedic astrology, safe to keep as a static lookup here (not
// computed logic that could drift from the backend's own copy).
const RASHI_LORD_BY_NAME: Record<string, string> = {
  Aries: 'mars', Taurus: 'venus', Gemini: 'mercury', Cancer: 'moon', Leo: 'sun', Virgo: 'mercury',
  Libra: 'venus', Scorpio: 'mars', Sagittarius: 'jupiter', Capricorn: 'saturn', Aquarius: 'saturn', Pisces: 'jupiter',
};

// A handful of fixed English enum values the backend never localizes (they're
// literal string constants, not language-aware prose) — translated here on
// the frontend instead, the same "hindiOr a raw lookup" pattern already used
// for rashi/nakshatra/planet names throughout this file.
const METAL_HI: Record<string, string> = {
  Gold: 'सोना', Silver: 'चांदी', 'Gold or Copper': 'सोना या तांबा', 'Gold or Silver': 'सोना या चांदी',
  'Silver or Platinum': 'चांदी या प्लैटिनम', 'Silver or Panchdhatu': 'चांदी या पंचधातु',
};
const FINGER_HI: Record<string, string> = {
  'Ring finger': 'अनामिका', 'Little finger': 'कनिष्ठा', 'Index finger': 'तर्जनी', 'Middle finger': 'मध्यमा',
};
const GEM_PURPOSE_HI: Record<string, string> = {
  'Life Stone': 'जीवन रत्न', 'Lucky Stone': 'भाग्य रत्न', 'Fortune Stone': 'सौभाग्य रत्न',
};
const DOSHA_PHASE_HI: Record<string, string> = { rising: 'प्रारंभिक', peak: 'चरम', setting: 'अंतिम' };
const YOGINI_HI: Record<string, string> = {
  Mangala: 'मंगला', Pingala: 'पिंगला', Dhanya: 'धान्या', Bhramari: 'भ्रामरी',
  Bhadrika: 'भद्रिका', Ulka: 'उल्का', Siddha: 'सिद्धा', Sankata: 'संकटा',
};

// The Timeline/Predictions/Remedies/Advanced tabs' own static labels — kept
// as a local dictionary (like KundliPrintLayout's LABELS) rather than piped
// through the site-wide t()/TRANSLATIONS system, since these are unique to
// this one tool rather than shared site copy.
const TAB_LABELS = {
  en: {
    mahadashaTimelineTitle: 'Your Current Mahadasha',
    mahadashaTimelineDesc: "The planetary period (Vimshottari Mahadasha) active in your life right now, and its current Antardasha sub-period, both timed from your Moon's nakshatra at birth.",
    mahadasha: (lord: string, current: boolean) => `${cap(lord)} Mahadasha${current ? ' (current)' : ''}`,
    antardasha: (lord: string) => `${cap(lord)} Antardasha (current)`,
    yoginiTimelineTitle: 'Your Current Yogini Dasha',
    yoginiTimelineDesc: "The period active right now in the alternate 36-year, 8-period Yogini dasha cycle, also timed from your Moon's nakshatra at birth.",
    yoginiLine: (yogini: string, lord: string, current: boolean) => `${yogini} Yogini (${cap(lord)})${current ? ' (current)' : ''}`,
    doshas: 'Doshas', kaalSarpDosha: 'Kaal Sarp Dosha', sadeSati: 'Sade Sati', rahuKetuTransit: 'Rahu-Ketu Transit',
    present: 'Present', clear: 'Clear', notActive: 'Not active', activePhase: (phase: string) => `Active · ${phase}`,
    kaalSarpText: (r: string, k: string) => `Rahu in ${r}, Ketu in ${k}.`,
    sadeSatiText: (s: string, m: string) => `Saturn is currently transiting ${s}; your Moon sign is ${m}.`,
    rahuKetuText: (rr: string, rh: string, kr: string, kh: string) => `Rahu transiting ${rr} (${rh} from Moon), Ketu transiting ${kr} (${kh} from Moon).`,
    ascendantPredictions: 'Ascendant Predictions',
    ascendantIsPreview: (asc: string) => `Your Ascendant is ${asc} — your reading for each area is below.`,
    personality: 'Personality', physical: 'Physical', health: 'Health', career: 'Career', relationship: 'Relationship',
    quickPreviewNote: 'For a deeper, fully personalized reading beyond what your chart alone can show, consult an expert astrologer on TredevaAstro.',
    consultAstrologer: 'Consult an Astrologer',
    dosAndDonts: "Do's & Don'ts", dos: "Do's", donts: "Don'ts",
    yogaCombinations: 'Yoga Combinations', formed: 'Present', notFormed: 'Not formed',
    advancedNote: 'Technical, classical scoring behind your chart — useful if you want to go deeper, not required to understand your reading.',
    shadbalaTitle: 'Shadbala (Planetary Strength)',
    shadbalaDesc: 'Six-fold classical strength score per planet, in Rupas — a planet at or above its classical minimum is considered strong enough to deliver its significations well.',
    colPlanet: 'Planet', colRupas: 'Rupas', colRequired: 'Required', colStatus: 'Status', strong: 'Strong', weak: 'Weak',
    shadbalaFootnote: 'Ishta/Kashta Bala and the Sthana/Dig/Kaala/Cheshta/Naisargika/Drik breakdown are computed but not all shown here — ask if you want the full per-component view.',
    bhavbalaTitle: 'Bhavbala (House Strength)', house: (n: number | string) => `House ${n}`,
    kpSubLordTitle: 'KP Sub-Lord Table',
    kpSubLordDesc: "Each point's Sign, Sign Lord, Star (Nakshatra) Lord, and Sub Lord — the core KP technique, for the Ascendant and every planet.",
    colPoint: 'Point', colSign: 'Sign', colStarLord: 'Star Lord', colSubLord: 'Sub Lord', ascendant: 'Ascendant',
    kpCuspsTitle: 'KP Cusps (Bhav Chalit)',
    kpCuspsDesc: "Sub-lords of the real Placidus house cusps — the technique's genuine cuspal analysis, computed from Swiss Ephemeris rather than a whole-sign approximation.",
    colCusp: 'Cusp',
    lagnaStarLord: 'Lagna Star Lord', lagnaSubLord: 'Lagna Sub Lord', moonStarLord: 'Moon Star Lord', moonSubLord: 'Moon Sub Lord', dayLord: 'Day Lord',
    savTitle: 'Sarvashtakavarga (Bindu Strength)',
    savDesc: 'Total classical strength points (bindus) each sign receives, summed across all 7 grahas — higher means a stronger sign to have planets or transits pass through. The 12 signs always sum to exactly 337.',
    bindus: (n: number) => `${n} bindus`,
    gemRemediesTitle: 'Gemstone & Rudraksha Remedies',
    gemRemediesDesc: "Three classical gemstone picks — Life (Ascendant lord), Lucky (5th house/Purva Punya lord), and Fortune (9th house/Bhagya lord) — plus the Rudraksha ruled by your birth Nakshatra's lord.",
    metal: 'Metal:', wearOn: 'Wear on:', rudraksha: 'Rudraksha', mukhi: (n: number, deity: string) => `${n} Mukhi (${deity})`,
    precautions: 'Precautions before wearing any gemstone or Rudraksha',
    vastuTitle: 'Vastu Insights From Your Kundli',
    vastuDesc: "Each zone's classical significator planet, read from this exact chart — not a generic checklist.",
    remediesFootnote: 'These are classical, chart-derived starting points — not a substitute for a full consultation, since remedial choices can shift with other placements in your chart.',
    consultAstrologerRemedies: 'Consult an Astrologer for Remedies',
    verifyNote: "To verify: the Ascendant/Moon/Sun signs and houses named above should exactly match what's shown in the chart above — including on any other Kundli tool given the same birth date, time, and place.",
    avakhadaChakra: 'Avakhada Chakra',
    chartsIntro: 'D1 (Rashi) and D9 (Navamsa) — the two charts every reading starts with — shown full-size below. Every other divisional chart is right there too, including a separate Bhav Chalit chart; click any of them to open it full-screen. The small number in each wedge\'s corner is that sign\'s fixed zodiac index (Aries=1 … Pisces=12) — the "house" a planet is actually in (counted from your Ascendant) is shown per-planet below the chart and in its hover tooltip.',
    d1Title: 'D1 — Rashi (Birth Chart) · Planetary Placements', d9Title: 'D9 — Navamsa (Marriage) · Placements',
    bhavChalitNote: 'The D1 chart above is positioned by whole-sign house (the fixed corner numbers), matching a standard Rashi/Lagna chart. Next to every planet, the gold "Bhav <n>" is its real cuspal house — computed from your exact birth time via Placidus Bhav Chalit, genuinely different person-to-person, and NOT the same as the whole-sign house it\'s sitting in. Open the separate "Bhav Chalit" chart below to see planets actually positioned by that real cuspal house instead.',
    northIndian: 'North Indian', southIndian: 'South Indian', placements: 'Placements',
    horaNote: "Hora (D2) is classically defined so every placement falls in ONLY Cancer or Leo (Moon's Hora / Sun's Hora) — never any other sign. That's why houses here cluster into just 1 and 7 (or 12, depending on your D2 Ascendant) instead of spreading across all 12 — it's the correct classical result for this chart, not a computation error.",
    gocharTitle: "Gochar — Today's Real Transits on Your Chart",
    gocharDesc: 'Where every planet is actually transiting right now, counted as houses from your own natal Lagna and from your own natal Moon — the two classical reference points Gochar is read from — compared against where it sits in your birth chart.',
    gocharLoading: "Loading today's transits...",
    sadeSatiActiveTitle: 'Sade Sati is currently active',
    sadeSatiActiveText: (rashi: string, phase: string, moonRashi: string) => `Saturn is transiting ${rashi} — your ${phase} phase, counted from your natal Moon in ${moonRashi}.`,
    rahuKetuTransitText: (rr: string, rh: string, kr: string, kh: string) => `Rahu is transiting ${rr} (${rh} house from your Moon), Ketu is transiting ${kr} (${kh} house from your Moon).`,
    natal: 'Natal', transit: 'Transit', fromLagna: 'from Lagna', fromMoon: 'from Moon',
  },
  hi: {
    mahadashaTimelineTitle: 'आपकी वर्तमान महादशा',
    mahadashaTimelineDesc: 'वह ग्रह अवधि (विंशोत्तरी महादशा) जो अभी आपके जीवन में सक्रिय है, और उसकी वर्तमान अंतर्दशा उप-अवधि — दोनों जन्म के समय आपके चन्द्र नक्षत्र से गिनी गई हैं।',
    mahadasha: (lord: string, current: boolean) => `${HINDI_PLANET[lord] || cap(lord)} महादशा${current ? ' (वर्तमान)' : ''}`,
    antardasha: (lord: string) => `${HINDI_PLANET[lord] || cap(lord)} अंतर्दशा (वर्तमान)`,
    yoginiTimelineTitle: 'आपकी वर्तमान योगिनी दशा',
    yoginiTimelineDesc: 'वैकल्पिक 36-वर्षीय, 8-अवधि योगिनी दशा चक्र में अभी सक्रिय अवधि, जो भी जन्म के समय आपके चन्द्र नक्षत्र से गिनी जाती है।',
    yoginiLine: (yogini: string, lord: string, current: boolean) => `${YOGINI_HI[yogini] || yogini} योगिनी (${HINDI_PLANET[lord] || cap(lord)})${current ? ' (वर्तमान)' : ''}`,
    doshas: 'दोष', kaalSarpDosha: 'कालसर्प दोष', sadeSati: 'साढ़े साती', rahuKetuTransit: 'राहु-केतु गोचर',
    present: 'उपस्थित', clear: 'अनुपस्थित', notActive: 'सक्रिय नहीं', activePhase: (phase: string) => `सक्रिय · ${DOSHA_PHASE_HI[phase] || phase}`,
    kaalSarpText: (r: string, k: string) => `राहु ${r} में, केतु ${k} में स्थित है।`,
    sadeSatiText: (s: string, m: string) => `शनि वर्तमान में ${s} राशि में गोचर कर रहे हैं; आपकी चन्द्र राशि ${m} है।`,
    rahuKetuText: (rr: string, rh: string, kr: string, kh: string) => `राहु ${rr} में गोचर कर रहा है (चन्द्र से ${rh} भाव), केतु ${kr} में गोचर कर रहा है (चन्द्र से ${kh} भाव)।`,
    ascendantPredictions: 'लग्न भविष्यवाणियाँ',
    ascendantIsPreview: (asc: string) => `आपका लग्न ${asc} है — हर क्षेत्र के लिए आपकी रीडिंग नीचे दी गई है।`,
    personality: 'व्यक्तित्व', physical: 'शारीरिक', health: 'स्वास्थ्य', career: 'करियर', relationship: 'संबंध',
    quickPreviewNote: 'आपकी कुंडली से मिलने वाली जानकारी से आगे, एक गहरी, पूर्णतः व्यक्तिगत रीडिंग के लिए TredevaAstro पर किसी विशेषज्ञ ज्योतिषी से सलाह लें।',
    consultAstrologer: 'ज्योतिषी से सलाह लें',
    dosAndDonts: 'क्या करें और क्या न करें', dos: 'क्या करें', donts: 'क्या न करें',
    yogaCombinations: 'योग संयोजन', formed: 'उपस्थित', notFormed: 'नहीं बना',
    advancedNote: 'आपकी कुंडली के पीछे की तकनीकी, शास्त्रीय गणना — यदि आप गहराई में जाना चाहते हैं तो उपयोगी है, आपकी रीडिंग समझने के लिए आवश्यक नहीं।',
    shadbalaTitle: 'षड्बल (ग्रह शक्ति)',
    shadbalaDesc: 'प्रति ग्रह छह-आयामी शास्त्रीय शक्ति स्कोर, रूपा में — जो ग्रह अपने शास्त्रीय न्यूनतम पर या उससे ऊपर हो, वह अपनी कारकताओं को अच्छी तरह प्रदान करने के लिए पर्याप्त मजबूत माना जाता है।',
    colPlanet: 'ग्रह', colRupas: 'रूपा', colRequired: 'आवश्यक', colStatus: 'स्थिति', strong: 'मजबूत', weak: 'कमजोर',
    shadbalaFootnote: 'इष्ट/कष्ट बल और स्थान/दिग्/काल/चेष्टा/नैसर्गिक/दृक् विभाजन की गणना की जाती है पर यहाँ सभी नहीं दिखाए गए — पूर्ण विवरण चाहिए तो पूछें।',
    bhavbalaTitle: 'भावबल (भाव शक्ति)', house: (n: number | string) => `भाव ${n}`,
    kpSubLordTitle: 'केपी उप-स्वामी तालिका',
    kpSubLordDesc: 'हर बिंदु की राशि, राशि स्वामी, नक्षत्र स्वामी, और उप स्वामी — लग्न और हर ग्रह के लिए मूल केपी तकनीक।',
    colPoint: 'बिंदु', colSign: 'राशि', colStarLord: 'नक्षत्र स्वामी', colSubLord: 'उप स्वामी', ascendant: 'लग्न',
    kpCuspsTitle: 'केपी कस्प (भाव चलित)',
    kpCuspsDesc: 'वास्तविक प्लासिडस भाव कस्प के उप-स्वामी — स्विस एफेमेरिस से गणना की गई यह तकनीक की वास्तविक कस्पल विश्लेषण है, न कि सम-राशि अनुमान।',
    colCusp: 'कस्प',
    lagnaStarLord: 'लग्न नक्षत्र स्वामी', lagnaSubLord: 'लग्न उप स्वामी', moonStarLord: 'चन्द्र नक्षत्र स्वामी', moonSubLord: 'चन्द्र उप स्वामी', dayLord: 'दिन स्वामी',
    savTitle: 'सर्वाष्टकवर्ग (बिंदु शक्ति)',
    savDesc: 'हर राशि को मिलने वाले कुल शास्त्रीय शक्ति बिंदु, सभी 7 ग्रहों के योग से — अधिक अंक का मतलब है कि उस राशि से ग्रहों/गोचर का गुजरना अधिक मजबूत है। सभी 12 राशियों का योग सदैव ठीक 337 होता है।',
    bindus: (n: number) => `${n} बिंदु`,
    gemRemediesTitle: 'रत्न एवं रुद्राक्ष उपाय',
    gemRemediesDesc: 'तीन शास्त्रीय रत्न सुझाव — जीवन (लग्न स्वामी), भाग्य (पंचम भाव/पूर्व पुण्य स्वामी), और सौभाग्य (नवम भाव/भाग्य स्वामी) — साथ ही आपकी जन्म नक्षत्र के स्वामी द्वारा शासित रुद्राक्ष।',
    metal: 'धातु:', wearOn: 'पहनें:', rudraksha: 'रुद्राक्ष', mukhi: (n: number, deity: string) => `${n} मुखी (${deity})`,
    precautions: 'कोई भी रत्न या रुद्राक्ष पहनने से पहले सावधानियां',
    vastuTitle: 'आपकी कुंडली से वास्तु सुझाव',
    vastuDesc: 'हर क्षेत्र का शास्त्रीय कारक ग्रह, ठीक इस कुंडली से पढ़ा गया — सामान्य सूची नहीं।',
    remediesFootnote: 'ये शास्त्रीय, कुंडली-आधारित प्रारंभिक बिंदु हैं — पूर्ण परामर्श का विकल्प नहीं, क्योंकि उपचारात्मक विकल्प आपकी कुंडली की अन्य स्थितियों के साथ बदल सकते हैं।',
    consultAstrologerRemedies: 'उपायों के लिए ज्योतिषी से सलाह लें',
    verifyNote: 'पुष्टि के लिए: ऊपर बताई गई लग्न/चंद्र/सूर्य राशियाँ और भाव ऊपर के चार्ट में दिखाए गए से बिल्कुल मेल खाने चाहिए — यहां तक कि उसी जन्म तिथि, समय और स्थान के लिए किसी अन्य कुंडली उपकरण पर भी।',
    avakhadaChakra: 'अवाखड़ा चक्र',
    chartsIntro: 'D1 (राशि) और D9 (नवांश) — हर रीडिंग जिन दो चार्ट से शुरू होती है — नीचे पूर्ण आकार में दिखाए गए हैं। हर अन्य विभाजन चार्ट भी यहीं मौजूद है, साथ ही एक अलग भाव चलित चार्ट भी; किसी भी चार्ट को पूर्ण-स्क्रीन में खोलने के लिए क्लिक करें। हर वेज के कोने में छोटा अंक उस राशि का स्थिर राशि क्रमांक है (मेष=1 … मीन=12) — जिस भाव में ग्रह वास्तव में स्थित है (आपके लग्न से गिनकर) वह हर ग्रह के नीचे और उसके होवर टूलटिप में दिखाया गया है।',
    d1Title: 'D1 — राशि (जन्म कुंडली) · ग्रह स्थिति', d9Title: 'D9 — नवांश (विवाह) · ग्रह स्थिति',
    bhavChalitNote: 'ऊपर का D1 चार्ट सम-राशि भाव (स्थिर कोने के अंकों) के अनुसार स्थित है, जो मानक राशि/लग्न चार्ट से मेल खाता है। हर ग्रह के पास, सुनहरा "भाव <n>" उसका वास्तविक कस्पल भाव है — आपके सटीक जन्म समय से प्लासिडस भाव चलित द्वारा गणना किया गया, जो व्यक्ति-व्यक्ति में वास्तव में भिन्न होता है, और वह सम-राशि भाव जिसमें वह स्थित है उससे अलग है। ग्रहों को उनके वास्तविक कस्पल भाव के अनुसार देखने के लिए नीचे दिया गया अलग "भाव चलित" चार्ट खोलें।',
    northIndian: 'उत्तर भारतीय', southIndian: 'दक्षिण भारतीय', placements: 'ग्रह स्थिति',
    horaNote: 'होरा (D2) को शास्त्रीय रूप से इस तरह परिभाषित किया गया है कि हर स्थिति केवल कर्क या सिंह राशि में ही आती है (चन्द्र होरा / सूर्य होरा) — कभी किसी अन्य राशि में नहीं। इसीलिए यहाँ भाव केवल 1 और 7 (या 12, आपके D2 लग्न के अनुसार) में केंद्रित होते हैं, सभी 12 में नहीं फैलते — यह इस चार्ट का सही शास्त्रीय परिणाम है, गणना की त्रुटि नहीं।',
    gocharTitle: 'गोचर — आपकी कुंडली पर आज के वास्तविक गोचर',
    gocharDesc: 'हर ग्रह वर्तमान में वास्तव में कहाँ गोचर कर रहा है, आपके अपने जन्म लग्न और अपने जन्म चन्द्र से भाव गिनकर — गोचर पढ़ने के दो शास्त्रीय संदर्भ बिंदु — आपकी जन्म कुंडली में उसकी स्थिति की तुलना में।',
    gocharLoading: 'आज के गोचर लोड हो रहे हैं...',
    sadeSatiActiveTitle: 'साढ़े साती वर्तमान में सक्रिय है',
    sadeSatiActiveText: (rashi: string, phase: string, moonRashi: string) => `शनि ${rashi} राशि में गोचर कर रहे हैं — आपकी ${phase} अवधि, आपके जन्म चन्द्र राशि ${moonRashi} से गिनकर।`,
    rahuKetuTransitText: (rr: string, rh: string, kr: string, kh: string) => `राहु ${rr} में गोचर कर रहा है (आपके चन्द्र से ${rh} भाव), केतु ${kr} में गोचर कर रहा है (आपके चन्द्र से ${kh} भाव)।`,
    natal: 'जन्म', transit: 'गोचर', fromLagna: 'लग्न से', fromMoon: 'चन्द्र से',
  },
} as const;

// Panchang sunrise/sunset come back as UTC ISO instants — shift by the
// birth's timezone offset to show the actual local clock time, matching how
// a printed Panchang always states sunrise/sunset in local time.
// timezoneOffsetMinutes uses this app's "local = UTC + offset" convention
// (IST = +330, matching every birth-details form on the site) — local time
// is UTC PLUS the offset, not minus it.
function formatLocalTime(isoUtc: string, timezoneOffsetMinutes: number): string {
  const utcMs = new Date(isoUtc).getTime();
  const localMs = utcMs + timezoneOffsetMinutes * 60_000;
  const d = new Date(localMs);
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}

// Strips characters illegal in Windows/macOS filenames so the birth-details
// name can go straight into a download filename.
// An anonymous visitor who clicks Download PDF is sent to log in first (see
// handleDownloadPdfClick). The already-generated Kundli is stashed here so
// that, once they're back, it shows up instantly — the same chart, same
// language — instead of an empty form while it's silently re-fetched.
const KUNDLI_RESUME_KEY = 'kundliPdfResume';
interface KundliResume { details: BirthDetailsSubmitValue; result?: KundliFullResult; lang?: 'en' | 'hi' }

function readKundliResume(isLoggedIn: boolean): KundliResume | null {
  if (!isLoggedIn) return null;
  try {
    const parsed = JSON.parse(sessionStorage.getItem(KUNDLI_RESUME_KEY) || 'null');
    // Older stashes held just the bare birth details.
    return parsed && !parsed.details ? { details: parsed } : parsed;
  } catch {
    return null;
  }
}

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '').trim() || 'User';
}

// A single countdown, not an elapsed-time count-up plus a separate X/36
// progress readout — two numbers moving independently next to each other
// read as confusing/broken, not reassuring. Recomputed on every tick from
// REAL observed pace (elapsedSec / WEIGHT done so far, not just block
// COUNT) rather than a fixed guess, so it self-corrects as generation
// actually runs — a slow/busy machine right now naturally gets a longer
// countdown instead of a number that quietly stops meaning anything.
// Weight (not a raw block count) is what actually made this stable: a
// chart-capture block runs several times longer than a plain-text block,
// so "elapsed / blocksDone" swung wildly depending on whether the one or
// two blocks done so far happened to be a heavy chart or a quick text
// card (01:30 -> 03:00 -> back down to 01:00, entirely from that noise) —
// weighting each block by what it actually costs (see data-pdf-weight in
// KundliPrintLayout.tsx) makes "cost done so far" a much steadier basis
// for projecting the total. The 1.15x pad and the 2s floor both exist for
// the same reason: this must reach the real "download ready" moment at or
// before the displayed countdown hits zero, never after.
function estimatePdfRemainingSec(elapsedSec: number, progress: { weightDone: number; totalWeight: number } | null): number {
  const INITIAL_ESTIMATE_SEC = 240; // no blocks done yet — typical full-report fallback (measured ~4-5 min)
  if (!progress || progress.weightDone === 0) return Math.max(Math.round(INITIAL_ESTIMATE_SEC - elapsedSec), 5);
  const secPerWeight = elapsedSec / progress.weightDone;
  const paddedTotalEstimate = secPerWeight * progress.totalWeight * 1.15;
  return Math.max(Math.round(paddedTotalEstimate - elapsedSec), 2);
}

// Historically each PDF block is a plain <div data-pdf-block>; a costlier
// one (a chart capture, several times slower than a text-only block) can
// carry its own data-pdf-weight override so the countdown's pace estimate
// (above) reflects real relative cost instead of treating every block as
// equally cheap.
function blockWeight(el: HTMLElement): number {
  const declared = Number(el.dataset.pdfWeight);
  return Number.isFinite(declared) && declared > 0 ? declared : 1;
}

// Rotated (shuffled, not in this fixed order) under the Download button
// while generating — see the generation-effect comment below for why this
// exists at all.
const PDF_STATUS_MESSAGES = [
  'Analysing your Grahas…',
  'Reading your Dasha timeline…',
  'Mapping your Nakshatras…',
  'Weighing your planetary strengths…',
  'Analysing your health outlook…',
  'Checking your doshas…',
  'Charting your divisional houses…',
  'Consulting the stars…',
  'Aligning your houses and lords…',
  'Finalising your predictions…',
];

// Converts any divisional-chart shape (Navamsa or the D2-D60 varga charts —
// which only carry a final sign + house, not the birth-degree D1 tracks)
// into the same ChartPlanet shape the visual chart renders, so every
// divisional chart gets an actual diagram, not just a text list.
interface KundliSectionProps {
  // Main site gates PDF download behind login deliberately (lead capture —
  // see AuthPage.tsx's 'kundli-pdf' pendingAction resume flow). The campaign
  // microsite already collects the same birth details up front via this
  // component's own form, so re-demanding login just to download is pure
  // friction with no extra info gained — this prop lets that caller skip it.
  skipPdfLoginGate?: boolean;
  // Drops the "05 Charts" section (every D2-D60 varga chart) from the
  // downloaded PDF — see KundliPrintLayout's own comment. D1 and Navamsa
  // still appear (they're in "02 Kundli" regardless). Available if a
  // future caller wants to trade the full chart set for a faster download;
  // not currently used anywhere — the campaign microsite tried this and
  // asked for the full charts back.
  litePdf?: boolean;
  // Shown on the PDF's cover and closing pages in place of the plain logo
  // — the campaign microsite's own hero banner, so the downloaded report
  // carries the same festive branding as the page it came from. Left unset,
  // the main site keeps its plain logo-only cover/closing.
  pdfBannerImageSrc?: string;
  // When set, Download PDF POSTs birth details to this backend endpoint
  // (backend/app/api/kundliPdf.routes.ts) instead of running the client-side
  // html2canvas capture loop — a headless browser renders the exact same
  // report server-side and returns a real PDF via native print, in seconds
  // rather than minutes. Left unset (main site), the original client-side
  // path is unchanged.
  serverPdfUrl?: string;
  // Hides the two "Consult an Astrologer" CTAs (Overview and Remedies
  // tabs) — both call setPage('astrologers'), a real main-site route this
  // microsite's own hash router doesn't know, so they're dead buttons here
  // regardless. Left unset, the main site keeps them (they work there).
  hideAstrologerCta?: boolean;
  // Hides the "My Kundlis" history picker (form view) and the "Save to My
  // Account" bar (chart view) — the campaign microsite's own onboarding
  // already requires login up front and collects birth details fresh each
  // time, so a saved-history/re-save feature doesn't add anything there.
  // Left unset, the main site keeps both.
  hideHistoryAndSave?: boolean;
}

export default function KundliSection({ skipPdfLoginGate = false, litePdf = false, pdfBannerImageSrc, serverPdfUrl, hideAstrologerCta = false, hideHistoryAndSave = false }: KundliSectionProps = {}) {
  const { birthProfile, setBirthProfile, setKundliGenerated, currentUser, isLoggedIn, saveBirthDetails, setPage, pendingAction, setPendingAction, setShowLoginModal, language } = useAppContext();
  // Read once at mount — synchronously, so the resumed chart is on screen
  // from the very first render (no empty-form flash). Cleared in the
  // resume effect below.
  const [resumed] = useState(() => readKundliResume(isLoggedIn));
  const [fullResult, setFullResult] = useState<KundliFullResult | null>(resumed?.result ?? null);
  const [submittedDetails, setSubmittedDetails] = useState<BirthDetailsSubmitValue | null>(resumed?.result ? resumed.details : null);
  // The Kundli page's OWN Hindi/English toggle — deliberately scoped to just
  // this page: it drives this page's own labels (via the local `tr()` below,
  // not the site-wide `t()`), which language `fullResult` gets fetched in,
  // and which language the downloaded PDF renders in. It does NOT call the
  // site-wide `setLanguage` — switching it must never change any other
  // page's language, only ever seeded once from the site's current language
  // at mount (so a visitor already browsing in Hindi lands here in Hindi
  // too), never written back out to it afterward.
  const [pdfLanguage, setPdfLanguage] = useState<'en' | 'hi'>(() => resumed?.result && resumed.lang ? resumed.lang : (language === 'hi' ? 'hi' : 'en'));
  // Local stand-in for the site-wide t() — same TRANSLATIONS table, but
  // keyed off `pdfLanguage` instead of the site-wide `language`, so this
  // page's own UI strings (tab labels, buttons) follow the toggle above
  // without touching (or being touched by) the rest of the site.
  const tr = (key: string) => TRANSLATIONS[pdfLanguage]?.[key] || TRANSLATIONS.en?.[key] || key;
  const [error, setError] = useState('');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [zoomedChart, setZoomedChart] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  // Generation only ever starts from the Download click (see
  // handleDownloadPdfClick) — an earlier version started this silently the
  // moment the chart rendered, to make the eventual download instant. That
  // traded a worse problem in: the heavy html2canvas work competed with the
  // chart's OWN render for the main thread right as it appeared, which read
  // as "the whole Kundli page lags" with no on-screen explanation (there's
  // no visible UI for a prebuild nobody asked for yet). Back to only ever
  // running when the user actually asked for it, so nothing runs — and
  // nothing can lag the page — until they click Download.
  const [pdfState, setPdfState] = useState<'idle' | 'generating'>('idle');
  const [pdfProgress, setPdfProgress] = useState<{ weightDone: number; totalWeight: number } | null>(null);
  // Mirrors pdfProgress for the countdown tick (below) to read without
  // needing pdfProgress in its own effect's deps — that would restart the
  // interval (and the elapsed-time clock it's timing from) every time a
  // block finishes, instead of once per generation run.
  const pdfProgressRef = useRef<{ weightDone: number; totalWeight: number } | null>(null);
  useEffect(() => { pdfProgressRef.current = pdfProgress; }, [pdfProgress]);
  // The single displayed countdown (see estimatePdfRemainingSec). Each tick
  // steps toward the freshly-estimated remaining time by at most a few
  // seconds rather than jumping straight to it — the weighted estimate
  // itself is what fixed the big early swings (see that function's own
  // comment); this step cap just keeps a still-noisy single tick from
  // visibly jumping, while still letting the number move up as well as
  // down when the real pace genuinely changes.
  const pdfCountdownRef = useRef(0);
  const [pdfCountdownSec, setPdfCountdownSec] = useState(0);
  const [pdfStatusMsg, setPdfStatusMsg] = useState(PDF_STATUS_MESSAGES[0]);
  const [autoDownloadPending, setAutoDownloadPending] = useState(false);
  const [history, setHistory] = useState<KundliHistoryEntry[]>([]);
  const [gocharLagna, setGocharLagna] = useState<DailyHoroscopeResult | null>(null);
  const [gocharMoon, setGocharMoon] = useState<DailyHoroscopeResult | null>(null);
  const [gocharError, setGocharError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const kundliResult = fullResult?.kundli ?? null;
  const chartPlanets = kundliResult ? toChartPlanets(kundliResult, fullResult?.bhavChalit) : [];
  const TL = TAB_LABELS[pdfLanguage === 'hi' ? 'hi' : 'en'];
  const chartLabel = (key: string) => (pdfLanguage === 'hi' ? (CHART_LABELS_HI[key] || VARGA_LABELS_HI[key] || VARGA_LABELS[key] || key) : (CHART_LABELS[key] || VARGA_LABELS[key] || key));
  // Best-effort Devanagari spelling of the visitor's own name — only for the
  // on-screen chart header (real web fonts, renders fine); the PDF paths
  // compute their own copy off `pdfLanguage` right where they need it below,
  // since that toggle (not the site-wide `language`) is what actually
  // decides the report's language.
  const displayName = pdfLanguage === 'hi' ? transliterateNameToHindi(birthProfile.name) : birthProfile.name;

  // Shared by the D1/D9 featured row, the "all charts" tile grid, and the
  // zoom modal — one place that knows how to turn any chart key into
  // {planets, ascendantRashi}, instead of duplicating that branch 3 times.
  function resolveChart(key: string): { planets: ChartPlanet[]; ascendantRashi: string } {
    if (!fullResult) return { planets: [], ascendantRashi: '' };
    if (key === 'D1') return { planets: chartPlanets, ascendantRashi: kundliResult?.ascendant.rashi ?? '' };
    if (key === 'CHANDRA') return { planets: toChandraChartPlanets(fullResult.chandraChart), ascendantRashi: fullResult.chandraChart.moonRashi };
    if (key === 'BHAV_CHALIT') {
      const planets = toSimpleChartPlanets(fullResult.bhavChalit);
      return { planets, ascendantRashi: planets.find(p => p.id === 'asc')?.sign ?? '' };
    }
    if (key === 'D9') return { planets: toSimpleChartPlanets(fullResult.navamsaChart), ascendantRashi: fullResult.navamsaChart.ascendant.rashi };
    const varga = fullResult.vargaCharts[key];
    if (varga) return { planets: toSimpleChartPlanets(varga), ascendantRashi: varga.ascendant.rashi };
    return { planets: [], ascendantRashi: '' };
  }

  const savedBirthDetails = toSavedBirthDetails(currentUser);
  const alreadySavedThisProfile = !!(currentUser?.birthDate && submittedDetails && currentUser.birthDate === submittedDetails.date);

  // Side effects of a Kundli being shown for `details` — shared by a fresh
  // generation (handleSubmit) and a post-login resume.
  const onKundliShown = (details: BirthDetailsSubmitValue) => {
    setSaveState('idle');
    setBirthProfile({ ...birthProfile, name: details.name, dob: details.date, tob: details.time, place: details.placeName });
    setKundliGenerated(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Logged-in users get every generated kundli saved to their history
    // automatically — only the birth-detail inputs, never the computed
    // result (see kundliHistoryService.ts header comment for why).
    // Fire-and-forget: a failed save shouldn't block showing the chart.
    const accessToken = localStorage.getItem('auth_access_token');
    if (accessToken && !hideHistoryAndSave) {
      kundliHistoryService
        .save(accessToken, { name: details.name, date: details.date, time: details.time, timezoneOffsetMinutes: details.timezoneOffsetMinutes, latitude: details.latitude, longitude: details.longitude, placeLabel: details.placeName })
        .then(entry => setHistory(prev => [entry, ...prev]))
        .catch(() => {});
    }
  };

  const handleSubmit = async (details: BirthDetailsSubmitValue) => {
    setError('');
    try {
      const result = await calculatorService.kundliFull(details, pdfLanguage);
      setFullResult(result);
      setSubmittedDetails(details);
      onKundliShown(details);
    } catch (err) {
      setError(err instanceof CalculatorApiError ? err.message : 'Could not generate your Kundli. Please try again.');
    }
  };

  // Re-fetches the whole report in the new language whenever the toggle
  // flips AFTER a Kundli's already showing — the initial fetch (handleSubmit
  // above) already uses whatever `pdfLanguage` was selected at generation
  // time, so this only needs to fire on a later change, not on mount/submit.
  useEffect(() => {
    if (!submittedDetails) return;
    let cancelled = false;
    calculatorService.kundliFull(submittedDetails, pdfLanguage)
      .then(result => { if (!cancelled) setFullResult(result); })
      .catch(err => { if (!cancelled) setError(err instanceof CalculatorApiError ? err.message : 'Could not switch the report\'s language. Please try again.'); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfLanguage]);

  // Load the logged-in user's saved kundlis for the "My Kundlis" picker on
  // the form view.
  useEffect(() => {
    if (hideHistoryAndSave || !isLoggedIn) { setHistory([]); return; }
    const accessToken = localStorage.getItem('auth_access_token');
    if (!accessToken) return;
    kundliHistoryService.list(accessToken).then(setHistory).catch(() => {});
  }, [isLoggedIn, hideHistoryAndSave]);

  // Resume after an anonymous user was sent to log in (see
  // handleDownloadPdfClick below) — stashed in sessionStorage since AuthPage
  // clears `pendingAction` in the same tick it navigates back here, before
  // this component could read it. Only restores the Kundli itself — the PDF
  // (and its full-screen loader) starts when the user clicks Download PDF.
  useEffect(() => {
    if (!isLoggedIn) return;
    const stash = resumed ?? readKundliResume(true);
    sessionStorage.removeItem(KUNDLI_RESUME_KEY);
    if (!stash) return;
    if (stash.result) onKundliShown(stash.details); // already on screen from the first render
    else handleSubmit(stash.details); // result didn't fit in sessionStorage — regenerate
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Once the resumed generation lands, actually trigger the download.
  useEffect(() => {
    if (autoDownloadPending && fullResult) {
      setAutoDownloadPending(false);
      setPdfState('generating');
    }
  }, [autoDownloadPending, fullResult]);

  // Gochar tab — real current transits for THIS person's own chart, read
  // both ways classical Gochar predictions are conventionally done: from
  // the natal Lagna and from the natal Moon. Reuses the same real,
  // already-verified daily-transit endpoint the Horoscope page uses —
  // no new computation, just anchored to this person's actual placements
  // instead of a manually-picked rashi. Fetched lazily on first visit to
  // the tab, not on every kundli generation.
  useEffect(() => {
    if (activeTab !== 'gochar' || !kundliResult || gocharLagna) return;
    setGocharError('');
    const moonRashi = kundliResult.planets.find(p => p.id === 'moon')?.rashi;
    Promise.all([
      calculatorService.dailyHoroscope(kundliResult.ascendant.rashi),
      moonRashi ? calculatorService.dailyHoroscope(moonRashi) : Promise.resolve(null),
    ])
      .then(([lagna, moon]) => { setGocharLagna(lagna); setGocharMoon(moon); })
      .catch(err => setGocharError(err instanceof CalculatorApiError ? err.message : 'Could not load today\'s Gochar.'));
  }, [activeTab, kundliResult, gocharLagna]);

  const handleDownloadPdfClick = () => {
    setError('');
    if (!isLoggedIn && !skipPdfLoginGate) {
      if (submittedDetails) {
        try {
          sessionStorage.setItem(KUNDLI_RESUME_KEY, JSON.stringify({ details: submittedDetails, result: fullResult ?? undefined, lang: pdfLanguage } satisfies KundliResume));
        } catch {
          // Over the storage quota — keep just the birth details; the resume regenerates from them.
          try { sessionStorage.setItem(KUNDLI_RESUME_KEY, JSON.stringify({ details: submittedDetails } satisfies KundliResume)); } catch { /* storage unavailable */ }
        }
      }
      setPendingAction('kundli-pdf');
      setShowLoginModal(true);
      return;
    }
    if (serverPdfUrl) {
      void downloadPdfFromServer();
      return;
    }
    void downloadPdfClientSide();
  };

  // Client-side path (main site) — `fullResult` is already in whatever
  // language the toggle currently has selected (see the refetch effect
  // above), so there's nothing left to prepare here.
  const downloadPdfClientSide = async () => {
    setPdfState('generating');
  };

  // Server-rendered path (see the serverPdfUrl prop comment above) — a
  // single request/response, no client-side capture loop, no countdown
  // math. `pdfState` still flips to 'generating' just to drive the
  // button's disabled/label state; the effects below that actually run the
  // OLD client-side capture are all separately guarded on `!serverPdfUrl`
  // so they never also fire during this branch.
  const downloadPdfFromServer = async () => {
    if (!submittedDetails || !serverPdfUrl) return;
    setPdfState('generating');
    try {
      const res = await fetch(serverPdfUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: submittedDetails.name,
          // Kept separate from `name` — the backend still sanitizes `name`
          // (Latin-only regex) into the download filename, which would come
          // out empty if fed Devanagari; this is only for the text shown ON
          // the report itself (cover title, running header).
          displayName: pdfLanguage === 'hi' ? transliterateNameToHindi(submittedDetails.name) : submittedDetails.name,
          dob: submittedDetails.date,
          tob: submittedDetails.time,
          place: submittedDetails.placeName,
          latitude: submittedDetails.latitude,
          longitude: submittedDetails.longitude,
          timezoneOffsetMinutes: submittedDetails.timezoneOffsetMinutes,
          language: pdfLanguage,
          timeUnknown: submittedDetails.timeUnknown ?? false,
        }),
      });
      if (!res.ok) throw new Error('Server PDF generation failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${sanitizeFileName(submittedDetails.name)}_${pdfLanguage === 'hi' ? 'HIN' : 'ENG'}_Kundli.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError('PDF generation failed — please try again.');
    } finally {
      setPdfState('idle');
    }
  };

  const handleHistorySelect = (entry: KundliHistoryEntry) => {
    handleSubmit({
      name: entry.name,
      date: entry.date,
      time: entry.time,
      timezoneOffsetMinutes: entry.timezoneOffsetMinutes,
      latitude: entry.latitude,
      longitude: entry.longitude,
      placeName: entry.placeLabel || '',
    });
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

  // Client-side capture of the hidden KundliPrintLayout (see that file's
  // header comment for why this reuses the same NorthIndianChart component
  // rather than a server-side renderer). html2canvas/jsPDF are dynamically
  // imported so their ~250-300KB never loads for users who never click this.
  //
  // The print layout is only mounted (below, gated on pdfState==='generating')
  // for this brief capture window, not permanently whenever a kundli is
  // shown — it used to sit in the DOM at all times, which a page-usability
  // scan flagged as a wall of sub-12px hidden text (aria-hidden isn't
  // respected by every such tool). This effect fires once printRef.current
  // actually exists, i.e. after that transient mount has committed.
  //
  // Captures each top-level block (marked data-pdf-block in
  // KundliPrintLayout) as its OWN canvas and places each as a whole onto the
  // PDF, starting a fresh page whenever the next block wouldn't fit in what's
  // left of the current one. The previous version captured the entire
  // flowing document as ONE giant image and mechanically sliced it into
  // fixed-height page chunks — with zero awareness of where a table row or
  // paragraph actually was, so content routinely got cut in half right at
  // the slice boundary. Also adds a hard timeout: if generation ever hangs
  // (whatever the cause), the button unstucks itself instead of needing a
  // manual page refresh.
  // Drives the single "Preparing… MM:SS" countdown. Elapsed time is
  // computed from wall-clock (`Date.now() - startedAt`) every tick, not
  // incremented by 1 per tick — html2canvas's per-block rasterization runs
  // synchronously on the main thread for a second or more at a time on the
  // heavier chart SVGs, which starves setInterval and makes it fire late or
  // skip ticks; re-deriving from wall-clock self-corrects on the very next
  // tick regardless of how many were missed. That elapsed time then feeds
  // estimatePdfRemainingSec (now weighted — see that function's comment)
  // and steps the display toward it a few seconds at a time in either
  // direction, rather than jumping straight there.
  useEffect(() => {
    // The server-rendered path (serverPdfUrl) finishes in seconds — this
    // whole countdown/status-rotation machinery was built for a multi-minute
    // client-side capture and would just show misleading numbers here.
    if (pdfState !== 'generating' || serverPdfUrl) return;
    const startedAt = Date.now();
    pdfCountdownRef.current = estimatePdfRemainingSec(0, null);
    setPdfCountdownSec(pdfCountdownRef.current);
    const id = window.setInterval(() => {
      const elapsedSec = (Date.now() - startedAt) / 1000;
      const estimate = estimatePdfRemainingSec(elapsedSec, pdfProgressRef.current);
      // Moves toward the real observed pace both up AND down (a genuinely
      // slower machine right now must show a longer countdown, not get
      // silently floored) — a step cap per tick, not the estimate itself,
      // is what keeps this from jumping (the old bug this replaced: a single
      // early noisy sample, e.g. one unusually slow/fast block out of ~30,
      // swinging the display 01:30 -> 00:02 -> 03:58). Clamping the display
      // to only ever decrease "fixed" that by hiding real slowdowns instead
      // of smoothing them.
      const step = Math.max(-3, Math.min(3, estimate - pdfCountdownRef.current));
      pdfCountdownRef.current = Math.round(pdfCountdownRef.current + step);
      setPdfCountdownSec(pdfCountdownRef.current);
    }, 250);

    // Purely cosmetic — this report already runs in the background with no
    // way to show real per-block progress next to the button (see the
    // countdown above for that), so a slow-changing, on-theme status line
    // is what keeps a 1-2 minute wait from reading as the page having
    // silently stopped doing anything. Order is shuffled once per
    // generation, not fixed, so it doesn't read as scripted on repeat runs.
    const shuffled = [...PDF_STATUS_MESSAGES].sort(() => Math.random() - 0.5);
    setPdfStatusMsg(shuffled[0]);
    let msgIndex = 0;
    const msgId = window.setInterval(() => {
      msgIndex = (msgIndex + 1) % shuffled.length;
      setPdfStatusMsg(shuffled[msgIndex]);
    }, 3200);

    return () => { window.clearInterval(id); window.clearInterval(msgId); };
  }, [pdfState, serverPdfUrl]);

  useEffect(() => {
    if (pdfState !== 'generating' || !fullResult || !printRef.current || serverPdfUrl) return;
    let settled = false;
    // Read by the block loop below, which checks it once per iteration.
    // Before this existed, the timeout only reset React state (unmounting
    // the hidden print layout, since it's gated on pdfState==='generating')
    // while the async loop below kept running in the background completely
    // unaware — still calling html2canvas on now-detached elements and
    // eventually still calling pdf.save(), producing a truncated PDF (e.g.
    // "only 4 pages") well after the UI had already reset to idle. Setting
    // this actually stops the loop instead of leaving it to limp along
    // against a DOM that's disappeared out from under it.
    let cancelled = false;
    // The report includes every divisional chart, one topic per page (a
    // real full-length report, not a condensed summary) — measured at
    // ~4.5-5 minutes on a clean machine, so 300s cut real, successful runs
    // off right at the edge (one measured completion landed at 296s; a
    // second, slightly busier run was still going at 315s and got killed).
    // 7 minutes gives genuine real-machine variance actual room instead of
    // gambling on the best case every time.
    const safetyTimer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cancelled = true;
      setPdfState('idle');
      setPdfProgress(null);
      setError('PDF generation took too long — please try again.');
    }, 420000);

    (async () => {
      try {
        await generateBrandedPdf({
          root: printRef.current!,
          headerTitle: `${birthProfile.name || 'Kundli'}'s Kundli`,
          fileName: `${sanitizeFileName(birthProfile.name)}_${pdfLanguage === 'hi' ? 'HIN' : 'ENG'}_Kundli.pdf`,
          blockWeight,
          onProgress: (weightDone, totalWeight) => setPdfProgress({ weightDone, totalWeight }),
          isCancelled: () => cancelled,
        });
      } catch (e) {
        if (!cancelled) {
          console.error('PDF generation failed:', e);
          setError('Could not generate the PDF — please try again.');
        }
      } finally {
        window.clearTimeout(safetyTimer);
        // A cancelled (superseded) run must never touch shared state again —
        // see the cleanup comment below for why this matters.
        if (!cancelled) {
          setPdfProgress(null);
          if (!settled) { settled = true; setPdfState('idle'); }
        }
      }
    })();

    return () => {
      // Actually stop THIS run, not just its safety timer. Before this,
      // re-clicking Download (for the same or a different kundli) or
      // clicking "Edit Details" while a generation was still in flight left
      // the old loop running in the background — `cancelled` was only ever
      // set by the 5-minute safety timer, never by cleanup — so it kept
      // capturing blocks and calling setPdfProgress/setPdfState against
      // shared state well after a newer run had started. Two loops racing,
      // each with its own blocks.length total, is exactly what made the
      // progress bar jump around (10%, then 30%, then 22%, ...) instead of
      // climbing steadily — whichever loop's setPdfProgress happened to land
      // last won, regardless of which one was actually further along.
      cancelled = true;
      window.clearTimeout(safetyTimer);
    };
  }, [pdfState, fullResult, birthProfile.name, pdfLanguage, serverPdfUrl]);

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
                <h1 className={styles.sectionTitle}>Apni Janam Kundli Banayein</h1>
                <div className={styles.divider}>✦ ❖ ✦</div>
                <p className={styles.subtitle}>
                  Your birth chart is the blueprint of your soul's journey. Enter your exact birth coordinates
                  to map your Grahas, Bhavas, and Nakshatras.
                </p>
              </div>

              {!hideHistoryAndSave && isLoggedIn && history.length > 0 && (
                <div className={styles.overview} style={{ maxWidth: 700, margin: '0 auto var(--space-8)', textAlign: 'left' }}>
                  <h2 className={styles.overviewTitle}>My Kundlis</h2>
                  <div className={styles.timelineList}>
                    {history.slice(0, 5).map(entry => (
                      <button key={entry.id} type="button" className={`${styles.timelineItem} ${styles.timelineItemButton}`} onClick={() => handleHistorySelect(entry)}>
                        <span className={styles.timelineLord}>{entry.name}</span>
                        <span className={styles.timelineDates}>{entry.date} · {entry.placeLabel || `${entry.latitude.toFixed(2)}, ${entry.longitude.toFixed(2)}`}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <BirthDetailsForm onSubmit={handleSubmit} submitLabel="Generate My Free Kundli" idPrefix="kundli" showGenderField initialValues={savedBirthDetails} allowUnknownTime />
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
                  <span className={`section-eyebrow ${styles.chartHeaderEyebrow}`}>Birth Chart</span>
                  <h1 className="section-title-cosmos">{pdfLanguage === 'hi' ? `${displayName} की कुंडली` : <>{displayName}&apos;s Kundli</>}</h1>
                  <p className={styles.chartMeta}>
                    {/* The exact clock value substituted for an unknown birth
                        time is never shown here — showing it would read as
                        the visitor's real birth time, which it isn't. */}
                    {birthProfile.dob} · {submittedDetails?.timeUnknown ? (pdfLanguage === 'hi' ? 'समय अज्ञात' : 'Time unknown') : birthProfile.tob} · {birthProfile.place}
                  </p>
                  {submittedDetails?.timeUnknown && (
                    <p className={styles.chartMeta} style={{ color: '#b8860b', marginTop: 4 }}>
                      {pdfLanguage === 'hi'
                        ? '⚠ यह कुंडली पूर्ण रूप से सटीक नहीं है — सही जन्म समय उपलब्ध न होने के कारण वर्तमान समय का उपयोग किया गया है। लग्न, भाव और नक्षत्र पद जैसे समय-संवेदनशील विवरण वास्तविक जन्म कुंडली से भिन्न हो सकते हैं।'
                        : "⚠ This Kundli isn't fully accurate — since your exact time of birth wasn't provided, the current time was used as an approximation. Time-sensitive details like your Ascendant, houses, and exact Nakshatra Pada may differ from your real birth chart."}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)', flexShrink: 0 }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div
                      role="group"
                      aria-label="PDF report language"
                      style={{ display: 'flex', border: '1px solid var(--color-gold, #c9a227)', borderRadius: '999px', overflow: 'hidden' }}
                    >
                      {(['en', 'hi'] as const).map(lang => (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setPdfLanguage(lang)}
                          disabled={pdfState === 'generating'}
                          style={{
                            padding: '0.35rem 0.9rem',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            border: 'none',
                            cursor: pdfState === 'generating' ? 'default' : 'pointer',
                            background: pdfLanguage === lang ? 'var(--color-gold, #c9a227)' : 'transparent',
                            color: pdfLanguage === lang ? '#1a1206' : 'var(--color-text-muted)',
                          }}
                        >
                          {lang === 'en' ? 'English' : 'हिन्दी'}
                        </button>
                      ))}
                    </div>
                    <button
                      className="btn btn-gold"
                      onClick={handleDownloadPdfClick}
                      disabled={pdfState === 'generating'}
                      id="kundli-download-pdf-btn"
                    >
                      {tr('kundli_download_pdf')}
                    </button>
                    <button
                      className="btn btn-outline-gold"
                      onClick={() => setFullResult(null)}
                      id="kundli-edit-btn"
                    >
                      {tr('kundli_edit_details')}
                    </button>
                  </div>
                  {pdfState === 'generating' && (
                    <PdfLoader
                      message={serverPdfUrl ? PDF_STATUS_MESSAGES[0] : pdfStatusMsg}
                      progress={pdfProgress && pdfProgress.totalWeight ? pdfProgress.weightDone / pdfProgress.totalWeight : null}
                    />
                  )}
                </div>
              </div>

              {error && pdfState === 'idle' && <p className={styles.chartNote} style={{ color: '#d64545', marginTop: 'calc(-1 * var(--space-6))', marginBottom: 'var(--space-6)' }}>{error}</p>}

              {pdfState === 'generating' && fullResult && !serverPdfUrl && (
                // A large negative left offset (the old approach) is a known
                // trouble spot for html2canvas — some browsers report a huge
                // scrollable viewport when a captured ancestor sits far
                // outside normal page bounds, which can distort or hang the
                // capture. This keeps the content at normal (0,0) coordinates
                // — fully laid out, just visually clipped to nothing by the
                // zero-size overflow:hidden wrapper — instead of pushed off
                // into extreme negative space.
                <div style={{ position: 'fixed', top: 0, left: 0, width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} aria-hidden="true">
                  <div ref={printRef}>
                    <KundliPrintLayout name={pdfLanguage === 'hi' ? transliterateNameToHindi(birthProfile.name) : birthProfile.name} dob={birthProfile.dob} tob={birthProfile.tob} timeUnknown={submittedDetails?.timeUnknown ?? false} place={birthProfile.place} timezoneOffsetMinutes={submittedDetails?.timezoneOffsetMinutes ?? 0} latitude={submittedDetails?.latitude} longitude={submittedDetails?.longitude} result={fullResult} skipExtraDivisionalCharts={litePdf} bannerImageSrc={pdfBannerImageSrc} language={pdfLanguage} />
                  </div>
                </div>
              )}

              {/* Tab bar — swaps content below instead of one long continuous scroll */}
              <div className={styles.tabBar} role="tablist">
                {TABS.map(tab => {
                  const TabIcon = TAB_ICONS[tab.key];
                  return (
                    <button
                      key={tab.key}
                      role="tab"
                      aria-selected={activeTab === tab.key}
                      className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
                      onClick={e => {
                        setActiveTab(tab.key);
                        // On mobile the bar scrolls horizontally — tapping a
                        // tab near either edge used to leave it half-hidden
                        // since nothing brought it into view. This centers
                        // whichever tab was just tapped inside the bar.
                        e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                      }}
                    >
                      <TabIcon size={16} />
                      {tr(tab.labelKey)}
                    </button>
                  );
                })}
              </div>

              {activeTab === 'overview' && (
                <>
                  <ChartDisplay
                    title={TL.d1Title}
                    planets={chartPlanets}
                    ascendantRashi={kundliResult?.ascendant.rashi ?? ''}
                    allowPlacementsToggle={false}
                    language={pdfLanguage}
                    footer={
                      <>
                        <HighlightChip icon={RashiChakraIcon} label="Ascendant" value={kundliResult ? hindiOr(pdfLanguage, HINDI_RASHI, kundliResult.ascendant.rashi) : '—'} />
                        <HighlightChip icon={MoonIcon} label="Moon Sign" value={(() => { const s = chartPlanets.find(p => p.id === 'moon')?.sign; return s ? hindiOr(pdfLanguage, HINDI_RASHI, s) : '—'; })()} />
                        <HighlightChip icon={SunIcon} label="Sun Sign" value={(() => { const s = chartPlanets.find(p => p.id === 'sun')?.sign; return s ? hindiOr(pdfLanguage, HINDI_RASHI, s) : '—'; })()} />
                        <HighlightChip icon={ConstellationIcon} label="Nakshatra" value={kundliResult ? hindiOr(pdfLanguage, HINDI_NAKSHATRA, kundliResult.moonNakshatra.name) : '—'} />
                        <HighlightChip icon={LotusIcon} label="Tithi" value={`${hindiOr(pdfLanguage, PAKSHA_HI, fullResult.panchang.tithi.paksha)} ${hindiOr(pdfLanguage, HINDI_TITHI, fullResult.panchang.tithi.name)}`} />
                      </>
                    }
                  />

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{tr('kundli_panchang_at_birth')}</h2>
                    <div className={styles.infoGrid}>
                      <InfoCard icon={RashiChakraIcon} label="Tithi">{hindiOr(pdfLanguage, PAKSHA_HI, fullResult.panchang.tithi.paksha)} {hindiOr(pdfLanguage, HINDI_TITHI, fullResult.panchang.tithi.name)}</InfoCard>
                      <InfoCard icon={ConstellationIcon} label="Nakshatra">{kundliResult ? hindiOr(pdfLanguage, HINDI_NAKSHATRA, kundliResult.moonNakshatra.name) : ''} (Pada {kundliResult?.moonNakshatra.pada})</InfoCard>
                      <InfoCard icon={LotusIcon} label="Yoga">{hindiOr(pdfLanguage, HINDI_YOGA, fullResult.panchang.yoga)}</InfoCard>
                      <InfoCard icon={ConstellationIcon} label="Karana">{hindiOr(pdfLanguage, HINDI_KARANA, fullResult.panchang.karana)}</InfoCard>
                      {fullResult.panchang.sunrise && <InfoCard icon={SunIcon} label="Sunrise">{formatLocalTime(fullResult.panchang.sunrise, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.sunset && <InfoCard icon={SunsetIcon} label="Sunset">{formatLocalTime(fullResult.panchang.sunset, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.rahuKaal && <InfoCard icon={ClockIcon} label="Rahu Kalam">{formatLocalTime(fullResult.panchang.rahuKaal.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.rahuKaal.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.yamagandaKaal && <InfoCard icon={ClockIcon} label="Yamaganda">{formatLocalTime(fullResult.panchang.yamagandaKaal.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.yamagandaKaal.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.gulikaKaal && <InfoCard icon={ClockIcon} label="Gulika Kalam">{formatLocalTime(fullResult.panchang.gulikaKaal.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.gulikaKaal.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      {fullResult.panchang.abhijitMuhurat && <InfoCard icon={CheckCircleIcon} label="Abhijit Muhurat">{formatLocalTime(fullResult.panchang.abhijitMuhurat.start, submittedDetails?.timezoneOffsetMinutes ?? 0)} – {formatLocalTime(fullResult.panchang.abhijitMuhurat.end, submittedDetails?.timezoneOffsetMinutes ?? 0)}</InfoCard>}
                      <InfoCard icon={ConstellationIcon} label="Vara (Weekday)">{hindiOr(pdfLanguage, HINDI_WEEKDAY, fullResult.panchang.vara)}</InfoCard>
                      <InfoCard icon={ConstellationIcon} label="Nakshatra Lord">{pdfLanguage === 'hi' ? (HINDI_PLANET[kundliResult?.moonNakshatra.lord ?? ''] || cap(kundliResult?.moonNakshatra.lord ?? '')) : cap(kundliResult?.moonNakshatra.lord ?? '')}</InfoCard>
                      <InfoCard icon={MoonIcon} label="Moon Rashi">{(() => { const s = chartPlanets.find(p => p.id === 'moon')?.sign; return s ? hindiOr(pdfLanguage, HINDI_RASHI, s) : '—'; })()}</InfoCard>
                      {kundliResult && <InfoCard icon={RashiChakraIcon} label="Ascendant Lord">{pdfLanguage === 'hi' ? (HINDI_PLANET[RASHI_LORD_BY_NAME[kundliResult.ascendant.rashi]] || cap(RASHI_LORD_BY_NAME[kundliResult.ascendant.rashi] || '')) : cap(RASHI_LORD_BY_NAME[kundliResult.ascendant.rashi] || '')}</InfoCard>}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{tr('kundli_what_chart_means')}</h2>
                    <p className={styles.overviewText}><strong>Ascendant.</strong> {fullResult.analysis.lagna}</p>
                    <p className={styles.overviewText}><strong>Moon.</strong> {fullResult.analysis.moon}</p>
                    {fullResult.analysis.planets.filter(p => p.id !== 'moon').map(p => (
                      <p key={p.id} className={styles.overviewText}><strong>{PLANET_META[p.id]?.name || cap(p.id)}.</strong> {p.text}</p>
                    ))}
                    <p className={styles.chartNote}>
                      {TL.verifyNote}
                    </p>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.avakhadaChakra}</h2>
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
                <div className={styles.overview}>
                  <p className={styles.chartNote} style={{ textAlign: 'left' }}>{TL.chartsIntro}</p>

                  {/* D1 + D9, side by side, full detail (diagram + planet list) — no dropdown needed to see either. */}
                  <div className={styles.featuredChartsRow}>
                    <div onClick={() => setZoomedChart('D1')} className={styles.featuredChartClickable}>
                      <ChartDisplay title={TL.d1Title} planets={chartPlanets} ascendantRashi={kundliResult?.ascendant.rashi ?? ''} allowPlacementsToggle={false} language={pdfLanguage} />
                    </div>
                    <div onClick={() => setZoomedChart('D9')} className={styles.featuredChartClickable}>
                      <ChartDisplay title={TL.d9Title} planets={toSimpleChartPlanets(fullResult.navamsaChart)} ascendantRashi={fullResult.navamsaChart.ascendant.rashi} allowPlacementsToggle={false} language={pdfLanguage} />
                    </div>
                  </div>
                  {chartPlanets.some(p => p.bhavHouse !== undefined) && (
                    <p className={styles.chartNote}>
                      {TL.bhavChalitNote}
                    </p>
                  )}

                  {/* Every other chart — click any tile to open it full-screen. */}
                  <h2 className={styles.overviewTitle} style={{ marginTop: 'var(--space-6)' }}>{tr('kundli_all_divisional_charts')}</h2>
                  <div className={styles.chartTileGrid}>
                    {CHART_KEYS.filter(k => k !== 'D1' && k !== 'D9').map(key => {
                      const { planets, ascendantRashi } = resolveChart(key);
                      return (
                        <button key={key} type="button" className={styles.chartTile} onClick={() => setZoomedChart(key)}>
                          <div className={styles.chartTilePreview}>
                            <NorthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={() => {}} onPlanetLeave={() => {}} onHouseHover={() => {}} onHouseLeave={() => {}} language={pdfLanguage} />
                          </div>
                          <span className={styles.chartTileLabel}>{chartLabel(key)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {zoomedChart && (() => {
                const { planets, ascendantRashi } = resolveChart(zoomedChart);
                return (
                  <div className={styles.chartZoomOverlay} onClick={() => setZoomedChart(null)}>
                    <div className={styles.chartZoomPanel} onClick={e => e.stopPropagation()}>
                      <button type="button" className={styles.chartZoomClose} onClick={() => setZoomedChart(null)} aria-label="Close">✕</button>
                      <h2 className={styles.overviewTitle}>{chartLabel(zoomedChart)}</h2>
                      {zoomedChart === 'D2' && (
                        <p className={styles.chartNote}>
                          {TL.horaNote}
                        </p>
                      )}
                      <ChartDisplay title={TL.placements} planets={planets} ascendantRashi={ascendantRashi} language={pdfLanguage} />
                    </div>
                  </div>
                );
              })()}

              {activeTab === 'gochar' && (
                <div className={styles.overview}>
                  <h2 className={styles.overviewTitle}>{TL.gocharTitle}</h2>
                  <p className={styles.chartNote} style={{ textAlign: 'left' }}>
                    {TL.gocharDesc}
                  </p>
                  {gocharError && <p style={{ color: '#d64545' }}>{gocharError}</p>}
                  {!gocharLagna && !gocharError && <p className={styles.chartNote} style={{ textAlign: 'left' }}>{TL.gocharLoading}</p>}
                  {fullResult.doshas.sadeSati.active && (
                    <div className={styles.doshaCard}>
                      <h3 className={styles.doshaCardTitle}>{TL.sadeSatiActiveTitle}</h3>
                      <p className={styles.doshaCardText}>{TL.sadeSatiActiveText(hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.sadeSati.saturnTransitRashi ?? ''), (pdfLanguage === 'hi' ? (DOSHA_PHASE_HI[fullResult.doshas.sadeSati.phase ?? ''] || fullResult.doshas.sadeSati.phase) : fullResult.doshas.sadeSati.phase) ?? '', hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.sadeSati.moonRashi ?? ''))}</p>
                    </div>
                  )}
                  <div className={styles.doshaCard}>
                    <h3 className={styles.doshaCardTitle}>{TL.rahuKetuTransit}</h3>
                    <p className={styles.doshaCardText}>{TL.rahuKetuTransitText(
                      hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.rahuKetuTransit.rahuTransitRashi),
                      pdfLanguage === 'hi' ? String(fullResult.doshas.rahuKetuTransit.rahuHouseFromMoon) : ordinal(fullResult.doshas.rahuKetuTransit.rahuHouseFromMoon),
                      hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.rahuKetuTransit.ketuTransitRashi),
                      pdfLanguage === 'hi' ? String(fullResult.doshas.rahuKetuTransit.ketuHouseFromMoon) : ordinal(fullResult.doshas.rahuKetuTransit.ketuHouseFromMoon),
                    )}</p>
                  </div>
                  {gocharLagna && (
                    <div className={styles.infoGrid} style={{ marginTop: 'var(--space-4)' }}>
                      {chartPlanets.filter(p => p.id !== 'asc').map(natal => {
                        const fromLagna = gocharLagna.transits.find(t => t.id === natal.id);
                        const fromMoon = gocharMoon?.transits.find(t => t.id === natal.id);
                        if (!fromLagna) return null;
                        return (
                          <InfoCard key={natal.id} icon={ConstellationIcon} label={pdfLanguage === 'hi' ? (HINDI_PLANET[natal.id] || natal.name) : natal.name}>
                            {TL.natal}: {hindiOr(pdfLanguage, HINDI_RASHI, natal.sign)} ({natal.house}H)<br />
                            {TL.transit}: {hindiOr(pdfLanguage, HINDI_RASHI, fromLagna.rashi)}{fromLagna.retrograde ? ' ℞' : ''} — {pdfLanguage === 'hi' ? fromLagna.house : ordinal(fromLagna.house)}H {TL.fromLagna}{fromMoon ? `, ${pdfLanguage === 'hi' ? fromMoon.house : ordinal(fromMoon.house)}H ${TL.fromMoon}` : ''}
                          </InfoCard>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'timeline' && (
                <>
                  <div className={styles.timelinePanel}>
                    <h2 className={styles.overviewTitle}>{TL.mahadashaTimelineTitle}</h2>
                    <p className={styles.overviewText}>{TL.mahadashaTimelineDesc}</p>
                    <div className={styles.timelineList}>
                      {fullResult.mahadashaTimeline.filter(period => period.active).map((period, i) => (
                        <div key={i}>
                          <div className={`${styles.timelineItem} ${styles.timelineItemActive}`}>
                            <span className={styles.timelineLord}>{TL.mahadasha(period.lord, period.active)}</span>
                            <span className={styles.timelineDates}>{period.startsAt} → {period.endsAt}</span>
                          </div>
                          {fullResult.dashaPredictions.find(d => d.lord === period.lord) && (
                            <p className={styles.dashaPredictionText}>{fullResult.dashaPredictions.find(d => d.lord === period.lord)!.text}</p>
                          )}
                          <div className={styles.antardashaList}>
                            {period.antardashas.filter(sub => sub.active).map((sub, j) => (
                              <div key={j} className={styles.antardashaItem}>
                                <span>{TL.antardasha(sub.lord)}</span>
                                <span>{sub.startsAt} → {sub.endsAt}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.timelinePanel}>
                    <h2 className={styles.overviewTitle}>{TL.yoginiTimelineTitle}</h2>
                    <p className={styles.overviewText}>{TL.yoginiTimelineDesc}</p>
                    <div className={styles.timelineList}>
                      {fullResult.yoginiDashaTimeline.filter(period => period.active).map((period, i) => (
                        <div key={i} className={`${styles.timelineItem} ${styles.timelineItemActive}`}>
                          <span className={styles.timelineLord}>{TL.yoginiLine(period.yogini, period.lord, period.active)}</span>
                          <span className={styles.timelineDates}>{period.startsAt} → {period.endsAt}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.doshas}</h2>
                    <div className={styles.doshaYogaGrid}>
                      <div className={styles.doshaCard}>
                        <div className={styles.doshaCardHead}>
                          <span className={styles.doshaCardTitle}>{TL.kaalSarpDosha}</span>
                          <span className={`${styles.statusBadge} ${fullResult.doshas.kaalSarp.isKaalSarp ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                            {fullResult.doshas.kaalSarp.isKaalSarp ? TL.present : TL.clear}
                          </span>
                        </div>
                        <p className={styles.doshaCardText}>{TL.kaalSarpText(hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.kaalSarp.rahuRashi), hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.kaalSarp.ketuRashi))}</p>
                      </div>
                      <div className={styles.doshaCard}>
                        <div className={styles.doshaCardHead}>
                          <span className={styles.doshaCardTitle}>{TL.sadeSati}</span>
                          <span className={`${styles.statusBadge} ${fullResult.doshas.sadeSati.active ? styles.statusBadgeActive : styles.statusBadgeClear}`}>
                            {fullResult.doshas.sadeSati.active ? TL.activePhase(fullResult.doshas.sadeSati.phase ?? '') : TL.notActive}
                          </span>
                        </div>
                        <p className={styles.doshaCardText}>{TL.sadeSatiText(hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.sadeSati.saturnTransitRashi), hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.sadeSati.moonRashi))}</p>
                      </div>
                      <div className={styles.doshaCard}>
                        <div className={styles.doshaCardHead}>
                          <span className={styles.doshaCardTitle}>{TL.rahuKetuTransit}</span>
                        </div>
                        <p className={styles.doshaCardText}>{TL.rahuKetuText(
                          hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.rahuKetuTransit.rahuTransitRashi),
                          pdfLanguage === 'hi' ? String(fullResult.doshas.rahuKetuTransit.rahuHouseFromMoon) : ordinal(fullResult.doshas.rahuKetuTransit.rahuHouseFromMoon),
                          hindiOr(pdfLanguage, HINDI_RASHI, fullResult.doshas.rahuKetuTransit.ketuTransitRashi),
                          pdfLanguage === 'hi' ? String(fullResult.doshas.rahuKetuTransit.ketuHouseFromMoon) : ordinal(fullResult.doshas.rahuKetuTransit.ketuHouseFromMoon),
                        )}</p>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'predictions' && (
                <>
                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.ascendantPredictions}</h2>
                    <p className={styles.overviewText}>{fullResult.ascendantPredictions.description}</p>
                    <p className={styles.chartNote} style={{ marginBottom: 'var(--space-4)' }}>{TL.ascendantIsPreview(hindiOr(pdfLanguage, HINDI_RASHI, fullResult.ascendantPredictions.ascendant))}</p>
                    <div className={styles.predictionGrid}>
                      {([
                        [TL.personality, fullResult.ascendantPredictions.personality],
                        [TL.physical, fullResult.ascendantPredictions.physical],
                        [TL.health, fullResult.ascendantPredictions.health],
                        [TL.career, fullResult.ascendantPredictions.career],
                        [TL.relationship, fullResult.ascendantPredictions.relationship],
                      ] as const).map(([label, text]) => (
                        <div key={label} className={styles.predictionCard}>
                          <div className={styles.predictionCardTitle}>{label}</div>
                          <p className={styles.doshaCardText}>{text}</p>
                        </div>
                      ))}
                    </div>
                    {(fullResult.ascendantPredictions.dos.length > 0 || fullResult.ascendantPredictions.donts.length > 0) && (
                      <div style={{ marginTop: 'var(--space-6)' }}>
                        <h2 className={styles.overviewTitle}>{TL.dosAndDonts}</h2>
                        <div className={styles.doshaYogaGrid}>
                          <div className={styles.doshaCard}>
                            <div className={styles.doshaCardHead}>
                              <span className={styles.doshaCardTitle}>{TL.dos}</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
                              {fullResult.ascendantPredictions.dos.map((d, i) => (
                                <li key={i} className={styles.doshaCardText}>{d}</li>
                              ))}
                            </ul>
                          </div>
                          <div className={styles.doshaCard}>
                            <div className={styles.doshaCardHead}>
                              <span className={styles.doshaCardTitle}>{TL.donts}</span>
                            </div>
                            <ul style={{ margin: 0, paddingLeft: '1.1em' }}>
                              {fullResult.ascendantPredictions.donts.map((d, i) => (
                                <li key={i} className={styles.doshaCardText}>{d}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    )}
                    {!hideAstrologerCta && (
                      <div className={styles.saveBar} style={{ marginTop: 'var(--space-6)' }}>
                        <span className={styles.saveText}>{TL.quickPreviewNote}</span>
                        <button className="btn btn-gold" onClick={() => setPage('astrologers')}>{TL.consultAstrologer}</button>
                      </div>
                    )}
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.yogaCombinations}</h2>
                    <div className={styles.doshaYogaGrid}>
                      {fullResult.yogas.map(y => (
                        <div key={y.name} className={styles.doshaCard}>
                          <div className={styles.doshaCardHead}>
                            <span className={styles.doshaCardTitle}>{y.name}</span>
                            <span className={`${styles.statusBadge} ${y.present ? styles.statusBadgeClear : styles.statusBadgeActive}`}>
                              {y.present ? TL.formed : TL.notFormed}
                            </span>
                          </div>
                          <p className={styles.doshaCardText}>{y.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'advanced' && (
                <>
                  <p className={styles.chartNote} style={{ textAlign: 'left', marginBottom: 'var(--space-2)' }}>
                    {TL.advancedNote}
                  </p>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.shadbalaTitle}</h2>
                    <p className={styles.overviewText}>{TL.shadbalaDesc}</p>
                    <div className={styles.dataTable}>
                      <div className={`${styles.dataRow} ${styles.dataRowHead}`}>
                        <span>{TL.colPlanet}</span><span>{TL.colRupas}</span><span>{TL.colRequired}</span><span>{TL.colStatus}</span>
                      </div>
                      {fullResult.shadbala.planets.map(p => (
                        <div key={p.planet} className={styles.dataRow}>
                          <span className={styles.dataRowPlanet}><span className={styles.planetSymbol}><PlanetIcon id={p.planet} size={18} /></span>{pdfLanguage === 'hi' ? (HINDI_PLANET[p.planet] || PLANET_META[p.planet]?.name || p.planet) : (PLANET_META[p.planet]?.name || p.planet)}</span>
                          <span>{p.rupas.toFixed(2)}</span>
                          <span>{p.minRequiredRupas.toFixed(1)}</span>
                          <span className={`${styles.statusBadge} ${p.isStrong ? styles.statusBadgeClear : styles.statusBadgeActive}`}>{p.isStrong ? TL.strong : TL.weak}</span>
                        </div>
                      ))}
                    </div>
                    <p className={styles.chartNote}>{TL.shadbalaFootnote}</p>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.bhavbalaTitle}</h2>
                    <div className={styles.infoGrid}>
                      {fullResult.shadbala.houses.map(h => (
                        <div key={h.house} className={styles.infoCard}>
                          <div className={styles.infoLabel}>{TL.house(h.house)}</div>
                          <div className={styles.infoValue}>{h.total.toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.kpSubLordTitle}</h2>
                    <p className={styles.overviewText}>{TL.kpSubLordDesc}</p>
                    <div className={styles.dataTable}>
                      <div className={`${styles.dataRow} ${styles.dataRowHeadKp}`}>
                        <span>{TL.colPoint}</span><span>{TL.colSign}</span><span>{TL.colStarLord}</span><span>{TL.colSubLord}</span>
                      </div>
                      {fullResult.kp.table.map(row => (
                        <div key={row.id} className={`${styles.dataRow} ${styles.dataRowKp}`}>
                          <span className={styles.dataRowPlanet}>{row.id === 'asc' ? TL.ascendant : (pdfLanguage === 'hi' ? (HINDI_PLANET[row.id] || PLANET_META[row.id]?.name || row.id) : (PLANET_META[row.id]?.name || row.id))}</span>
                          <span>{hindiOr(pdfLanguage, HINDI_RASHI, row.rashi)} ({pdfLanguage === 'hi' ? (HINDI_PLANET[row.signLord] || cap(row.signLord)) : cap(row.signLord)})</span>
                          <span>{pdfLanguage === 'hi' ? (HINDI_PLANET[row.starLord] || cap(row.starLord)) : cap(row.starLord)}</span>
                          <span>{pdfLanguage === 'hi' ? (HINDI_PLANET[row.subLord] || cap(row.subLord)) : cap(row.subLord)}</span>
                        </div>
                      ))}
                    </div>

                    <h2 className={styles.overviewTitle} style={{ marginTop: 'var(--space-6)' }}>{TL.kpCuspsTitle}</h2>
                    <p className={styles.overviewText}>{TL.kpCuspsDesc}</p>
                    <div className={styles.dataTable}>
                      <div className={`${styles.dataRow} ${styles.dataRowHeadKp}`}>
                        <span>{TL.colCusp}</span><span>{TL.colSign}</span><span>{TL.colStarLord}</span><span>{TL.colSubLord}</span>
                      </div>
                      {fullResult.kp.cusps.map(row => (
                        <div key={row.id} className={`${styles.dataRow} ${styles.dataRowKp}`}>
                          <span className={styles.dataRowPlanet}>{TL.house(row.id.replace('cusp', ''))}</span>
                          <span>{hindiOr(pdfLanguage, HINDI_RASHI, row.rashi)} ({pdfLanguage === 'hi' ? (HINDI_PLANET[row.signLord] || cap(row.signLord)) : cap(row.signLord)})</span>
                          <span>{pdfLanguage === 'hi' ? (HINDI_PLANET[row.starLord] || cap(row.starLord)) : cap(row.starLord)}</span>
                          <span>{pdfLanguage === 'hi' ? (HINDI_PLANET[row.subLord] || cap(row.subLord)) : cap(row.subLord)}</span>
                        </div>
                      ))}
                    </div>
                    <div className={styles.infoGrid}>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>{TL.lagnaStarLord}</div><div className={styles.infoValue}>{pdfLanguage === 'hi' ? (HINDI_PLANET[fullResult.kp.rulingPlanets.lagnaStarLord] || cap(fullResult.kp.rulingPlanets.lagnaStarLord)) : cap(fullResult.kp.rulingPlanets.lagnaStarLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>{TL.lagnaSubLord}</div><div className={styles.infoValue}>{pdfLanguage === 'hi' ? (HINDI_PLANET[fullResult.kp.rulingPlanets.lagnaSubLord] || cap(fullResult.kp.rulingPlanets.lagnaSubLord)) : cap(fullResult.kp.rulingPlanets.lagnaSubLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>{TL.moonStarLord}</div><div className={styles.infoValue}>{pdfLanguage === 'hi' ? (HINDI_PLANET[fullResult.kp.rulingPlanets.moonStarLord] || cap(fullResult.kp.rulingPlanets.moonStarLord)) : cap(fullResult.kp.rulingPlanets.moonStarLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>{TL.moonSubLord}</div><div className={styles.infoValue}>{pdfLanguage === 'hi' ? (HINDI_PLANET[fullResult.kp.rulingPlanets.moonSubLord] || cap(fullResult.kp.rulingPlanets.moonSubLord)) : cap(fullResult.kp.rulingPlanets.moonSubLord)}</div></div>
                      <div className={styles.infoCard}><div className={styles.infoLabel}>{TL.dayLord}</div><div className={styles.infoValue}>{pdfLanguage === 'hi' ? (HINDI_PLANET[fullResult.kp.rulingPlanets.dayLord] || cap(fullResult.kp.rulingPlanets.dayLord)) : cap(fullResult.kp.rulingPlanets.dayLord)}</div></div>
                    </div>
                  </div>

                  <div className={styles.overview}>
                    <h2 className={styles.overviewTitle}>{TL.savTitle}</h2>
                    <p className={styles.overviewText}>{TL.savDesc}</p>
                    <div className={styles.infoGrid}>
                      {fullResult.ashtakavarga.sarva.map(s => (
                        <div key={s.rashi} className={styles.infoCard}>
                          <div className={styles.infoLabel}>{hindiOr(pdfLanguage, HINDI_RASHI, s.rashi)}</div>
                          <div className={styles.infoValue}>{TL.bindus(s.bindus)}</div>
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
                  <h2 className={styles.overviewTitle}>{TL.gemRemediesTitle}</h2>
                  <p className={styles.overviewText}>{TL.gemRemediesDesc}</p>
                  <div className={styles.gemGrid}>
                    {[fullResult.gemstones.life, fullResult.gemstones.lucky, fullResult.gemstones.fortune].map(g => (
                      <div key={g.purpose} className={styles.gemCard}>
                        <div className={styles.gemCardHead}>
                          <GemIcon rulingPlanet={g.rulingPlanet} />
                          <div>
                            <div className={styles.gemCardPurpose}>{pdfLanguage === 'hi' ? (GEM_PURPOSE_HI[g.purpose] || g.purpose) : g.purpose}</div>
                            <div className={styles.gemCardName}>{g.gemstone}{g.sanskritName !== g.gemstone ? ` (${g.sanskritName})` : ''}</div>
                          </div>
                        </div>
                        <p className={styles.doshaCardText}>{g.reason}</p>
                        <div className={styles.gemCardMeta}>
                          <span><strong>{TL.metal}</strong> {pdfLanguage === 'hi' ? (METAL_HI[g.metal] || g.metal) : g.metal}</span>
                          <span><strong>{TL.wearOn}</strong> {pdfLanguage === 'hi' ? (FINGER_HI[g.finger] || g.finger) : g.finger}</span>
                        </div>
                        <p className={styles.gemMantra}>{g.mantra}</p>
                      </div>
                    ))}
                    <div className={styles.gemCard}>
                      <div className={styles.gemCardHead}>
                        <RudrakshaIcon />
                        <div>
                          <div className={styles.gemCardPurpose}>{TL.rudraksha}</div>
                          <div className={styles.gemCardName}>{TL.mukhi(fullResult.rudraksha.mukhi, fullResult.rudraksha.deity)}</div>
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
                    <summary>{TL.precautions}</summary>
                    <ul className={styles.gemBenefitList}>
                      {fullResult.rudraksha.precautions.map((p, i) => <li key={i}>{p}</li>)}
                    </ul>
                  </details>

                  {/* Personalized Vastu — reuses the same significator-planet check as
                      the standalone Vastu Calculator (data/vastuKundli.ts), so a zone
                      flagged here matches what that tool would say for this same chart. */}
                  <h2 className={styles.overviewTitle} style={{ marginTop: 'var(--space-6)' }}>
                    <VastuIcon size={22} /> {TL.vastuTitle}
                  </h2>
                  <p className={styles.overviewText}>{TL.vastuDesc}</p>
                  {kundliResult && (
                    <div className={styles.gemGrid}>
                      {getVastuChartReading(kundliResult).map(({ zone, verdict, en, hi }) => (
                        <div key={zone.key} className={styles.gemCard}>
                          <div className={styles.gemCardHead}>
                            <VastuIcon size={22} />
                            <div>
                              <div className={styles.gemCardName}>{zone.label[pdfLanguage === 'hi' ? 'hi' : 'en']}</div>
                              <span style={{
                                display: 'inline-block', marginTop: 2, padding: '1px 8px', borderRadius: 999,
                                fontSize: '0.7rem', fontWeight: 700,
                                background: `${VASTU_CHART_VERDICT_META[verdict].color}22`, color: VASTU_CHART_VERDICT_META[verdict].color,
                              }}>
                                {VASTU_CHART_VERDICT_META[verdict][pdfLanguage === 'hi' ? 'hi' : 'en']}
                              </span>
                            </div>
                          </div>
                          <p className={styles.doshaCardText}>{pdfLanguage === 'hi' ? hi : en}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className={styles.chartNote}>{TL.remediesFootnote}</p>
                  {!hideAstrologerCta && (
                    <button className="btn btn-gold" style={{ marginTop: 'var(--space-4)' }} onClick={() => setPage('astrologers')}>
                      {TL.consultAstrologerRemedies}
                    </button>
                  )}
                </div>
              )}

              {/* Save birth details to account, so the next visit prefills automatically */}
              {!hideHistoryAndSave && isLoggedIn && submittedDetails && !alreadySavedThisProfile && (
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

      {/* Astrology assistant. Mounted outside the AnimatePresence so the
          form/result transition never unmounts an open conversation, and only
          once a chart actually exists — there is nothing to ask about before
          that. It re-keys per chart so generating a second kundli starts a
          fresh conversation instead of continuing the previous one. */}
      {fullResult && submittedDetails && (
        <KundliChatWidget
          chartKey={`${submittedDetails.date}T${submittedDetails.time}@${submittedDetails.latitude.toFixed(4)},${submittedDetails.longitude.toFixed(4)}`}
          displayName={submittedDetails.name}
          birth={{
            date: submittedDetails.date,
            time: submittedDetails.time,
            timezoneOffsetMinutes: submittedDetails.timezoneOffsetMinutes,
            latitude: submittedDetails.latitude,
            longitude: submittedDetails.longitude,
            name: submittedDetails.name,
            placeLabel: submittedDetails.placeName,
          }}
        />
      )}
    </section>
  );
}

// Icon-badge variant of the plain .infoCard grid cell — used where a small
// visual cue per field (calendar/star/sun icon etc.) helps scanning, like
// the Panchang grid. Plain .infoCard usages elsewhere (Avakhada,
// Ashtakavarga, Bhavbala) are untouched — this doesn't replace that class,
// just gives it an optional icon header.
function InfoCard({ icon: Icon, label, children }: { icon: React.ComponentType<{ size?: number }>; label: string; children: React.ReactNode }) {
  return (
    <div className={styles.infoCard}>
      <div className={styles.infoCardIconRow}>
        <span className={styles.infoCardIconBadge}><Icon size={15} /></span>
        <span className={styles.infoLabel} style={{ marginBottom: 0 }}>{label}</span>
      </div>
      <div className={styles.infoValue}>{children}</div>
    </div>
  );
}

function HighlightChip({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number }>; label: string; value: string }) {
  return (
    <div className={styles.highlightChip}>
      <span className={styles.infoCardIconBadge}><Icon size={14} /></span>
      <div>
        <div className={styles.highlightChipLabel}>{label}</div>
        <div className={styles.highlightChipValue}>{value}</div>
      </div>
    </div>
  );
}

// ---- Chart + planet-list panel, reused for every chart in the Charts tab
// (D1, Chandra, D9, and every D2-D60 varga chart) — each instance owns its
// own tooltip state and North/South style toggle, so multiple charts can
// sit on the same tab without interfering with each other. ----
function ChartDisplay({ title, subtitle, planets, ascendantRashi, footer, allowPlacementsToggle = true, language }: { title: string; subtitle?: string; planets: ChartPlanet[]; ascendantRashi: string; footer?: React.ReactNode; allowPlacementsToggle?: boolean; language: 'en' | 'hi' }) {
  // `language` here is the Kundli page's OWN toggle (passed down by the
  // caller as `pdfLanguage`), not the site-wide one — this component is
  // Kundli-only, so it never touches useAppContext()'s language directly.
  const tr = (key: string) => TRANSLATIONS[language]?.[key] || TRANSLATIONS.en?.[key] || key;
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [houseTooltip, setHouseTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
  const [style, setStyle] = useState<'north' | 'south'>('north');
  const [showPlacements, setShowPlacements] = useState(false);

  const handlePlanetHover = (planet: ChartPlanet, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const containerRect = (e.currentTarget.closest(`.${styles.svgWrap}`) as HTMLElement)?.getBoundingClientRect();
    if (!containerRect) return;
    const houseLine = planet.bhavHouse !== undefined
      ? `${planet.name} · ${planet.sign} · ${ordinal(planet.house)} House (Rashi) / Bhav ${planet.bhavHouse} (Chalit)`
      : `${planet.name} · ${planet.sign} · ${ordinal(planet.house)} House`;
    const lines = [houseLine, planet.degree, planet.retrograde ? 'Retrograde (℞)' : null, planet.quality].filter(Boolean);
    setTooltip({ text: lines.join('\n'), x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top - 10 });
  };

  return (
    <div className={`${styles.chartLayout} ${!showPlacements ? styles.chartLayoutSingle : ''}`}>
      <div>
        <div className={styles.chartStyleToggle}>
          <button className={`${styles.chartStyleBtn} ${style === 'north' ? styles.chartStyleBtnActive : ''}`} onClick={() => setStyle('north')}>{language === 'hi' ? 'उत्तर भारतीय' : 'North Indian'}</button>
          <button className={`${styles.chartStyleBtn} ${style === 'south' ? styles.chartStyleBtnActive : ''}`} onClick={() => setStyle('south')}>{language === 'hi' ? 'दक्षिण भारतीय' : 'South Indian'}</button>
        </div>
        <div className={styles.svgWrap}>
          {style === 'north' ? (
            <NorthIndianChart
              planets={planets}
              ascendantRashi={ascendantRashi}
              onPlanetHover={handlePlanetHover}
              onPlanetLeave={() => setTooltip(null)}
              onHouseHover={(house, e) => {
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                const containerRect = (e.currentTarget.closest(`.${styles.svgWrap}`) as HTMLElement)?.getBoundingClientRect();
                if (!containerRect) return;
                setHouseTooltip({ text: HOUSE_MEANINGS[house] || '', x: rect.left - containerRect.left + rect.width / 2, y: rect.top - containerRect.top });
              }}
              onHouseLeave={() => setHouseTooltip(null)}
              language={language === 'hi' ? 'hi' : 'en'}
            />
          ) : (
            <SouthIndianChart planets={planets} ascendantRashi={ascendantRashi} onPlanetHover={handlePlanetHover} onPlanetLeave={() => setTooltip(null)} language={language === 'hi' ? 'hi' : 'en'} />
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

        {footer && <div className={styles.chartHighlights}>{footer}</div>}

        {/* Only offered once the chart is zoomed full-screen — in the small
            featured/overview view it just added a button that didn't fit
            the space. */}
        {allowPlacementsToggle && !showPlacements && (
          <button
            type="button"
            className={styles.placementsToggle}
            onClick={e => { e.stopPropagation(); setShowPlacements(true); }}
          >
            {tr('kundli_show_placements')}
          </button>
        )}
      </div>

      {allowPlacementsToggle && showPlacements && (
        <div className={styles.planetList}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-2)' }}>
            <h3 className={styles.planetListTitle} style={{ marginBottom: 0 }}>{title}</h3>
            <button
              type="button"
              className={styles.placementsToggle}
              style={{ marginTop: 0 }}
              onClick={e => { e.stopPropagation(); setShowPlacements(false); }}
            >
              {tr('kundli_hide')}
            </button>
          </div>
          {subtitle && <p className={styles.chartNote} style={{ textAlign: 'left', marginBottom: 'var(--space-3)' }}>{subtitle}</p>}
          <div className={styles.planetGrid}>
            {planets.map(p => (
              <div key={p.id} className={styles.planetCard}>
                <span className={styles.planetSymbolBadge}><PlanetIcon id={p.id} size={20} /></span>
                <div className={styles.planetCardText}>
                  <div className={styles.planetCardName}>{language === 'hi' ? (HINDI_PLANET[p.id] || p.name) : p.name}</div>
                  <div className={styles.planetCardMeta}>{hindiOr(language, HINDI_RASHI, p.sign)}{p.retrograde ? ' ℞' : ''} · House {p.house}{p.bhavHouse !== undefined ? ` · Bhav ${p.bhavHouse}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div className={styles.chartNote}>Hover over planets and houses to explore their meanings. ℞ marks a retrograde planet. "House" is the whole-sign house (matches the chart's wedge/corner number); "Bhav" is the real cuspal house computed from your exact birth time via Placidus Bhav Chalit — the two are different classification systems and are expected to disagree for most planets.</div>
        </div>
      )}
    </div>
  );
}

// Real product photo of the actual gemstone (background removed), one per
// classical graha — /images/gems/<planet>.png. `rulingPlanet` is always one
// of the 7 classical grahas (backend's GEMSTONE_BY_PLANET only ever returns
// one of those), so there's always a matching photo.
function GemIcon({ rulingPlanet }: { rulingPlanet: string }) {
  return (
    <img src={`/images/gems/${rulingPlanet}.png`} alt="" width={40} height={40} style={{ objectFit: 'contain' }} />
  );
}

// Real Rudraksha bead photo (background removed) — one generic photo used
// regardless of mukhi count, since that's the only Rudraksha product photo
// available.
function RudrakshaIcon() {
  return (
    <img src="/images/gems/rudraksha.png" alt="" width={40} height={40} style={{ objectFit: 'contain' }} />
  );
}

