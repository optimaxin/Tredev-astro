// Best-effort Latin -> Devanagari transliteration for personal names, used
// when the Kundli report's language toggle is set to Hindi (see
// KundliSection.tsx / KundliPrintLayout.tsx) so the visitor's own name
// appears in Devanagari too, not just the surrounding labels.
//
// Genuinely approximate: a name's *correct* Hindi spelling isn't fully
// recoverable from its English spelling alone (e.g. the surname "Sharma" is
// pronounced with a long trailing "aa" — शर्मा — where a same-shaped generic
// word would end in a silent schwa — शर्म). NAME_DICTIONARY below covers
// common Indian first names and surnames with their real spelling; anything
// not found falls back to the phonetic heuristic further down, which is
// close but not guaranteed exact for less common names.
const NAME_DICTIONARY: Record<string, string> = {
  // Common surnames (several of these are exactly the "looks generic,
  // pronounced differently" case the heuristic alone gets wrong).
  sharma: 'शर्मा', verma: 'वर्मा', gupta: 'गुप्ता', mehta: 'मेहता', shah: 'शाह',
  patel: 'पटेल', singh: 'सिंह', kumar: 'कुमार', yadav: 'यादव', chauhan: 'चौहान',
  rathore: 'राठौड़', mishra: 'मिश्रा', tiwari: 'तिवारी', dwivedi: 'द्विवेदी',
  pandey: 'पांडेय', trivedi: 'त्रिवेदी', agarwal: 'अग्रवाल', bansal: 'बंसल',
  jain: 'जैन', khanna: 'खन्ना', malhotra: 'मल्होत्रा', kapoor: 'कपूर',
  chopra: 'चोपड़ा', arora: 'अरोड़ा', sinha: 'सिन्हा', bose: 'बोस',
  banerjee: 'बनर्जी', chatterjee: 'चटर्जी', mukherjee: 'मुखर्जी', iyer: 'अय्यर',
  nair: 'नायर', menon: 'मेनन', reddy: 'रेड्डी', naidu: 'नायडू', rao: 'राव',
  gowda: 'गौड़ा', desai: 'देसाई', joshi: 'जोशी', bhatt: 'भट्ट', thakur: 'ठाकुर',
  chandra: 'चंद्र', prasad: 'प्रसाद', saxena: 'सक्सेना', srivastava: 'श्रीवास्तव',
  pillai: 'पिल्लई', shetty: 'शेट्टी', goyal: 'गोयल', mittal: 'मित्तल',

  // Common first names (male).
  arjun: 'अर्जुन', rahul: 'राहुल', rohit: 'रोहित', amit: 'अमित', sumit: 'सुमित',
  rajesh: 'राजेश', suresh: 'सुरेश', ramesh: 'रमेश', mahesh: 'महेश', dinesh: 'दिनेश',
  vikas: 'विकास', vikram: 'विक्रम', ravi: 'रवि', ravindra: 'रवीन्द्र', sanjay: 'संजय',
  ajay: 'अजय', vijay: 'विजय', anil: 'अनिल', sunil: 'सुनील', rajiv: 'राजीव',
  rajeev: 'राजीव', deepak: 'दीपक', ashok: 'अशोक', naveen: 'नवीन', praveen: 'प्रवीण',
  manoj: 'मनोज', sanjeev: 'संजीव', arun: 'अरुण', varun: 'वरुण', tarun: 'तरुण',
  karan: 'करण', aryan: 'आर्यन', raj: 'राज', rohan: 'रोहन', rishabh: 'ऋषभ',
  kunal: 'कुणाल', nikhil: 'निखिल', nitin: 'नितिन', gaurav: 'गौरव', saurabh: 'सौरभ',
  abhishek: 'अभिषेक', aditya: 'आदित्य', kartik: 'कार्तिक', krishna: 'कृष्ण',
  mohan: 'मोहन', gopal: 'गोपाल', vishal: 'विशाल', ankit: 'अंकित', ashish: 'आशीष',
  manish: 'मनीष', harish: 'हरीश', girish: 'गिरीश', mukesh: 'मुकेश', yogesh: 'योगेश',
  lokesh: 'लोकेश', rakesh: 'राकेश', naresh: 'नरेश', umesh: 'उमेश', jitendra: 'जितेन्द्र',
  devendra: 'देवेन्द्र', narendra: 'नरेन्द्र', surendra: 'सुरेन्द्र', mahendra: 'महेन्द्र',
  virendra: 'विरेन्द्र', yash: 'यश', ayush: 'आयुष', shivam: 'शिवम', shubham: 'शुभम',
  anmol: 'अनमोल', harsh: 'हर्ष', piyush: 'पीयूष', parth: 'पार्थ', dhruv: 'ध्रुव',
  ishaan: 'ईशान', aarav: 'आरव', vivaan: 'विवान', reyansh: 'रेयांश', atharv: 'अथर्व',
  sai: 'साई', advait: 'अद्वैत', arnav: 'अर्णव', kabir: 'कबीर', vivek: 'विवेक',

  // Common first names (female).
  priya: 'प्रिया', pooja: 'पूजा', puja: 'पूजा', neha: 'नेहा', sneha: 'स्नेहा',
  anjali: 'अंजलि', kavita: 'कविता', sunita: 'सुनीता', anita: 'अनीता', rekha: 'रेखा',
  meena: 'मीना', geeta: 'गीता', sita: 'सीता', radha: 'राधा', seema: 'सीमा',
  reema: 'रीमा', rina: 'रीना', shweta: 'श्वेता', swati: 'स्वाति', divya: 'दिव्या',
  kirti: 'कीर्ति', kriti: 'कृति', ritu: 'ऋतु', ritika: 'रितिका', nisha: 'निशा',
  usha: 'उषा', asha: 'आशा', deepika: 'दीपिका', shalini: 'शालिनी', shilpa: 'शिल्पा',
  kavya: 'काव्या', aditi: 'अदिति', ananya: 'अनन्या', ishita: 'इशिता', isha: 'ईशा',
  riya: 'रिया', tanya: 'तान्या', tanvi: 'तन्वी', sanya: 'सान्या', simran: 'सिमरन',
  komal: 'कोमल', nidhi: 'निधि', bhavna: 'भावना', suman: 'सुमन', rani: 'रानी',
  lata: 'लता', mamta: 'ममता', mamata: 'ममता', sarika: 'सारिका', monika: 'मोनिका',
  kajal: 'काजल', poonam: 'पूनम', manisha: 'मनीषा', archana: 'अर्चना', alka: 'अल्का',
  rachna: 'रचना', vandana: 'वंदना', kalpana: 'कल्पना', sushma: 'सुषमा',
  pratibha: 'प्रतिभा', madhuri: 'माधुरी', jyoti: 'ज्योति', sonal: 'सोनल',
  payal: 'पायल', neelam: 'नीलम', preeti: 'प्रीति', priyanka: 'प्रियंका', vidya: 'विद्या',
};

