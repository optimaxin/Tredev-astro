import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export interface BirthProfile {
  name: string;
  dob: string;
  tob: string;
  place: string;
  sun: string;
  moon: string;
  ascendant: string;
  nakshatra: string;
}

export type Concern =
  | 'Love & Relationships'
  | 'Marriage'
  | 'Career & Business'
  | 'Money & Finance'
  | 'Family'
  | 'Personal Growth'
  | 'Spirituality'
  | 'Vastu'
  | null;

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category?: string;
  image?: string;
}

interface AppContextValue {
  birthProfile: BirthProfile;
  setBirthProfile: (p: BirthProfile) => void;
  concern: Concern;
  setConcern: (c: Concern) => void;
  kundliGenerated: boolean;
  setKundliGenerated: (v: boolean) => void;
  astrologerFilter: string;
  setAstrologerFilter: (f: string) => void;
  // Routing & selections
  page: string;
  setPage: (p: string) => void;
  selectedId: number | string | null;
  setSelectedId: (id: number | string | null) => void;
  // Cart state
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  // Theme state
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  // Auth state (mock prototype)
  isLoggedIn: boolean;
  setLoggedIn: (v: boolean) => void;
  pendingAction: string | null;
  setPendingAction: (a: string | null) => void;
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  // Language selector state
  language: 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te';
  setLanguage: (l: 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te') => void;
  t: (key: string) => string;
}

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    // Navigation
    nav_astrology: 'Astrology',
    nav_kundli: 'Kundli',
    nav_calculators: 'Calculators',
    nav_reports: 'Reports',
    nav_panchang: 'Panchang',
    nav_academy: 'Academy',
    nav_store: 'Store',
    nav_free_kundli: 'Free Kundli',
    nav_consult: 'Consult',
    nav_login: 'LOGIN',
    
    // Core headings
    section_reports_title: 'Go Deeper with Jyotish',
    section_reports_desc: 'Detailed, manuscript-grade Kundli readings translating cosmic alignment into direct life direction.',
    section_tools_title: 'Free Astrology Tools',
    section_tools_desc: 'Trusted Vedic astrology tools — free, accurate, and always available.',
    section_panchang_title: "Today's Panchang",
    section_panchang_desc: 'Vedic daily almanac for auspicious timings, planetary transits, and daily energy grid.',
    section_astrologers_title: 'Consult an Acharya',
    section_astrologers_desc: 'Seek guidance from verified Jyotish masters rooted in authentic Vedic lineages.',
    section_store_title: 'TredevStore',
    section_store_desc: 'Authentic, energized gemstones, yantras and spiritual tools, carefully curated.',
    section_academy_title: 'TredevAstro Gurukul',
    section_academy_desc: 'Structured, in-depth courses in Vedic astrology and Jyotish, guided by lineage Acharyas.',
    section_ai_title: 'Ask TredevAstro',
    section_ai_desc: 'Have a question about your chart? Get insights grounded in classical Vedic astrology.',
    
