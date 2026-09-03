// Devanagari names for the fixed classical terms the Panchang API returns in
// English (weekday, rashi, nakshatra, tithi, yoga, karana) — standard
// transliterations used identically across virtually every Hindi Panchang,
// not site-specific i18n copy, so kept separate from the general `t()`
// translation system.

export const HINDI_WEEKDAY: Record<string, string> = {
  Sunday: 'रविवार', Monday: 'सोमवार', Tuesday: 'मंगलवार', Wednesday: 'बुधवार',
  Thursday: 'गुरुवार', Friday: 'शुक्रवार', Saturday: 'शनिवार',
};

export const HINDI_RASHI: Record<string, string> = {
  Aries: 'मेष', Taurus: 'वृषभ', Gemini: 'मिथुन', Cancer: 'कर्क', Leo: 'सिंह', Virgo: 'कन्या',
  Libra: 'तुला', Scorpio: 'वृश्चिक', Sagittarius: 'धनु', Capricorn: 'मकर', Aquarius: 'कुम्भ', Pisces: 'मीन',
};

export const HINDI_NAKSHATRA: Record<string, string> = {
  Ashwini: 'अश्विनी', Bharani: 'भरणी', Krittika: 'कृत्तिका', Rohini: 'रोहिणी', Mrigashira: 'मृगशिरा',
  Ardra: 'आर्द्रा', Punarvasu: 'पुनर्वसु', Pushya: 'पुष्य', Ashlesha: 'आश्लेषा', Magha: 'मघा',
  'Purva Phalguni': 'पूर्वाफाल्गुनी', 'Uttara Phalguni': 'उत्तराफाल्गुनी', Hasta: 'हस्त', Chitra: 'चित्रा',
  Swati: 'स्वाति', Vishakha: 'विशाखा', Anuradha: 'अनुराधा', Jyeshtha: 'ज्येष्ठा', Mula: 'मूल',
  'Purva Ashadha': 'पूर्वाषाढ़ा', 'Uttara Ashadha': 'उत्तराषाढ़ा', Shravana: 'श्रवण', Dhanishta: 'धनिष्ठा',
  Shatabhisha: 'शतभिषा', 'Purva Bhadrapada': 'पूर्वाभाद्रपद', 'Uttara Bhadrapada': 'उत्तराभाद्रपद', Revati: 'रेवती',
};

export const HINDI_TITHI: Record<string, string> = {
  Pratipada: 'प्रतिपदा', Dwitiya: 'द्वितीया', Tritiya: 'तृतीया', Chaturthi: 'चतुर्थी', Panchami: 'पंचमी',
  Shashthi: 'षष्ठी', Saptami: 'सप्तमी', Ashtami: 'अष्टमी', Navami: 'नवमी', Dashami: 'दशमी',
  Ekadashi: 'एकादशी', Dwadashi: 'द्वादशी', Trayodashi: 'त्रयोदशी', Chaturdashi: 'चतुर्दशी',
  Purnima: 'पूर्णिमा', Amavasya: 'अमावस्या',
};

export const HINDI_YOGA: Record<string, string> = {
  Vishkambha: 'विष्कम्भ', Priti: 'प्रीति', Ayushman: 'आयुष्मान', Saubhagya: 'सौभाग्य', Shobhana: 'शोभन',
  Atiganda: 'अतिगण्ड', Sukarma: 'सुकर्मा', Dhriti: 'धृति', Shoola: 'शूल', Ganda: 'गण्ड',
  Vriddhi: 'वृद्धि', Dhruva: 'ध्रुव', Vyaghata: 'व्याघात', Harshana: 'हर्षण', Vajra: 'वज्र',
  Siddhi: 'सिद्धि', Vyatipata: 'व्यतीपात', Variyana: 'वरीयान', Parigha: 'परिघ', Shiva: 'शिव',
  Siddha: 'सिद्ध', Sadhya: 'साध्य', Shubha: 'शुभ', Shukla: 'शुक्ल', Brahma: 'ब्रह्म',
  Indra: 'इन्द्र', Vaidhriti: 'वैधृति',
};

export const HINDI_KARANA: Record<string, string> = {
  Bava: 'बव', Balava: 'बालव', Kaulava: 'कौलव', Taitila: 'तैतिल', Gara: 'गर', Vanija: 'वणिज',
  Vishti: 'विष्टि (भद्रा)', Kimstughna: 'किंस्तुघ्न', Shakuni: 'शकुनि', Chatushpada: 'चतुष्पद', Naga: 'नाग',
};

// Planet id -> Hindi name — the classical Navagraha names, standard across
// virtually every Hindi Kundli/Panchang (not site-specific i18n copy,
// same reasoning as the tables above). Keyed by this app's internal planet
// id (lowercase, e.g. "mars"), not the English display name, so callers can
// look it up directly off a ChartPlanet/PlanetId without an extra mapping.
export const HINDI_PLANET: Record<string, string> = {
  sun: 'सूर्य', moon: 'चंद्र', mercury: 'बुध', venus: 'शुक्र', mars: 'मंगल',
  jupiter: 'गुरु', saturn: 'शनि', uranus: 'यूरेनस', neptune: 'नेपच्यून', pluto: 'प्लूटो',
  rahu: 'राहु', ketu: 'केतु', asc: 'लग्न',
};

// Small helper for "show the Hindi name when the site is in Hindi,
// otherwise the English one" — the same fallback-to-English-if-untranslated
// pattern already used by AppContext's own t()/tOr(), applied to these
// classical-term tables instead of site copy.
export function hindiOr(language: string, table: Record<string, string>, english: string): string {
  return language === 'hi' ? (table[english] || english) : english;
}

export function hindiTime24(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(new Date(iso).getTime() + 5.5 * 3_600_000); // IST offset
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
}