// Longest-match-first, since e.g. "chh" must win over "ch", "sh" over "s".
// 'n' is deliberately NOT here as a plain single-letter entry — see the
// anusvara handling in transliterateWord, which decides between न and ं.
const CONSONANTS: [string, string][] = [
  ['ksh', 'क्ष'], ['gya', 'ज्ञ'], ['jna', 'ज्ञ'], ['shr', 'श्र'], ['chh', 'छ'],
  ['kh', 'ख'], ['gh', 'घ'], ['ch', 'च'], ['jh', 'झ'],
  ['th', 'थ'], ['dh', 'ध'], ['ph', 'फ'], ['bh', 'भ'], ['sh', 'श'], ['tr', 'त्र'],
  ['k', 'क'], ['g', 'ग'], ['j', 'ज'], ['t', 'त'], ['d', 'द'],
  ['p', 'प'], ['b', 'ब'], ['m', 'म'], ['y', 'य'], ['r', 'र'], ['l', 'ल'],
  ['v', 'व'], ['w', 'व'], ['s', 'स'], ['h', 'ह'], ['f', 'फ'], ['z', 'ज़'], ['x', 'क्स'],
];

const VOWEL_MATRA: [string, string][] = [
  ['aa', 'ा'], ['ai', 'ै'], ['au', 'ौ'], ['ee', 'ी'], ['ii', 'ी'], ['oo', 'ू'], ['ri', 'ृ'],
  ['a', ''], ['i', 'ि'], ['u', 'ु'], ['e', 'े'], ['o', 'ो'],
];