    // CTA & button actions
    cta_explore: 'Explore All',
    cta_consult: 'Consult an Acharya',
    cta_generate: 'Generate Free Kundli',
    cta_chat: 'START 5-MINUTE FREE SESSION',
    ai_intro_title: 'Your first 5 minutes are free.',
    ai_intro_desc: 'Ask questions about your birth chart, current transits, or seek clarity on life matters — all through the lens of classical Vedic Jyotish.',
    ai_start_btn: 'Start 5-Minute Session',
  },
  hi: {
    nav_astrology: 'ज्योतिष',
    nav_kundli: 'कुंडली',
    nav_calculators: 'कैलकुलेटर',
    nav_reports: 'रिपोर्ट्स',
    nav_panchang: 'पंचांग',
    nav_academy: 'गुरुकुल',
    nav_store: 'स्टोर',
    nav_free_kundli: 'मुफ़्त कुंडली',
    nav_consult: 'परामर्श',
    nav_login: 'लॉगिन',
    
    section_reports_title: 'ज्योतिष के साथ गहराई में जाएं',
    section_reports_desc: 'विस्तृत, हस्तलिखित स्तर की कुंडली पठन जो ब्रह्मांडीय संरेखण को जीवन की दिशा में बदलता है।',
    section_tools_title: 'मुफ़्त ज्योतिष उपकरण',
    section_tools_desc: 'विश्वसनीय वैदिक ज्योतिष उपकरण — मुफ़्त, सटीक और हमेशा उपलब्ध।',
    section_panchang_title: 'आज का पंचांग',
    section_panchang_desc: 'शुभ समय, ग्रहों के गोचर और दैनिक ऊर्जा ग्रिड के लिए वैदिक दैनिक पंचांग।',
    section_astrologers_title: 'आचार्य से परामर्श करें',
    section_astrologers_desc: 'प्रामाणिक वैदिक परंपराओं से जुड़े सत्यापित ज्योतिष आचार्यों से मार्गदर्शन प्राप्त करें।',
    section_store_title: 'त्रिदेव स्टोर',
    section_store_desc: 'प्रामाणिक, जागृत रत्न, यंत्र और आध्यात्मिक सामग्री, सावधानीपूर्वक चुनी गई।',
    section_academy_title: 'त्रिदेव ज्योतिष गुरुकुल',
    section_academy_desc: 'वैदिक ज्योतिष और ज्योतिष शास्त्र में संरचित, गहन पाठ्यक्रम, आचार्यों के मार्गदर्शन में।',
    section_ai_title: 'त्रिदेव ज्योतिष एआई से पूछें',
    section_ai_desc: 'अपनी कुंडली के बारे में प्रश्न है? शास्त्रीय वैदिक ज्योतिष पर आधारित अंतर्दृष्टि प्राप्त करें।',
    
    cta_explore: 'सभी देखें',
    cta_consult: 'आचार्य से बात करें',
    cta_generate: 'मुफ़्त कुंडली बनाएं',
    cta_chat: '५-मिनट का मुफ़्त सत्र शुरू करें',
    ai_intro_title: 'आपके पहले ५ मिनट मुफ़्त हैं।',
    ai_intro_desc: 'अपनी जन्म कुंडली, वर्तमान गोचर के बारे में प्रश्न पूछें, या जीवन के मामलों पर स्पष्टता प्राप्त करें।',
    ai_start_btn: '५-मिनट का सत्र शुरू करें',
  },
  mr: {
    nav_astrology: 'ज्योतिष',
    nav_kundli: 'कुंडली',
    nav_calculators: 'कॅल्क्युलेटर',
    nav_reports: 'अहवाल',
    nav_panchang: 'पंचांग',
    nav_academy: 'गुरुकुल',
    nav_store: 'स्टोअर',
    nav_free_kundli: 'मोफत कुंडली',
    nav_consult: 'सल्ला',
    nav_login: 'लॉगिन',
    
    section_reports_title: 'ज्योतिषशास्त्रासह सखोल जा',
    section_reports_desc: 'अचूक आणि सखोल कुंडली वाचन जे ग्रहस्थितीला योग्य दिशा दाखवते.',
    section_tools_title: 'मोफत ज्योतिष साधने',
    section_tools_desc: 'विश्वासार्ह वैदिक ज्योतिष साधने — मोफत, अचूक आणि नेहमी उपलब्ध.',
    section_panchang_title: 'आजचे पंचांग',
    section_panchang_desc: 'शुभ काळ, ग्रहांचे गोचर आणि दैनिक ऊर्जा ग्रिडसाठी वैदिक दैनिक पंचांग.',
    section_astrologers_title: 'आचार्यांचा सल्ला घ्या',
    section_astrologers_desc: 'प्रामाणिक वैदिक परंपरेतील अनुभवी ज्योतिष आचार्यांकडून मार्गदर्शन मिळवा.',
    section_store_title: 'त्रिदेव स्टोअर',
    section_store_desc: 'प्रामाणिक, ऊर्जेने भारित रत्ने, यंत्रे आणि आध्यात्मिक साधने.',
    section_academy_title: 'त्रिदेव ज्योतिष गुरुकुल',
    section_academy_desc: 'वैदिक ज्योतिषशास्त्रातील पद्धतशीर आणि सखोल अभ्यासक्रम.',
    section_ai_title: 'त्रिदेव ज्योतिष एआयला विचारा',
    section_ai_desc: 'तुमच्या कुंडलीबद्दल प्रश्न आहे? शास्त्रीय वैदिक ज्योतिषावर आधारित उत्तरे मिळवा.',
    
    cta_explore: 'सर्व पहा',
    cta_consult: 'आचार्यांशी चर्चा करा',
    cta_generate: 'मोफत कुंडली बनवा',
    cta_chat: '५ मिनिटांचे मोफत सत्र सुरू करा',
    ai_intro_title: 'तुमचे पहिले ५ मिनिटे मोफत आहेत.',
    ai_intro_desc: 'तुमच्या कुंडलीबद्दल आणि ग्रहांच्या गोचराबद्दल प्रश्न विचारा.',
    ai_start_btn: '५ मिनिटांचे सत्र सुरू करा',
  },
  bn: {
    nav_astrology: 'জ্যোতিষ',
    nav_kundli: 'কোষ্ঠী',
    nav_calculators: 'ক্যালকুলেটর',
    nav_reports: 'রিপোর্ট',
    nav_panchang: 'পঞ্জিকা',
    nav_academy: 'গুরুকুল',
    nav_store: 'স্টোর',
    nav_free_kundli: 'ফ্রি কোষ্ঠী',
    nav_consult: 'পরামর্শ',
    nav_login: 'লগইন',
    
    section_reports_title: 'জ্যোতিষের সাথে গভীরে যান',
    section_reports_desc: 'বিস্তারিত কোষ্ঠী বিচার যা আপনার গ্রহের অবস্থানকে জীবনের সঠিক দিশায় রূপান্তর করে।',
    section_tools_title: 'ফ্রি জ্যোতিষ সরঞ্জাম',
    section_tools_desc: 'নির্ভরযোগ্য বৈদিক জ্যোতিষ সরঞ্জাম — সম্পূর্ণ ফ্রি ও নির্ভুল।',
    section_panchang_title: 'আজকের পঞ্জিকা',
    section_panchang_desc: 'শুভ সময়, গ্রহের গোচর এবং দৈনন্দিন শক্তির গ্রিডের বৈদিক বিবরণ।',
    section_astrologers_title: 'আচার্যের পরামর্শ নিন',
    section_astrologers_desc: 'বৈদিক বংশের প্রামাণিক জ্যোতিষাচার্যদের কাছ থেকে সঠিক মার্গদর্শন লাভ করুন।',
    section_store_title: 'ত্রিদেব স্টোর',
    section_store_desc: 'বিশুদ্ধ, মন্ত্রপুত রত্ন পাথর, যন্ত্র এবং আধ্যাত্মিক সরঞ্জাম।',
    section_academy_title: 'ত্রিদেব জ্যোতিষ গুরুকুল',
    section_academy_desc: 'বৈদিক জ্যোতিষশাস্ত্রের উপর বিস্তারিত ও সহজ পাঠ্যক্রম।',
    section_ai_title: 'ত্রিদেব জ্যোতিষ এআই-কে জিজ্ঞাসা করুন',
    section_ai_desc: 'আপনার কোষ্ঠী সম্পর্কে প্রশ্ন আছে? বৈদিক জ্যোতিষ ভিত্তিক সঠিক সিদ্ধান্ত পান।',
    
    cta_explore: 'সব দেখুন',
    cta_consult: 'আচার্যের সাথে কথা বলুন',
    cta_generate: 'ফ্রি কোষ্ঠী তৈরি করুন',
    cta_chat: '৫ মিনিটের ফ্রি সেশন শুরু করুন',
    ai_intro_title: 'আপনার প্রথম ৫ মিনিট সম্পূর্ণ ফ্রি।',
    ai_intro_desc: 'আপনার জন্ম কোষ্ঠী বা বর্তমান গোচর সংক্রান্ত যেকোনো প্রশ্ন করুন।',
    ai_start_btn: '৫ মিনিটের সেশন শুরু করুন',
  },
  ta: {
    nav_astrology: 'ஜோதிடம்',
    nav_kundli: 'ஜாதகம்',
    nav_calculators: 'கணக்கீடுகள்',
    nav_reports: 'அறிக்கைகள்',
    nav_panchang: 'பஞ்சாங்கம்',
    nav_academy: 'குருகுலம்',
    nav_store: 'கடை',
    nav_free_kundli: 'இலவச ஜாதகம்',
    nav_consult: 'ஆலோசனை',
    nav_login: 'உள்நுழை',
    
    section_reports_title: 'ஜோதிடத்தின் ஆழம் அறியுங்கள்',
    section_reports_desc: 'உங்கள் கிரக அமைப்புகளை வாழ்வின் நேரடி வழிகாட்டியாக மாற்றும் விரிவான ஜாதக வாசிப்பு.',
    section_tools_title: 'இலவச ஜோதிட கருவிகள்',
    section_tools_desc: 'நம்பகமான வேத ஜோதிட கருவிகள் — இலவசம், துல்லியமானது, எப்போதும் கிடைக்கும்.',
    section_panchang_title: 'இன்றைய பஞ்சாங்கம்',
    section_panchang_desc: 'நல்ல நேரம், கிரக பெயர்ச்சி மற்றும் தினசரி ஆற்றலை அறியும் பஞ்சாங்கம்.',
    section_astrologers_title: 'ஆச்சார்யாவை அணுகுங்கள்',
    section_astrologers_desc: 'பாரம்பரிய வேத ஜோதிட வழியில் வந்த சான்றளிக்கப்பட்ட ஆச்சார்யாக்களிடம் ஆலோசனை பெறுக.',
    section_store_title: 'திரிதேவ் ஸ்டோர்',
    section_store_desc: 'தூய, ஆற்றல் ஊட்டப்பட்ட நவரத்தினங்கள், யந்திரங்கள் மற்றும் ஆன்மீக பொருட்கள்.',
    section_academy_title: 'திரிதேவ் ஜோதிட குருகுலம்',
    section_academy_desc: 'முறையான வேத ஜோதிடப் பயிற்சி வகுப்புகள்.',
    section_ai_title: 'திரிதேவ் ஜோதிட ஐ-யிடம் கேட்கவும்',
    section_ai_desc: 'உங்கள் ஜாதகம் பற்றி கேள்விகள் உள்ளதா? வேத ஜோதிட வழியில் துல்லியமான பதில்களைப் பெறுங்கள்.',
    
    cta_explore: 'அனைத்தும் காண்க',
    cta_consult: 'ஆச்சார்யாவிடம் பேசுக',
    cta_generate: 'இலவச ஜாதகம் பெறுக',
    cta_chat: '5 நிமிட இலவச உரையாடலைத் தொடங்கு',
    ai_intro_title: 'உங்களின் முதல் 5 நிமிடங்கள் இலவசம்.',
    ai_intro_desc: 'உங்கள் பிறப்பு ஜாதகம் அல்லது தற்போதைய கிரக பெயர்ச்சி பற்றி கேளுங்கள்.',
    ai_start_btn: '5 நிமிட இலவச அமர்வைத் தொடங்கு',
  },
  te: {
    nav_astrology: 'జ్యోతిష్యం',
    nav_kundli: 'జాతకం',
    nav_calculators: 'క్యాలిక్యులేటర్లు',
    nav_reports: 'నివేదికలు',
    nav_panchang: 'పంచాంగం',
    nav_academy: 'గురుకులం',
    nav_store: 'స్టోర్',
    nav_free_kundli: 'ఉచిత జాతకం',
    nav_consult: 'సలహా',
    nav_login: 'లాగిన్',
    
    section_reports_title: 'జ్యోతిష్యం తో లోతుగా తెలుసుకోండి',
    section_reports_desc: 'గ్రహాల గమనాన్ని జీవిత మార్గదర్శకంగా మార్చే వివరణాత్మక జాతక నివేదిక.',
    section_tools_title: 'ఉచిత జ్యోతిష్య సాధనాలు',
    section_tools_desc: 'ఖచ్చితమైన మరియు విశ్వసనీయమైన ఉచిత వైదిక జ్యోతిష్య సాధనాలు.',
    section_panchang_title: 'నేటి పంచాంగం',
    section_panchang_desc: 'శుభ సమయాలు, గ్రహాల మార్పులు మరియు రోజువారీ ఫలితాల పంచాంగం.',
    section_astrologers_title: 'ఆచార్యులను సంప్రదించండి',
    section_astrologers_desc: 'వైదిక సంప్రదాయ నిపుణులైన జ్యోతిష్య శాస్త్ర ఆచార్యుల నుండి మార్గదర్శకత్వం.',
    section_store_title: 'త్రిదేవ్ స్టోర్',
    section_store_desc: 'పరిశుద్ధమైన మరియు శక్తివంతమైన రత్నాలు, యంత్రాలు మరియు ఆధ్యాత్మిక వస్తువులు.',
    section_academy_title: 'త్రిదేవ్ జ్యోతిష్య గురుకులం',
    section_academy_desc: 'వైదిక జ్యోతిష్యం లో ప్రాథమిక స్థాయి నుండి ఉన్నత స్థాయి కోర్సులు.',
    section_ai_title: 'త్రిదేవ్ జ్యోతిష్య ఏఐ ని అడగండి',
    section_ai_desc: 'మీ జాతకం గురించి ప్రశ్నలు ఉన్నాయా? వైదిక జ్యోతిష్యం ఆధారంగా సలహాలు పొందండి.',
    
    cta_explore: 'అన్నీ చూడండి',
    cta_consult: 'ఆచార్యుడితో మాట్లాడండి',
    cta_generate: 'ఉచిత జాతకాన్ని పొందండి',
    cta_chat: '5 నిమిషాల ఉచిత చాట్ ప్రారంభించండి',
    ai_intro_title: 'మీ మొదటి 5 నిమిషాలు ఉచితం.',
    ai_intro_desc: 'మీ జన్మ జాతకం లేదా గ్రహాల సంచారం గురించి ప్రశ్నలు అడగండి.',
    ai_start_btn: '5 నిమిషాల ఉచిత చాట్ ప్రారంభించండి',
  }
};

