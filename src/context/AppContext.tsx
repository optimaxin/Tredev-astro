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
    section_astrologers_title: 'Consult an Astrologist',
    section_astrologers_desc: 'Seek guidance from verified Jyotish masters rooted in authentic Vedic lineages.',
    section_store_title: 'TredevStore',
    section_store_desc: 'Authentic, energized gemstones, yantras and spiritual tools, carefully curated.',
    section_academy_title: 'TredevAstro Gurukul',
    section_academy_desc: 'Structured, in-depth courses in Vedic astrology and Jyotish, guided by lineage Acharyas.',
    section_ai_title: 'Ask TredevAstro',
    section_ai_desc: 'Have a question about your chart? Get insights grounded in classical Vedic astrology.',

    // CTA & button actions
    cta_explore: 'Explore All',
    cta_consult: 'Consult an Astrologist',
    cta_generate: 'Generate Free Kundli',
    cta_chat: 'START 5-MINUTE FREE SESSION',
    ai_intro_title: 'Your first 5 minutes are free.',
    ai_intro_desc: 'Ask questions about your birth chart, current transits, or seek clarity on life matters — all through the lens of classical Vedic Jyotish.',
    ai_start_btn: 'Start',

    // Hero Section
    hero_headline: 'Your Stars. Your Dharma.',
    hero_headline_italic: 'Your Journey.',
    hero_hindi_eyebrow: '"Apne Aakash Ko Samjhiye"',
    hero_subhead: 'Personalized Vedic astrology, expert guidance, intelligent insights and timeless Jyotish wisdom.',
    hero_cta_kundli: 'Generate Free Kundli',
    hero_cta_consult: 'Consult an Astrologist',
    hero_trust_acharyas: 'Verified Acharyas',
    hero_trust_jyotish: 'Personalized Jyotish',
    hero_trust_secure: 'Private & Secure',
    hero_scroll_text: 'Scroll to explore',

    // Guidance Banner
    guidance_eyebrow: '✦ JYOTISH GUIDANCE',
    guidance_headline: 'When the path feels Unclear,',
    guidance_headline_italic: 'Look to the stars',
    guidance_desc: 'Explore your Kundli, understand the movement of the Grahas, and discover the guidance written in your celestial map.',
    guidance_cta_kundli: 'Explore your kundli',
    guidance_cta_consult: 'Consult an Astrologist',

    // Seek Guidance Grid
    seek_eyebrow: 'Jyotish Margdarshan',
    seek_title: 'Where does your question begin?',
    seek_desc: 'Select a life area to generate your Janma Kundli and explore planetary alignments.',
    seek_card_marriage_title: 'Love & Marriage',
    seek_card_marriage_desc: 'Understand relationship compatibility, Mars dosha, and marriage timing.',
    seek_card_career_title: 'Career & Business',
    seek_card_career_desc: 'Auspicious professions, leadership prospects, and timing of success.',
    seek_card_money_title: 'Money & Prosperity',
    seek_card_money_desc: 'Financial yogas, wealth accumulation periods, and remedial path.',
    seek_card_family_title: 'Family & Heritage',
    seek_card_family_desc: 'Ancestral karma, domestic harmony, and lineage progeny charts.',
    seek_card_growth_title: 'Personal Growth',
    seek_card_growth_desc: 'Identify character strengths, obstacles, and spiritual path.',
    seek_card_spirituality_title: 'Spirituality',
    seek_card_spirituality_desc: 'Moksha timings, meditation affinity, and spiritual alignments.',
    seek_card_vastu_title: 'Vastu Shastra',
    seek_card_vastu_desc: 'Directional energies, element placement, and home architecture harmony.',
    seek_card_cta: 'Analyze Placement →',

    // Card details & buttons translations
    btn_add_to_cart: 'Buy Now',
    btn_enroll: 'Enroll Now',
    btn_view_details: 'View Details',

    // Categories
    cat_gemstones: 'Ratna (Gemstones)',
    cat_rudraksha: 'Rudraksha',
    cat_crystals: 'Sphatik (Crystals)',
    cat_bracelets: 'Mala & Bracelets',
    cat_yantras: 'Yantras',
    cat_puja_essentials: 'Puja Essentials',
    cat_all: 'All Remedies',

    // Reports translations
    report_1_title: 'Career Intelligence',
    report_1_sub: 'Your professional path, decoded',
    report_1_desc: 'Deep analysis of your 10th house, career planets, Mahadasha influence and the optimal timing for career transitions.',

    report_2_title: 'Love & Relationships',
    report_2_sub: "Understand your heart's map",
    report_2_desc: 'Explore your Venus placement, 7th house dynamics, and compatibility factors that shape your relationships.',

    report_3_title: 'Marriage Report',
    report_3_sub: 'Timing and compatibility',
    report_3_desc: 'Comprehensive marriage analysis including Navamsha chart, Mangal Dosha assessment, and marriage timing.',

    report_4_title: 'Premium Kundli',
    report_4_sub: 'Your complete cosmic blueprint',
    report_4_desc: 'The most comprehensive birth chart analysis including all 16 divisional charts, detailed planetary interpretations and life predictions.',

    report_5_title: 'Fortune & Wealth',
    report_5_sub: 'Your financial cosmic map',
    report_5_desc: 'Analysis of your 2nd and 11th houses, wealth planets, Dhan Yoga identification and financial timing.',

    report_6_title: 'Soul Purpose',
    report_6_sub: 'Discover your dharmic path',
    report_6_desc: "An in-depth exploration of your 9th house, Dharma planets, past life karma and your soul's purpose in this lifetime.",

    report_7_title: 'Year Ahead',
    report_7_sub: 'Your annual cosmic forecast',
    report_7_desc: 'A month-by-month forecast using Solar Return, transit analysis, and Dasha periods for the coming 12 months.',

    // Courses translations
    course_1_title: 'Vedic Astrology — Complete Course',
    course_1_sub: 'From natal chart to predictive astrology',
    course_2_title: 'Numerology Mastery',
    course_2_sub: 'Decode the language of numbers',
    course_3_title: 'Tarot for Beginners',
    course_3_sub: 'Read the cards, read your path',
    course_4_title: 'Vastu Shastra Fundamentals',
    course_4_sub: 'Create harmony in your space',

    // Products translations
    prod_1_name: 'Natural Colombian Emerald',
    prod_1_assoc: 'Traditionally associated with Mercury (Budh)',
    prod_1_benefit: 'Clarity of thought, communication and intellectual growth',

    prod_2_name: 'Five-Mukhi Rudraksha',
    prod_2_assoc: 'Traditionally associated with Lord Shiva',
    prod_2_benefit: 'Spiritual protection and peace of mind',

    prod_3_name: 'Rose Quartz Cluster',
    prod_3_assoc: 'Traditional stone for Venus energy',
    prod_3_benefit: 'Harmony in relationships',

    prod_4_name: 'Shri Yantra (Brass)',
    prod_4_assoc: 'Sacred geometric representation of the cosmos',
    prod_4_benefit: 'Prosperity and spiritual growth',

    prod_5_name: 'Tiger Eye Bracelet',
    prod_5_assoc: 'Traditionally associated with Sun and Mars energy',
    prod_5_benefit: 'Confidence and personal power',

    prod_6_name: 'Navgraha Puja Kit',
    prod_6_assoc: 'Complete kit for all nine planetary deities',
    prod_6_benefit: 'Planetary harmony and balance',
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

    // Hero Section
    hero_headline: 'आपके सितारे। आपका धर्म।',
    hero_headline_italic: 'आपकी यात्रा।',
    hero_hindi_eyebrow: '"अपने आकाश को समझें"',
    hero_subhead: 'व्यक्तिगत वैदिक ज्योतिष, विशेषज्ञ मार्गदर्शन, बुद्धिमान अंतर्दृष्टि और कालातीत ज्योतिष ज्ञान।',
    hero_cta_kundli: 'मुफ़्त कुंडली बनाएं',
    hero_cta_consult: 'आचार्य से बात करें',
    hero_trust_acharyas: 'सत्यापित आचार्य',
    hero_trust_jyotish: 'व्यक्तिगत ज्योतिष',
    hero_trust_secure: 'निजी और सुरक्षित',
    hero_scroll_text: 'खोजने के लिए स्क्रॉल करें',

    // Guidance Banner
    guidance_eyebrow: '✦ ज्योतिष मार्गदर्शन',
    guidance_headline: 'जब रास्ता अस्पष्ट लगे,',
    guidance_headline_italic: 'तारों की ओर देखें।',
    guidance_desc: 'अपनी कुंडली का अन्वेषण करें, ग्रहों के गोचर को समझें, और अपने आकाशीय मानचित्र में लिखे मार्गदर्शन की खोज करें।',
    guidance_cta_kundli: 'कुंडली का अन्वेषण करें',
    guidance_cta_consult: 'आचार्य से परामर्श करें',

    // Seek Guidance Grid
    seek_eyebrow: 'ज्योतिष मार्गदर्शन',
    seek_title: 'आपका प्रश्न कहाँ से शुरू होता है?',
    seek_desc: 'अपनी जन्म कुंडली बनाने और ग्रहों के संरेखण का पता लगाने के लिए एक जीवन क्षेत्र चुनें।',
    seek_card_marriage_title: 'प्रेम और विवाह',
    seek_card_marriage_desc: 'संबंध अनुकूलता, मंगल दोष और विवाह के समय को समझें।',
    seek_card_career_title: 'करियर और व्यवसाय',
    seek_card_career_desc: 'शुभ पेशे, नेतृत्व की संभावनाएं और सफलता का समय।',
    seek_card_money_title: 'धन और समृद्धि',
    seek_card_money_desc: 'वित्तीय योग, धन संचय की अवधि और उपचारात्मक मार्ग।',
    seek_card_family_title: 'परिवार और विरासत',
    seek_card_family_desc: 'पैतृक कर्म, पारिवारिक सद्भाव और वंशानुगत संतान चार्ट।',
    seek_card_growth_title: 'व्यक्तिगत विकास',
    seek_card_growth_desc: 'चरित्र की ताकत, बाधाओं और आध्यात्मिक पथ की पहचान करें।',
    seek_card_spirituality_title: 'आध्यात्मिकता',
    seek_card_spirituality_desc: 'मोक्ष का समय, ध्यान के प्रति झुकाव और आध्यात्मिक संरेखण।',
    seek_card_vastu_title: 'वास्तु शास्त्र',
    seek_card_vastu_desc: 'दिशात्मक ऊर्जा, पंचतत्व प्लेसमेंट और गृह वास्तुकला सद्भाव।',
    seek_card_cta: 'प्लेसमेंट विश्लेषण →',

    btn_add_to_cart: 'अभी खरीदें',
    btn_enroll: 'प्रवेश लें',
    btn_view_details: 'विवरण देखें',

    cat_gemstones: 'रत्न',
    cat_rudraksha: 'रुद्राक्ष',
    cat_crystals: 'स्फटिक',
    cat_bracelets: 'माला और ब्रेसलेट',
    cat_yantras: 'यंत्र',
    cat_puja_essentials: 'पूजा सामग्री',
    cat_all: 'सभी उपाय',

    report_1_title: 'करियर इंटेलिजेंस',
    report_1_sub: 'आपका व्यावसायिक मार्ग, डिकोड किया गया',
    report_1_desc: 'आपके १०वें भाव, करियर के ग्रहों, महादशा के प्रभाव और करियर परिवर्तन के लिए अनुकूल समय का गहरा विश्लेषण।',

    report_2_title: 'प्रेम और रिश्ते',
    report_2_sub: 'अपने दिल का नक्शा समझें',
    report_2_desc: 'अपने शुक्र की स्थिति, ७वें भाव के समीकरण और आपके रिश्तों को आकार देने वाले अनुकूलता कारकों का पता लगाएं।',

    report_3_title: 'विवाह रिपोर्ट',
    report_3_sub: 'समय और अनुकूलता',
    report_3_desc: 'नवांश कुंडली, मंगल दोष मूल्यांकन और विवाह समय सहित व्यापक विवाह विश्लेषण।',

    report_4_title: 'प्रीमियम कुंडली',
    report_4_sub: 'आपका संपूर्ण आकाशीय खाका',
    report_4_desc: 'सभी १६ वर्ग कुंडलियों, विस्तृत ग्रहों की व्याख्या और जीवन भविष्यवाणियों सहित सबसे व्यापक जन्म कुंडली विश्लेषण।',

    report_5_title: 'भाग्य और धन',
    report_5_sub: 'आपका वित्तीय आकाशीय मानचित्र',
    report_5_desc: 'आपके २रे और ११वें भाव, धन ग्रहों, धन योग की पहचान और वित्तीय समय का विश्लेषण।',

    report_6_title: 'आत्मा का उद्देश्य',
    report_6_sub: 'अपने धार्मिक पथ की खोज करें',
    report_6_desc: 'आपके ९वें भाव, धर्म ग्रहों, पिछले जीवन के कर्म और इस जीवनकाल में आपकी आत्मा के उद्देश्य की गहन खोज।',

    report_7_title: 'आगामी वर्ष',
    report_7_sub: 'आपका वार्षिक ब्रह्मांडीय पूर्वानुमान',
    report_7_desc: 'आने वाले १२ महीनों के लिए सूर्य कुंडली, गोचर विश्लेषण और दशा अवधियों का उपयोग करके महीने-दर-महीने पूर्वानुमान।',

    course_1_title: 'वैदिक ज्योतिष — पूर्ण पाठ्यक्रम',
    course_1_sub: 'जन्म कुंडली से लेकर भविष्य कहने वाले ज्योतिष तक',
    course_2_title: 'अंकशास्त्र महारत',
    course_2_sub: 'संख्याओं की भाषा को डिकोड करें',
    course_3_title: 'शुरुआती लोगों के लिए टैरो',
    course_3_sub: 'कार्ड पढ़ें, अपना पथ पढ़ें',
    course_4_title: 'वास्तु शास्त्र के मूल सिद्धांत',
    course_4_sub: 'अपने स्थान में सामंजस्य स्थापित करें',

    prod_1_name: 'प्राकृतिक कोलंबियाई पन्ना',
    prod_1_assoc: 'बुध ग्रह से संबंधित',
    prod_1_benefit: 'विचारों की स्पष्टता, संचार और बौद्धिक विकास',

    prod_2_name: 'पंचमुखी रुद्राक्ष',
    prod_2_assoc: 'भगवान शिव से संबंधित',
    prod_2_benefit: 'आध्यात्मिक सुरक्षा और मन की शांति',

    prod_3_name: 'रोज क्वार्ट्ज क्लस्टर',
    prod_3_assoc: 'शुक्र ऊर्जा का पत्थर',
    prod_3_benefit: 'रिश्तों में सामंजस्य और प्रेम',

    prod_4_name: 'श्री यंत्र (पीतल)',
    prod_4_assoc: 'ब्रह्मांड का पवित्र ज्यामितीय प्रतिनिधित्व',
    prod_4_benefit: 'समृद्धि और आध्यात्मिक उन्नति',

    prod_5_name: 'टाइगर आई ब्रेसलेट',
    prod_5_assoc: 'सूर्य और मंगल ऊर्जा से संबंधित',
    prod_5_benefit: 'आत्मविश्वास और व्यक्तिगत शक्ति',

    prod_6_name: 'नवग्रह पूजा किट',
    prod_6_assoc: 'सभी नौ ग्रहों के देवताओं के लिए पूर्ण किट',
    prod_6_benefit: 'ग्रहों की शांति और संतुलन',
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

    // Hero Section
    hero_headline: 'तुमचे तारे. तुमचा धर्म.',
    hero_headline_italic: 'तुमचा प्रवास.',
    hero_hindi_eyebrow: '"आपले आकाश समजून घ्या"',
    hero_subhead: 'वैयक्तिकृत वैदिक ज्योतिष, तज्ञ मार्गदर्शन, बुद्धिमान अंतर्दृष्टी आणि शाश्वत ज्योतिष ज्ञान.',
    hero_cta_kundli: 'मोफत कुंडली बनवा',
    hero_cta_consult: 'आचार्यांचा सल्ला घ्या',
    hero_trust_acharyas: 'सत्यापित आचार्य',
    hero_trust_jyotish: 'वैयक्तिकृत ज्योतिष',
    hero_trust_secure: 'खाजगी आणि सुरक्षित',
    hero_scroll_text: 'अन्वेषण करण्यासाठी स्क्रोल करा',

    // Guidance Banner
    guidance_eyebrow: '✦ ज्योतिषीय मार्गदर्शन',
    guidance_headline: 'जेव्हा मार्ग अस्पष्ट वाटतो,',
    guidance_headline_italic: 'ताऱ्यांकडे पहा.',
    guidance_desc: 'तुमची कुंडली अभ्यासा, ग्रहांची हालचाल समजून घ्या आणि तुमच्या आकाशीय नकाशात लिहिलेले मार्गदर्शन शोधा.',
    guidance_cta_kundli: 'कुंडलीचे अन्वेषण करा',
    guidance_cta_consult: 'आचार्यांचा सल्ला घ्या',

    // Seek Guidance Grid
    seek_eyebrow: 'ज्योतिष मार्गदर्शन',
    seek_title: 'तुमच्या प्रश्नाची सुरुवात कुठून होते?',
    seek_desc: 'तुमची जन्मकुंडली तयार करण्यासाठी आणि ग्रहांच्या स्थितीचे विश्लेषण करण्यासाठी जीवनातील एक क्षेत्र निवडा.',
    seek_card_marriage_title: 'प्रेम आणि विवाह',
    seek_card_marriage_desc: 'नात्यातील सुसंगतता, मंगळ दोष आणि विवाहाची वेळ समजून घ्या.',
    seek_card_career_title: 'करिअर आणि व्यवसाय',
    seek_card_career_desc: 'शुभ व्यवसाय, नेतृत्वाची शक्यता आणि यशाचा काळ.',
    seek_card_money_title: 'पैसा आणि समृद्धी',
    seek_card_money_desc: 'आर्थिक योग, संपत्ती संचय कालावधी आणि उपचारात्मक मार्ग.',
    seek_card_family_title: 'कुटुंब आणि वारसा',
    seek_card_family_desc: 'पूर्वजांचे कर्म, कौटुंबिक सुसंवाद आणि वारसा संतती तक्ता.',
    seek_card_growth_title: 'वैयक्तिक विकास',
    seek_card_growth_desc: 'चारित्र्य सामर्थ्य, अडथळे आणि आध्यात्मिक मार्ग ओळखा.',
    seek_card_spirituality_title: 'आध्यात्मिकता',
    seek_card_spirituality_desc: 'मोक्षाचा काळ, ध्यानाची ओढ आणि आध्यात्मिक सुसंगतता.',
    seek_card_vastu_title: 'वास्तु शास्त्र',
    seek_card_vastu_desc: 'दिशात्मक ऊर्जा, पंचतत्व मांडणी आणि वास्तुकला सुसंवाद.',
    seek_card_cta: 'विश्लेषण करा →',

    btn_add_to_cart: 'आता खरेदी करा',
    btn_enroll: 'प्रवेश घ्या',
    btn_view_details: 'तपशील पहा',

    cat_gemstones: 'रत्ने',
    cat_rudraksha: 'रुद्राक्ष',
    cat_crystals: 'स्फटिक',
    cat_bracelets: 'माळा आणि ब्रेसलेट',
    cat_yantras: 'यंत्र',
    cat_puja_essentials: 'पूजा साहित्य',
    cat_all: 'सर्व उपाय',

    report_1_title: 'करिअर इंटेलिजन्स',
    report_1_sub: 'तुमचा व्यावसायिक मार्ग, डिकोड केला',
    report_1_desc: 'तुमच्या १० व्या स्थानाचा, करिअर ग्रहांचा, महादशाचा प्रभाव आणि नोकरी बदलण्यासाठी योग्य वेळेचे सखोल विश्लेषण.',

    report_2_title: 'प्रेम आणि नातेसंबंध',
    report_2_sub: 'तुमच्या हृदयाचा नकाशा समजून घ्या',
    report_2_desc: 'तुमची शुक्र स्थिती, ७ वे स्थान आणि नात्याला आकार देणारे अनुकूलता घटक तपासा.',

    report_3_title: 'विवाह अहवाल',
    report_3_sub: 'वेळ आणि अनुकूलता',
    report_3_desc: 'नवांश कुंडली, मंगळ दोष आणि विवाहाच्या वेळेसह सविस्तर विवाह अहवाल.',

    report_4_title: 'प्रीमियम कुंडली',
    report_4_sub: 'तुमचा संपूर्ण आकाशीय आराखडा',
    report_4_desc: 'सर्व १६ वर्ग कुंडल्या, ग्रहांचे सविस्तर विश्लेषण आणि जीवन भविष्यासह सर्वात सखोल कुंडली वाचन.',

    report_5_title: 'भाग्य आणि संपत्ती',
    report_5_sub: 'तुमचा आर्थिक आकाशीय नकाशा',
    report_5_desc: 'तुमच्या २ या आणि ११ व्या स्थानांचे, संपत्ती ग्रहांचे आणि धन योगांचे विश्लेषण.',

    report_6_title: 'आत्म्याचा हेतू',
    report_6_sub: 'तुमचा धार्मिक मार्ग शोधा',
    report_6_desc: 'तुमच्या ९ व्या स्थानाचा, धर्म ग्रहांचा आणि या जन्मातील तुमच्या आत्म्याच्या ध्येयाचा सखोल शोध.',

    report_7_title: 'आगामी वर्ष',
    report_7_sub: 'तुमचा वार्षिक खगोलीय अंदाज',
    report_7_desc: 'येत्या १२ महिन्यांसाठी दशा काळ आणि ग्रहांच्या गोचराचा महिन्यानुसार अंदाज.',

    course_1_title: 'वैदिक ज्योतिष — पूर्ण अभ्यासक्रम',
    course_1_sub: 'जन्म कुंडलीपासून भविष्य वर्तवणाऱ्या ज्योतिषापर्यंत',
    course_2_title: 'अंकशास्त्र नैपुण्य',
    course_2_sub: 'संख्यांची भाषा समजून घ्या',
    course_3_title: 'सुरुवातीच्या लोकांसाठी टॅरो',
    course_3_sub: 'कार्ड्स वाचा, तुमचा मार्ग ओळखा',
    course_4_title: 'वास्तु शास्त्र मूलभूत गोष्टी',
    course_4_sub: 'तुमच्या वास्तूत ऊर्जा सुसंगत करा',

    prod_1_name: 'नैसर्गिक कोलंबियन पाचू',
    prod_1_assoc: 'बुध ग्रहाशी संबंधित',
    prod_1_benefit: 'विचारांची स्पष्टता, संवाद आणि बौद्धिक विकास',

    prod_2_name: 'पंचमुखी रुद्राक्ष',
    prod_2_assoc: 'भगवान शिवाशी संबंधित',
    prod_2_benefit: 'आध्यात्मिक संरक्षण आणि मानसिक शांतता',

    prod_3_name: 'रोज क्वार्ट्ज क्लस्टर',
    prod_3_assoc: 'शुक्र ग्रहाच्या ऊर्जेचे प्रतिनिधित्व',
    prod_3_benefit: 'नात्यांमध्ये सुसंवाद आणि प्रेम',

    prod_4_name: 'श्री यंत्र (पितळ)',
    prod_4_assoc: 'ब्रह्मांडीय पवित्र भौमितिक रूप',
    prod_4_benefit: 'समृद्धी आणि आध्यात्मिक प्रगती',

    prod_5_name: 'टायगर आय ब्रेसलेट',
    prod_5_assoc: 'सूर्य आणि मंगळ ग्रहाच्या ऊर्जेशी संबंधित',
    prod_5_benefit: 'आत्मविश्वास आणि वैयक्तिक शक्ती',

    prod_6_name: 'नवग्रह पूजा किट',
    prod_6_assoc: 'सर्व नऊ ग्रहांच्या पूजेचे साहित्य',
    prod_6_benefit: 'ग्रहांची शांती आणि संतुलन',
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

    // Hero Section
    hero_headline: 'আপনার তারা। আপনার ধর্ম।',
    hero_headline_italic: 'আপনার যাত্রা।',
    hero_hindi_eyebrow: '"নিজের আকাশকে জানুন"',
    hero_subhead: 'ব্যক্তিগতকৃত বৈদিক জ্যোতিষশাস্ত্র, বিশেষজ্ঞের পরামর্শ, বুদ্ধিদীপ্ত অন্তর্দৃষ্টি এবং কালজয়ী জ্যোতিষ জ্ঞান।',
    hero_cta_kundli: 'ফ্রি কোষ্ঠী তৈরি করুন',
    hero_cta_consult: 'আচার্যের পরামর্শ নিন',
    hero_trust_acharyas: 'যাচাইকৃত আচার্যগণ',
    hero_trust_jyotish: 'ব্যক্তিগতকৃত জ্যোতিষ',
    hero_trust_secure: 'ব্যক্তিগত ও সুরক্ষিত',
    hero_scroll_text: 'আবিষ্কার করতে স্ক্রোল করুন',

    // Guidance Banner
    guidance_eyebrow: '✦ জ্যোতিষীয় নির্দেশনা',
    guidance_headline: 'যখন পথ অস্পষ্ট মনে হয়,',
    guidance_headline_italic: 'তারকাদের দিকে তাকান।',
    guidance_desc: 'আপনার কোষ্ঠী অন্বেষণ করুন, গ্রহের গতিবিধি বুঝুন এবং আপনার মহাজাগতিক মানচিত্রে লেখা নির্দেশনা আবিষ্কার করুন।',
    guidance_cta_kundli: 'কোষ্ঠী অন্বেষণ করুন',
    guidance_cta_consult: 'আচার্যের পরামর্শ নিন',

    // Seek Guidance Grid
    seek_eyebrow: 'জ্যোতিষ মার্গদর্শন',
    seek_title: 'আপনার প্রশ্ন কোথা থেকে শুরু হয়?',
    seek_desc: 'আপনার জন্ম কোষ্ঠী তৈরি করতে এবং গ্রহের অবস্থান অন্বেষণ করতে একটি জীবন ক্ষেত্র নির্বাচন করুন।',
    seek_card_marriage_title: 'প্রেম ও বিবাহ',
    seek_card_marriage_desc: 'সম্পর্কের সামঞ্জস্য, মঙ্গল দোষ এবং বিবাহের শুভ সময় বুঝুন।',
    seek_card_career_title: 'কর্মজীবন ও ব্যবসা',
    seek_card_career_desc: 'অনুকূল পেশা, নেতৃত্বের সম্ভাবনা এবং সাফল্যের সঠিক সময়।',
    seek_card_money_title: 'অর্থ ও সমৃদ্ধি',
    seek_card_money_desc: 'আর্থিক যোগ, ধন সঞ্চয়ের সময় এবং প্রতিকারমূলক পথ।',
    seek_card_family_title: 'পরিবার ও ঐতিহ্য',
    seek_card_family_desc: 'পিতৃপুরুষের কর্ম, পারিবারিক সম্প্রীতি এবং বংশধরদের কোষ্ঠী চার্ট।',
    seek_card_growth_title: 'ব্যক্তিগত উন্নতি',
    seek_card_growth_desc: 'চরিত্রের শক্তি, বাধা এবং আধ্যাত্মিক পথ চিহ্নিত করুন।',
    seek_card_spirituality_title: 'আধ্যাত্মিকতা',
    seek_card_spirituality_desc: 'মোক্ষলাভের সময়, ধ্যানের প্রতি আগ্রহ এবং আধ্যাত্মিক যোগ।',
    seek_card_vastu_title: 'বাস্তু শাস্ত্র',
    seek_card_vastu_desc: 'দিকনির্দেশক শক্তি, পঞ্চভূত উপাদানের অবস্থান এবং গৃহের স্থাপত্য সামঞ্জস্য।',
    seek_card_cta: 'অবস্থান বিশ্লেষণ →',

    btn_add_to_cart: 'এখনই কিনুন',
    btn_enroll: 'ভর্তি হন',
    btn_view_details: 'বিস্তারিত দেখুন',

    cat_gemstones: 'রত্ন পাথর',
    cat_rudraksha: 'রুদ্রাক্ষ',
    cat_crystals: 'স্ফটিক',
    cat_bracelets: 'মালা ও ব্রেসলেট',
    cat_yantras: 'যন্ত্র',
    cat_puja_essentials: 'পূজার সামগ্রী',
    cat_all: 'সব প্রতিকার',

    report_1_title: 'ক্যারিয়ার ইন্টেলিজেন্স',
    report_1_sub: 'আপনার পেশাদার পথ, ডিকোড করা হলো',
    report_1_desc: 'আপনার ১০ম ভাব, ক্যারিয়ারের গ্রহ, মহাদশার প্রভাব এবং চাকরি পরিবর্তনের সঠিক সময়ের বিস্তারিত বিশ্লেষণ।',

    report_2_title: 'প্রেম ও সম্পর্ক',
    report_2_sub: 'আপনার হৃদয়ের মানচিত্র বুঝুন',
    report_2_desc: 'আপনার শুক্রের অবস্থান, ৭ম ভাবের গতিশীলতা এবং সম্পর্কের সামঞ্জস্যের কারণগুলি অন্বেষণ করুন।',

    report_3_title: 'বিবাহ রিপোর্ট',
    report_3_sub: 'সময় এবং সামঞ্জস্য',
    report_3_desc: 'নবমাংশ চার্ট, মঙ্গল দোষ এবং বিবাহের সময় সহ সম্পূর্ণ বিবাহ বিশ্লেষণ রিপোর্ট।',

    report_4_title: 'প্রিমিয়াম কোষ্ঠী',
    report_4_sub: 'আপনার সম্পূর্ণ মহাজাগতিক নীলনকশা',
    report_4_desc: '১৬টি বিভাগীয় চার্ট, গ্রহের বিস্তারিত ব্যাখ্যা এবং জীবন ভবিষ্যদ্বাণী সহ সবচেয়ে সম্পূর্ণ কোষ্ঠী বিশ্লেষণ।',

    report_5_title: 'ভাগ্য ও সম্পদ',
    report_5_sub: 'আপনার আর্থিক মহাজাগতিক মানচিত্র',
    report_5_desc: 'আপনার ২য় ও ১১তম ভাব, সম্পদের গ্রহ এবং ধন যোগের বিস্তারিত বিশ্লেষণ।',

    report_6_title: 'আত্মার উদ্দেশ্য',
    report_6_sub: 'আপনার ধার্মিক পথ আবিষ্কার করুন',
    report_6_desc: 'আপনার ৯ম ভাব, ধর্ম গ্রহ, পূর্বজন্মের কর্ম এবং আপনার আত্মার আসল উদ্দেশ্যের অন্বেষণ।',

    report_7_title: 'আগামী বছর',
    report_7_sub: 'আপনার বার্ষিক মহাজাগতিক পূর্বাভাস',
    report_7_desc: 'আগামী ১২ মাসের ট্রানজিট এবং দশা বিশ্লেষণ ব্যবহার করে প্রতি মাসের পূর্বাভাস।',

    course_1_title: 'বৈদিক জ্যোতিষশাস্ত্র — সম্পূর্ণ পাঠ্যক্রম',
    course_1_sub: 'জন্মছক বিশ্লেষণ থেকে ভবিষ্যৎবাণী জ্যোতিষ পর্যন্ত',
    course_2_title: 'সংখ্যাবিজ্ঞান আয়ত্ত',
    course_2_sub: 'সংখ্যার ভাষা ডিকোড করতে শিখুন',
    course_3_title: 'নতুনদের জন্য ট্যারো',
    course_3_sub: 'কার্ডের মাধ্যমে নিজের পথ চিনে নিন',
    course_4_title: 'বাস্তু শাস্ত্রের মূল সূত্র',
    course_4_sub: 'নিজের গৃহে শক্তি সঞ্চার করুন',

    prod_1_name: 'প্রাকৃতিক কলম্বিয়ান পান্না',
    prod_1_assoc: 'বুধ গ্রহের পাথর',
    prod_1_benefit: 'চিন্তার স্পষ্টতা, যোগাযোগ দক্ষতা এবং বুদ্ধিবৃত্তিক বিকাশ',

    prod_2_name: 'পঞ্চমুখী রুদ্রাক্ষ',
    prod_2_assoc: 'ভগবান শিবের আশীর্বাদপুষ্ট',
    prod_2_benefit: 'আধ্যাত্মিক সুরক্ষা এবং মানসিক শান্তি প্রদান করে',

    prod_3_name: 'রোজ কোয়ার্টজ ক্লাস্টার',
    prod_3_assoc: 'শুক্র গ্রহের শক্তির প্রতীক',
    prod_3_benefit: 'পারিবারিক ও সম্পর্কের মধ্যে মধুরতা আনে',

    prod_4_name: 'শ্রী যন্ত্র (পিতল)',
    prod_4_assoc: 'মহাবিশ্বের পবিত্র জ্যামিতিক রূপ',
    prod_4_benefit: 'সমৃদ্ধি ও আধ্যাত্মিক উন্নতি আনয়ন করে',

    prod_5_name: 'টাইগার আই ব্রেসলেট',
    prod_5_assoc: 'সূর্য ও মঙ্গল গ্রহের পাথর',
    prod_5_benefit: 'আত্মবিশ্বাস এবং ব্যক্তিগত শক্তির বিকাশ ঘটায়',

    prod_6_name: 'নবগ্রহ পূজা কিট',
    prod_6_assoc: 'নয়টি গ্রহের দেবদেবীর সম্পূর্ণ পূজা কিট',
    prod_6_benefit: 'নবগ্রহের শান্তিস্থাপন এবং ভারসাম্য বিধান করে',
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

    // Hero Section
    hero_headline: 'உங்கள் நட்சத்திரங்கள். உங்கள் தர்மம்.',
    hero_headline_italic: 'உங்கள் பயணம்.',
    hero_hindi_eyebrow: '"உங்கள் வானத்தைப் புரிந்து கொள்ளுங்கள்"',
    hero_subhead: 'தனிப்பயனாக்கப்பட்ட வேத ஜோதிடம், நிபுணர் வழிகாட்டுதல், புத்திசாலித்தனமான நுண்ணறிவு மற்றும் காலமற்ற ஜோதிட ஞானம்.',
    hero_cta_kundli: 'இலவச ஜாதகம் பெறுக',
    hero_cta_consult: 'ஆச்சார்யாவை அணுகுங்கள்',
    hero_trust_acharyas: 'சரிபார்க்கப்பட்ட ஆச்சார்யாக்கள்',
    hero_trust_jyotish: 'தனிப்பயனாக்கப்பட்ட ஜோதிடம்',
    hero_trust_secure: 'தனிப்பட்ட மற்றும் பாதுகாப்பானது',
    hero_scroll_text: 'ஆராய கீழே உருட்டவும்',

    // Guidance Banner
    guidance_eyebrow: '✦ ஜோதிட வழிகாட்டுதல்',
    guidance_headline: 'பாதை தெளிவற்றதாகத் தோன்றும் போது,',
    guidance_headline_italic: 'நட்சத்திரங்களைப் பாருங்கள்.',
    guidance_desc: 'உங்கள் ஜாதகத்தை ஆராயுங்கள், கிரகங்களின் இயக்கங்களைப் புரிந்து கொள்ளுங்கள், உங்கள் வரைபடத்தில் எழுதப்பட்டுள்ள வழிகாட்டுதலைக் கண்டறியவும்.',
    guidance_cta_kundli: 'உங்கள் ஜாதகத்தை ஆராயுங்கள்',
    guidance_cta_consult: 'ஆச்சார்யாவை அணுகுங்கள்',

    // Seek Guidance Grid
    seek_eyebrow: 'ஜோதிட வழிகாட்டுதல்',
    seek_title: 'உங்கள் கேள்வி எங்கிருந்து தொடங்குகிறது?',
    seek_desc: 'உங்கள் ஜாதகத்தை உருவாக்க மற்றும் கிரகங்களின் அமைப்புகளை ஆராய ஒரு வாழ்க்கை பகுதியைத் தேர்ந்தெடுக்கவும்.',
    seek_card_marriage_title: 'அன்பு & திருமணம்',
    seek_card_marriage_desc: 'உறவு இணக்கம், செவ்வாய் தோஷம் மற்றும் திருமண நேரத்தைப் புரிந்து கொள்ளுங்கள்.',
    seek_card_career_title: 'தொழில் & வணிகம்',
    seek_card_career_desc: 'சாதகமான தொழில்கள், தலைமைத்துவ வாய்ப்புகள் மற்றும் வெற்றிக்கான காலம்.',
    seek_card_money_title: 'பணம் & வளம்',
    seek_card_money_desc: 'நிதி யோகங்கள், செல்வம் சேரும் காலங்கள் மற்றும் பரிகார வழிகள்.',
    seek_card_family_title: 'குடும்பம் & பாரம்பரியம்',
    seek_card_family_desc: 'முன்னோர்களின் கர்மா, குடும்ப ஒற்றுமை மற்றும் வம்சாவளி சந்ததி அட்டவணைகள்.',
    seek_card_growth_title: 'தனிநபர் வளர்ச்சி',
    seek_card_growth_desc: 'குணநலன் பலம், தடைகள் மற்றும் ஆன்மீகப் பாதையைக் கண்டறியவும்.',
    seek_card_spirituality_title: 'ஆன்மீகம்',
    seek_card_spirituality_desc: 'முத்தி காலம், தியான ஈடுபாடு மற்றும் ஆன்மீக சீரமைப்பு.',
    seek_card_vastu_title: 'வாஸ்து சாஸ்திரம்',
    seek_card_vastu_desc: 'திசை ஆற்றல்கள், ஐம்பூதங்களின் அமைவிடம் மற்றும் இல்ல கட்டிட இணக்கம்.',
    seek_card_cta: 'அமைப்பை ஆராய்க →',

    btn_add_to_cart: 'இப்போது வாங்குங்கள்',
    btn_enroll: 'இப்போதே சேருங்கள்',
    btn_view_details: 'விவரங்களை காண்க',

    cat_gemstones: 'நவரத்தினங்கள்',
    cat_rudraksha: 'ருத்ராட்சம்',
    cat_crystals: 'படிகங்கள்',
    cat_bracelets: 'மாலை & வளையல்கள்',
    cat_yantras: 'யந்திரங்கள்',
    cat_puja_essentials: 'பூஜை பொருட்கள்',
    cat_all: 'அனைத்து பரிகாரங்கள்',

    report_1_title: 'தொழில் நுண்ணறிவு',
    report_1_sub: 'உங்கள் தொழில் முறை பாதை, கணிக்கப்பட்டது',
    report_1_desc: 'உங்கள் 10 ஆம் வீடு, தொழில் கிரகங்கள் மற்றும் தகுந்த வேலை மாற்றங்களை அறியும் விரிவான அறிக்கை.',

    report_2_title: 'காதல் & உறவுகள்',
    report_2_sub: 'உங்கள் இதயத்தின் வரைபடத்தை அறியுங்கள்',
    report_2_desc: 'சுக்கிரன் அமைவிடம், 7 ஆம் வீடு மற்றும் உறவு இணக்கம் பற்றிய வாசிப்பு.',

    report_3_title: 'திருமண அறிக்கை',
    report_3_sub: 'காலம் மற்றும் பொருத்தம்',
    report_3_desc: 'நவாம்ச ஜாதகம், செவ்வாய் தோஷம் மற்றும் திருமண கால கணிப்புகள் அடங்கிய திருமண அறிக்கை.',

    report_4_title: 'பிரீமியம் ஜாதகம்',
    report_4_sub: 'உங்கள் முழு கிரக வரைபடம்',
    report_4_desc: '16 வர்க்க சக்கரங்கள் மற்றும் விரிவான கிரக விளக்கங்கள் கொண்ட முழு ஜாதக அறிக்கை.',

    report_5_title: 'செல்வம் & யோகம்',
    report_5_sub: 'உங்கள் நிதிநிலை வரைபடம்',
    report_5_desc: '2 மற்றும் 11 ஆம் வீடுகள், தன யோகம் மற்றும் செல்வ கணிப்புகள்.',

    report_6_title: 'ஆன்மாவின் நோக்கம்',
    report_6_sub: 'உங்கள் தர்ம வழியைக் கண்டறியுங்கள்',
    report_6_desc: '9 ஆம் வீடு, தர்ம கிரகங்கள் மற்றும் உங்கள் ஆன்மாவின் நோக்கம் பற்றிய ஆழமான அலசல்.',

    report_7_title: 'வருடாந்திர ஜாதகம்',
    report_7_sub: 'வருட கிரக கணிப்புகள்',
    report_7_desc: 'அடுத்த 12 மாதங்களுக்கான தசா புத்தி மற்றும் கோச்சார கணிப்புகள்.',

    course_1_title: 'வேத ஜோதிடம் — முழுமையான பயிற்சி',
    course_1_sub: 'அடிப்படை ஜாதகம் முதல் பலன் ஜோதிடம் வரை',
    course_2_title: 'எண்கணித ஆற்றல்',
    course_2_sub: 'எண்களின் ரகசிய மொழியை அறியுங்கள்',
    course_3_title: 'ஆரம்ப நிலையினருக்கான டாரோட்',
    course_3_sub: 'கார்டுகள் மூலம் உங்கள் பாதையை அறியுங்கள்',
    course_4_title: 'வாஸ்து சாஸ்திர அடிப்படைகள்',
    course_4_sub: 'உங்கள் வாஸ்துவை சீரமைக்கவும்',

    prod_1_name: 'இயற்கை கொலம்பிய மரகதம்',
    prod_1_assoc: 'புத பகவானுக்குரிய கல்',
    prod_1_benefit: 'தெளிவான சிந்தனை, பேச்சுத்திறன் மற்றும் அறிவு வளர்ச்சி',

    prod_2_name: 'ஐந்து முக ருத்ராட்சம்',
    prod_2_assoc: 'சிவபெருமானுக்குரியது',
    prod_2_benefit: 'ஆன்மீக பாதுகாப்பு மற்றும் மன அமைதி',

    prod_3_name: 'ரோஸ் குவார்ட்ஸ் படிகம்',
    prod_3_assoc: 'சுக்கிரனின் ஆற்றல் கொண்ட கல்',
    prod_3_benefit: 'உறவுகளில் இணக்கமும் அன்பும் வளர்க்கும்',

    prod_4_name: 'ஸ்ரீ யந்திரம் (பித்தளை)',
    prod_4_assoc: 'பிரபஞ்சத்தின் புனித வடிவியல் வடிவம்',
    prod_4_benefit: 'செல்வ வளம் மற்றும் ஆன்மீக வளர்ச்சி',

    prod_5_name: 'புலி கண் வளையல்',
    prod_5_assoc: 'சூரியன் மற்றும் செவ்வாய் ஆற்றல் கொண்டது',
    prod_5_benefit: 'நம்பிக்கை மற்றும் தனிநபர் ஆற்றலைத் தரும்',

    prod_6_name: 'நவக்கிரக பூஜை கிட்',
    prod_6_assoc: 'ஒன்பது கிரகங்களின் வழிபாட்டு பொருட்கள்',
    prod_6_benefit: 'கிரக தோஷ நிவர்த்தி மற்றும் அமைதி',
  },
  te: {
    nav_astrology: 'జ్యోతిష్యం',
    nav_kundli: 'జాతకం',
    nav_calculators: 'క్యాలిక్యులేటర్లు',
    nav_reports: 'নিవేదికలు',
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

    // Hero Section
    hero_headline: 'మీ నక్షత్రాలు. మీ ధర్మం.',
    hero_headline_italic: 'మీ ప్రయాణం.',
    hero_hindi_eyebrow: '"మీ ఆకాశాన్ని అర్థం చేసుకోండి"',
    hero_subhead: 'వ్యక్తిగతీకరించిన వైదిక జ్యోతిష్యం, నిపుణుల మార్గదర్శకత్వం, మేధోపరమైన అంతర్దృష్టులు మరియు శాశ్వత జ్యోతిష్య జ్ఞానం.',
    hero_cta_kundli: 'ఉచిత జాతకం పొందండి',
    hero_cta_consult: 'ఆచార్యులను సంప్రదించండి',
    hero_trust_acharyas: 'ధృవీకరించబడిన ఆచార్యులు',
    hero_trust_jyotish: 'వ్యక్తిగతీకరించిన జ్యోతిష్యం',
    hero_trust_secure: 'వ్యక్తిగత & సురక్షితం',
    hero_scroll_text: 'అన్వేషించడానికి స్క్రోల్ చేయండి',

    // Guidance Banner
    guidance_eyebrow: '✦ జ్యోతిష్య మార్గదర్శకత్వం',
    guidance_headline: 'మార్గం అస్పష్టంగా అనిపించినప్పుడు,',
    guidance_headline_italic: 'నక్షత్రాల వైపు చూడండి.',
    guidance_desc: 'మీ జాతకాన్ని అన్వేషించండి, గ్రహాల గమనాన్ని అర్థం చేసుకోండి మరియు మీ ఖగోళ పటంలో వ్రాయబడిన మార్గదర్శకత్వాన్ని కనుగొనండి.',
    guidance_cta_kundli: 'మీ జాతకాన్ని అన్వేషించండి',
    guidance_cta_consult: 'ఆచార్యులను సంప్రదించండి',

    // Seek Guidance Grid
    seek_eyebrow: 'జ్యోతిష్య మార్గదర్శకత్వం',
    seek_title: 'మీ ప్రశ్న ఎక్కడ ప్రారంభమవుతుంది?',
    seek_desc: 'మీ జన్మ జాతకాన్ని రూపొందించడానికి మరియు గ్రహాల గమనాన్ని అన్వేషించడానికి జీవిత రంగాన్ని ఎంచుకోండి.',
    seek_card_marriage_title: 'ప్రేమ & వివాహం',
    seek_card_marriage_desc: 'సంబంధాల అనుకూలత, కుజ దోషం మరియు వివాహ సమయాన్ని అర్థం చేసుకోండి.',
    seek_card_career_title: 'ఉద్యోగం & వ్యాపారం',
    seek_card_career_desc: 'అనుకూలమైన వృత్తులు, నాయకత్వ అవకాశాలు మరియు విజయవంతమైన సమయం.',
    seek_card_money_title: 'ధనం & శ్రేయస్సు',
    seek_card_money_desc: 'ధన యోగాలు, సంపద చేకూరే కాలాలు మరియు పరిహార మార్గాలు.',
    seek_card_family_title: 'కుటుంబం & వారసత్వం',
    seek_card_family_desc: 'పితృదేవతల కర్మ, కుటుంబ సామరస్యం మరియు సంతాన జాతక చక్రాలు.',
    seek_card_growth_title: 'వ్యక్తిగత ఎదుగుదల',
    seek_card_growth_desc: 'వ్యక్తిత్వ బలాలు, అడ్డంకులు మరియు ఆధ్యాత్మిక మార్గాన్ని గుర్తించండి.',
    seek_card_spirituality_title: 'ఆధ్యాత్మికత',
    seek_card_spirituality_desc: 'మోక్ష సమయాలు, ధ్యాన ఆసక్తి మరియు ఆధ్యాత్మిక గమనం.',
    seek_card_vastu_title: 'వాస్తు శాస్త్రం',
    seek_card_vastu_desc: 'దిశల శక్తులు, పంచభూతాల అమరిక మరియు గృహ నిర్మాణ సామరస్యం.',
    seek_card_cta: 'స్థాన విశ్లేషణ →',

    btn_add_to_cart: 'ఇప్పుడే కొనండి',
    btn_enroll: 'ఇప్పుడే చేరండి',
    btn_view_details: 'వివరాలు చూడండి',

    cat_gemstones: 'రత్నాలు',
    cat_rudraksha: 'రుద్రాక్షలు',
    cat_crystals: 'స్ఫటికాలు',
    cat_bracelets: 'మాలలు & బ్రాస్లెట్లు',
    cat_yantras: 'యంత్రాలు',
    cat_puja_essentials: 'పూజ వస్తువులు',
    cat_all: 'అన్ని పరిహారాలు',

    report_1_title: 'కెరీర్ ఇంటెలిజెన్స్',
    report_1_sub: 'మీ వృత్తిపరమైన మార్గం',
    report_1_desc: 'మీ 10వ స్థానం, కెరీర్ గ్రహాలు మరియు అనుకూలమైన ఉద్యోగ మార్పుల విశ్లేషణ.',

    report_2_title: 'ప్రేమ & సంబంధాలు',
    report_2_sub: 'మీ హృదయ పటం',
    report_2_desc: 'శుక్రుడి స్థానం, 7వ స్థానం మరియు సంబంధాల అనుకూలత గురించిన జాతక నివేదిక.',

    report_3_title: 'వివాహ నివేదిక',
    report_3_sub: 'సమయం మరియు అనుకూలత',
    report_3_desc: 'నవాంశ చక్రం, కుజ దోషం మరియు వివాహ సమయం గురించిన విశ్లేషణ.',

    report_4_title: 'ప్రీమియం జాతకం',
    report_4_sub: 'సంపూర్ణ ఖగోళ చిత్రం',
    report_4_desc: '16 వర్గ చక్రాలు మరియు గ్రహాల సంపూర్ణ వివరణలతో కూడిన సమగ్ర జాతక నివేదిక.',

    report_5_title: 'సంపద & యోగం',
    report_5_sub: 'మీ ఆర్థిక ఖగోళ పటం',
    report_5_desc: '2 మరియు 11వ స్థానాలు, ధన యోగాలు మరియు ఆర్థిక అభివృద్ధి కాలాలు.',

    report_6_title: 'ఆత్మ ఉద్దేశం',
    report_6_sub: 'మీ ధర్మ మార్గాన్ని కనుగొనండి',
    report_6_desc: '9వ స్థానం, ధర్మ గ్రహాలు మరియు మీ జన్మ ఉద్దేశం గురించిన లోతైన విశ్లేషణ.',

    report_7_title: 'ఆగామి సంవత్సరం',
    report_7_sub: 'వార్షిక ఫలితాలు',
    report_7_desc: 'రాబోయే 12 నెలల గ్రహాల గోచారం మరియు దశా కాలాల ఆధారంగా నెలవారీ ఫలితాలు.',

    course_1_title: 'వైదిక జ్యోతిష్యం — సంపూర్ణ కోర్సు',
    course_1_sub: 'జన్మ జాతకం విశ్లేషణ నుండి భవిష్యత్ ఫలితాల వరకు',
    course_2_title: 'సంఖ్యాశాస్త్ర నిపుణత',
    course_2_sub: 'సంఖ్యల రహస్య భాషను తెలుసుకోండి',
    course_3_title: 'ప్రారంభకులకు టారో రీడింగ్',
    course_3_sub: 'టారో కార్డుల ద్వారా మార్గదర్శకత్వం',
    course_4_title: 'వాస్తు శాస్త్ర ప్రాథమిక సూత్రాలు',
    course_4_sub: 'మీ గృహంలో వాస్తు సమతుల్యత సాధించండి',

    prod_1_name: 'సహజ కొలంబియన్ పచ్చ',
    prod_1_assoc: 'బుధ గ్రహానికి సంబంధించినది',
    prod_1_benefit: 'స్పష్టమైన ఆలోచనలు, సంభాషణ నైపుణ్యం మరియు బుద్ధి వికాసం',

    prod_2_name: 'పంచముఖి రుద్రాక్ష',
    prod_2_assoc: 'శివునికి అత్యంత ప్రీతిపాత్రమైనది',
    prod_2_benefit: 'ఆధ్యాత్మిక రక్షణ మరియు మనశ్శాంతిని చేకూరుస్తుంది',

    prod_3_name: 'రోజ్ క్వార్ట్జ్ క్రిస్టల్',
    prod_3_assoc: 'శుక్రుడి శక్తి కలిగిన రాయి',
    prod_3_benefit: 'సంబంధాలలో ప్రేమానురాగాలు మరియు సామరస్యం',

    prod_4_name: 'శ్రీ యంత్రం (ఇత్తడి)',
    prod_4_assoc: 'విశ్వం యొక్క పవిత్ర రేఖాగణిత రూపం',
    prod_4_benefit: 'ఐశ్వర్యం మరియు ఆధ్యాత్మిక అభివృద్ధిని చేకూరుస్తుంది',

    prod_5_name: 'టైగర్ ఐ బ్రాస్లెట్',
    prod_5_assoc: 'సూర్యుడు మరియు కుజ గ్రహాల శక్తి కలిగినది',
    prod_5_benefit: 'ఆత్మవిశ్వాసం మరియు వ్యక్తిగత శక్తిని ఇస్తుంది',

    prod_6_name: 'నవగ్రహ పూజ కిట్',
    prod_6_assoc: 'తొమ్మిది గ్రహాల దేవతల పూజ సామగ్రి',
    prod_6_benefit: 'గ్రహ దోషాల నివారణ మరియు మనశ్శాంతి',
  }
};
const defaultProfile: BirthProfile = {
  name: 'Sparsh',
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
  const [concern, setConcernState] = useState<Concern>(() => {
    return (window.history.state && window.history.state.concern) || null;
  });
  const [kundliGenerated, setKundliGeneratedState] = useState<boolean>(() => {
    return localStorage.getItem('kundliGenerated') === 'true';
  });
  const [astrologerFilter, setAstrologerFilter] = useState('All');

  // Navigation & Cart States
  const [page, setPageState] = useState(() => {
    return (window.history.state && window.history.state.page) || 'home';
  });
  const [selectedId, setSelectedIdState] = useState<number | string | null>(() => {
    return (window.history.state && window.history.state.selectedId) || null;
  });
  const [cart, setCart] = useState<CartItem[]>([]);

  const setPage = (p: string) => {
    setPageState(p);
  };
  const setSelectedId = (id: number | string | null) => {
    setSelectedIdState(id);
  };
  const setConcern = (c: Concern) => {
    setConcernState(c);
  };

  const isPopStateRef = React.useRef(false);

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      isPopStateRef.current = true;
      if (state && typeof state.page === 'string') {
        setPageState(state.page);
        setSelectedIdState(state.selectedId ?? null);
        setConcernState(state.concern ?? null);
      } else {
        setPageState('home');
        setSelectedIdState(null);
        setConcernState(null);
      }
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state) {
      window.history.replaceState({ page, selectedId, concern }, '', '');
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  React.useEffect(() => {
    if (isPopStateRef.current) return;

    const currentHistoryState = window.history.state;
    if (
      currentHistoryState &&
      currentHistoryState.page === page &&
      currentHistoryState.selectedId === selectedId &&
      currentHistoryState.concern === concern
    ) {
      return;
    }

    window.history.pushState({ page, selectedId, concern }, '', '');
  }, [page, selectedId, concern]);

  // Theme State — DEFAULT IS LIGHT
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Auth State (mock prototype)
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    const saved = localStorage.getItem('isLoggedIn');
    return saved === null ? true : saved === 'true';
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

