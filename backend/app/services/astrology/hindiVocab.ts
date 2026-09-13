// Shared Hindi vocabulary for the bilingual Kundli PDF (see the `language`
// param threaded through ascendantPredictions.ts, dashaPredictions.ts,
// kundliAnalysis.ts, avakhada.ts, yogas.ts, and calculators.routes.ts's
// /kundli-full handler). Kept backend-side and separate from
// frontend/src/utils/panchangHindi.ts on purpose — that file covers the
// same classical vocabulary but the backend can't import across workspace
// boundaries into a separately-deployed frontend package.
import type { PlanetId } from './ephemeris.ts';

export const HINDI_PLANET: Record<PlanetId, string> = {
  sun: 'सूर्य', moon: 'चन्द्र', mars: 'मंगल', mercury: 'बुध', jupiter: 'गुरु',
  venus: 'शुक्र', saturn: 'शनि', uranus: 'यूरेनस', neptune: 'नेप्च्यून',
  pluto: 'प्लूटो', rahu: 'राहु', ketu: 'केतु',
};

export const HINDI_RASHI: Record<string, string> = {
  Aries: 'मेष', Taurus: 'वृषभ', Gemini: 'मिथुन', Cancer: 'कर्क', Leo: 'सिंह', Virgo: 'कन्या',
  Libra: 'तुला', Scorpio: 'वृश्चिक', Sagittarius: 'धनु', Capricorn: 'मकर', Aquarius: 'कुंभ', Pisces: 'मीन',
};

export const HINDI_NAKSHATRA: Record<string, string> = {
  Ashwini: 'अश्विनी', Bharani: 'भरणी', Krittika: 'कृत्तिका', Rohini: 'रोहिणी', Mrigashira: 'मृगशिरा', Ardra: 'आर्द्रा',
  Punarvasu: 'पुनर्वसु', Pushya: 'पुष्य', Ashlesha: 'आश्लेषा', Magha: 'मघा', 'Purva Phalguni': 'पूर्व फाल्गुनी', 'Uttara Phalguni': 'उत्तर फाल्गुनी',
  Hasta: 'हस्त', Chitra: 'चित्रा', Swati: 'स्वाति', Vishakha: 'विशाखा', Anuradha: 'अनुराधा', Jyeshtha: 'ज्येष्ठा',
  Mula: 'मूल', 'Purva Ashadha': 'पूर्वाषाढ़ा', 'Uttara Ashadha': 'उत्तराषाढ़ा', Shravana: 'श्रवण', Dhanishta: 'धनिष्ठा', Shatabhisha: 'शतभिषा',
  'Purva Bhadrapada': 'पूर्व भाद्रपद', 'Uttara Bhadrapada': 'उत्तर भाद्रपद', Revati: 'रेवती',
};

// House numbers only ever run 1-12 here (whole-sign houses) — a plain
// lookup is simpler and clearer than a Hindi ordinal-formatting function.
export const HINDI_HOUSE_ORDINAL: Record<number, string> = {
  1: 'पहले', 2: 'दूसरे', 3: 'तीसरे', 4: 'चौथे', 5: 'पांचवें', 6: 'छठे',
  7: 'सातवें', 8: 'आठवें', 9: 'नौवें', 10: 'दसवें', 11: 'ग्यारहवें', 12: 'बारहवें',
};

export function hindiCap(id: string): string {
  return HINDI_PLANET[id as PlanetId] ?? id;
}