const defaultProfile: BirthProfile = {
  name: 'Arjun Sharma',
  dob: '1990-11-08',
  tob: '06:45',
  place: 'New Delhi, India',
  sun: 'Scorpio',
  moon: 'Taurus',
  ascendant: 'Leo',
  nakshatra: 'Rohini',
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [birthProfile, setBirthProfileState] = useState<BirthProfile>(() => {
    const saved = localStorage.getItem('birthProfile');
    return saved ? JSON.parse(saved) : defaultProfile;
  });
  const [concern, setConcern] = useState<Concern>(null);
  const [kundliGenerated, setKundliGeneratedState] = useState<boolean>(() => {
    return localStorage.getItem('kundliGenerated') === 'true';
  });
  const [astrologerFilter, setAstrologerFilter] = useState('All');
  
  // Navigation & Cart States
  const [page, setPage] = useState('home');
  const [selectedId, setSelectedId] = useState<number | string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Theme State — DEFAULT IS LIGHT
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Auth State (mock prototype)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('isLoggedIn') === 'true';
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Language selector state
  const [language, setLanguageState] = useState<'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te'>(() => {
    const saved = localStorage.getItem('language');
    return (saved as any) || 'en';
  });

  const setLanguage = (l: 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te') => {
    setLanguageState(l);
    localStorage.setItem('language', l);
  };

  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  const setBirthProfile = (p: BirthProfile) => {
    setBirthProfileState(p);
    localStorage.setItem('birthProfile', JSON.stringify(p));
  };

  const setKundliGenerated = (v: boolean) => {
    setKundliGeneratedState(v);
    localStorage.setItem('kundliGenerated', v ? 'true' : 'false');
  };

  const toggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return next;
    });
  };

  const setLoggedIn = (v: boolean) => {
    setIsLoggedIn(v);
    localStorage.setItem('isLoggedIn', v ? 'true' : 'false');
  };


  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      if (exists) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const clearCart = () => setCart([]);

  return (
    <AppContext.Provider value={{
      birthProfile, setBirthProfile,
      concern, setConcern,
      kundliGenerated, setKundliGenerated,
      astrologerFilter, setAstrologerFilter,
      page, setPage,
      selectedId, setSelectedId,
      cart, addToCart, removeFromCart, clearCart,
      theme, toggleTheme,
      isLoggedIn, setLoggedIn,
      pendingAction, setPendingAction,
      showLoginModal, setShowLoginModal,
      language, setLanguage, t
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}

