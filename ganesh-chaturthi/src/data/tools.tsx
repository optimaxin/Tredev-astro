import type { ReactElement } from 'react';
import {
  HoroscopePage, ChoghadiyaPage, MuhuratFinderPage, AbhijitMuhuratPage, KundliMatchingPage,
  NakshatraFinderPage, SadeSatiPage, LuckyPage, BabyNamePage, LalKitabPage,
  KaalSarpDoshaPage, RahuKetuTransitPage, MoonSignPage, NumerologyPage,
  LifePathNumberPage, NameNumerologyPage,
  NumerologyMatchPage, FlamesPage, ChineseZodiacPage, NumerologyHoroscopePage,
  // The real, main-site calculator page components (frontend/src/pages/calculators
  // /CalculatorPages.tsx) — imported directly, not reimplemented, so this app's
  // UI is exactly the same as the main site's, not a lookalike.
} from '../../../frontend/src/pages/calculators/CalculatorPages';
import KundliSection from '../../../frontend/src/sections/KundliSection/KundliSection';
import PanchangSection from '../../../frontend/src/sections/Panchang/Panchang';
import { API_URL } from '../../../frontend/src/services/apiUrl';

export interface ToolConfig {
  id: string;
  label: string;
  category: string;
  render: () => ReactElement;
}

// Tool ids match the main site's own TOOL_ROUTES targets exactly
// (frontend/src/sections/FreeTools/FreeTools.tsx) — this app reuses the
// real FreeTools component for the tool grid (see App.tsx), which navigates
// by calling setPage(route) on the shared AppContext; a page->hash bridge
// effect in App.tsx is what turns that into this app's own hash routing.
// If an id here doesn't match FreeTools' route for a given card, clicking
// that card on this page silently does nothing.
export const TOOLS: ToolConfig[] = [
  // Daily Astrology — HoroscopePage itself has the Daily/Weekly/Monthly/etc
  // period switcher built in, exactly like the main site.
  { id: 'horoscope', label: 'Daily / Weekly / Monthly Horoscope', category: 'daily', render: () => <HoroscopePage /> },
  { id: 'panchang', label: "Today's Panchang", category: 'daily', render: () => <PanchangSection /> },
  { id: 'choghadiya', label: 'Choghadiya', category: 'daily', render: () => <ChoghadiyaPage /> },
  { id: 'muhurat-finder', label: 'Muhurat Finder', category: 'daily', render: () => <MuhuratFinderPage /> },
  { id: 'abhijit-muhurat', label: 'Abhijit Muhurat', category: 'daily', render: () => <AbhijitMuhuratPage /> },

  // Birth
  // skipPdfLoginGate: this microsite has no account/lead-capture flow of its
  // own — the birth details it needs are already collected by the form
  // above, so re-demanding login just to download would be pure friction.
  // pdfBannerImageSrc: same hero banner as this site's own homepage, used on
  // the report's cover and closing pages instead of the plain logo.
  // serverPdfUrl: server-rendered PDF (backend/app/api/kundliPdf.routes.ts)
  // instead of the client-side html2canvas capture — seconds instead of
  // minutes, which matters here since this page exists to convert visitors
  // fast, not to keep them waiting.
  // hideAstrologerCta: "Consult an Astrologer" routes to a real main-site
  // page this microsite doesn't have, so it's a dead button here.
  { id: 'free-kundli', label: 'Free Kundli', category: 'birth', render: () => <KundliSection skipPdfLoginGate pdfBannerImageSrc="/images/hero-banner.jpg" serverPdfUrl={`${API_URL}/api/kundli-pdf`} hideAstrologerCta hideHistoryAndSave /> },
  { id: 'moon-sign', label: 'Moon Sign Calculator', category: 'birth', render: () => <MoonSignPage currentUser={null} /> },
  { id: 'nakshatra-finder', label: 'Nakshatra Finder', category: 'birth', render: () => <NakshatraFinderPage currentUser={null} /> },
  { id: 'lucky', label: 'Lucky Color & Date', category: 'birth', render: () => <LuckyPage currentUser={null} /> },
  { id: 'baby-name', label: 'Baby Name Calculator', category: 'birth', render: () => <BabyNamePage currentUser={null} /> },
  { id: 'lal-kitab', label: 'Lal Kitab', category: 'birth', render: () => <LalKitabPage currentUser={null} /> },

  // Compatibility
  { id: 'kundli-matching', label: 'Kundli Matching', category: 'compatibility', render: () => <KundliMatchingPage /> },
  { id: 'flames', label: 'FLAMES', category: 'compatibility', render: () => <FlamesPage /> },

  // Doshas
  { id: 'kaal-sarp-dosha', label: 'Kaal Sarp Dosha', category: 'doshas', render: () => <KaalSarpDoshaPage currentUser={null} /> },
  { id: 'sade-sati', label: 'Sade Sati', category: 'doshas', render: () => <SadeSatiPage currentUser={null} /> },
  { id: 'rahu-ketu-transit', label: 'Rahu Ketu Transit', category: 'doshas', render: () => <RahuKetuTransitPage currentUser={null} /> },

  // Numerology
  { id: 'numerology', label: 'My Numerology', category: 'numerology', render: () => <NumerologyPage currentUser={null} /> },
  { id: 'life-path-number', label: 'Life Path Number', category: 'numerology', render: () => <LifePathNumberPage currentUser={null} /> },
  { id: 'name-numerology', label: 'Name Numerology', category: 'numerology', render: () => <NameNumerologyPage currentUser={null} /> },
  { id: 'numerology-match', label: 'Numerology Match', category: 'numerology', render: () => <NumerologyMatchPage /> },
  { id: 'numerology-horoscope', label: 'Numerology Horoscope', category: 'numerology', render: () => <NumerologyHoroscopePage currentUser={null} /> },
  { id: 'chinese-zodiac', label: 'Chinese Zodiac', category: 'numerology', render: () => <ChineseZodiacPage /> },
];