const VOWEL_INDEPENDENT: [string, string][] = [
  ['aa', 'आ'], ['ai', 'ऐ'], ['au', 'औ'], ['ee', 'ई'], ['ii', 'ई'], ['oo', 'ऊ'], ['ri', 'ऋ'],
  ['a', 'अ'], ['i', 'इ'], ['u', 'उ'], ['e', 'ए'], ['o', 'ओ'],
];

function matchLongest(s: string, pos: number, table: [string, string][]): [string, string] | null {
  for (const entry of table) {
    if (s.startsWith(entry[0], pos)) return entry;
  }
  return null;
}

function transliterateWord(word: string): string {
  const s = word.toLowerCase();
  let i = 0;
  let out = '';
  while (i < s.length) {
    // "Singh" is common enough to special-case outright — its English
    // spelling encodes a nasalized vowel + ह, not an actual ग/घ sound
    // (सिंह, not सिंग्ह/सिनघ).
    if (s.startsWith('ngh', i)) {
      out += 'ं' + 'ह';
      i += 3;
      continue;
    }
    // A bare 'n' immediately before another consonant is conventionally
    // written as anusvara (ं) rather than a separate न् + consonant
    // conjunct — "Ankita" -> अंकिता, "Sangeeta" -> संगीता, not
    // अन्किता/सन्गीता. A trailing 'n' at the true end of the word (no
    // consonant after it) falls through to the normal consonant handling
    // below instead, which is correct as-is ("Arjun" -> ...न, real न).
    if (s[i] === 'n' && matchLongest(s, i + 1, CONSONANTS)) {
      out += 'ं';
      i += 1;
      continue;
    }
    const cons = matchLongest(s, i, CONSONANTS) || (s[i] === 'n' ? (['n', 'न'] as [string, string]) : null);
    if (cons) {
      i += cons[0].length;
      const vowel = matchLongest(s, i, VOWEL_MATRA);
      const atWordEnd = vowel ? i + vowel[0].length === s.length : false;
      if (vowel) {
        // A bare, short trailing vowel almost always represents a genuine
        // long vowel sound for a personal name (Sharma -> शर्मा not शर्म,
        // Joshi -> जोशी not जोशि) — English name spelling doesn't
        // distinguish the two, but the long form is right far more often.
        const dev = atWordEnd && vowel[0] === 'a' ? 'ा' : atWordEnd && vowel[0] === 'i' ? 'ी' : vowel[1];
        out += cons[1] + dev;
        i += vowel[0].length;
      } else {
        // No vowel right after — if another consonant follows, join with a
        // halant to form a conjunct; at the true end of the word, the bare
        // consonant's own inherent "a" is already the right reading (Hindi
        // spelling doesn't mark that the schwa is dropped in speech).
        out += cons[1] + (matchLongest(s, i, CONSONANTS) ? '्' : '');
      }
      continue;
    }
    const vowel = matchLongest(s, i, VOWEL_INDEPENDENT);
    if (vowel) {
      out += vowel[1];
      i += vowel[0].length;
      continue;
    }
    // Unmapped character (digit, punctuation, apostrophe...) — keep as-is
    // rather than dropping it silently.
    out += s[i];
    i += 1;
  }
  return out;
}

// Splits on whitespace/hyphen so "Arjun Sharma" and "Arjun-Kumar" both
// transliterate word-by-word (dictionary checked per word, not per full
// string, so "Arjun Sharma" hits both dictionary entries individually).
export function transliterateNameToHindi(name: string): string {
  return name
    .split(/(\s+|-)/)
    .map(part => {
      const key = part.toLowerCase().trim();
      if (!key || /^\s+$/.test(part) || part === '-') return part;
      return NAME_DICTIONARY[key] || transliterateWord(part);
    })
    .join('');
}
