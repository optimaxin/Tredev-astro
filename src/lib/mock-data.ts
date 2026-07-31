export type Astrologer = {
  id: string;
  slug: string;
  name: string;
  tier: "Maharishi" | "Acharya" | "Pandit" | "Vidyarthi";
  experience: number;
  languages: string[];
  specialties: string[];
  rating: number;
  reviews: number;
  price: number;
  online: boolean;
  consultations: string;
  initials: string;
  city?: string;
  gender?: "Male" | "Female";
  bio?: string;
  education?: string[];
  awards?: string[];
  gurukul?: string;
};

export const astrologers: Astrologer[] = [
  {
    id: "1",
    slug: "pt-rajesh-sharma",
    name: "Pt. Rajesh Sharma",
    tier: "Maharishi",
    experience: 15,
    languages: ["Hindi", "English", "Punjabi"],
    specialties: ["Marriage", "Career", "Love"],
    rating: 4.9,
    reviews: 2345,
    price: 25,
    online: true,
    consultations: "50,000+",
    initials: "RS",
    city: "Delhi",
    gender: "Male",
    gurukul: "Sanskrit Vidyapeeth, Varanasi",
    bio: "Pt. Rajesh Sharma comes from a seventh-generation Vedic lineage and has spent over 15 years combining traditional Jyotish with practical, modern guidance. He specializes in marriage timing and career transitions.",
    education: ["Jyotish Acharya — Banaras Hindu University", "Vedanta Visharad — Sanskrit University"],
    awards: ["Jyotish Ratna 2024, Times of India", "Best Astrologer of the Year 2023"],
  },
  {
    id: "2",
    slug: "dr-anjali-gupta",
    name: "Dr. Anjali Gupta",
    tier: "Maharishi",
    experience: 12,
    languages: ["Hindi", "English"],
    specialties: ["Love", "Health", "Finance"],
    rating: 4.8,
    reviews: 1890,
    price: 30,
    online: true,
    consultations: "38,000+",
    initials: "AG",
    city: "Mumbai",
    gender: "Female",
    gurukul: "Sri Aurobindo Institute of Vedic Studies",
    bio: "Dr. Anjali Gupta blends medical astrology with classical remedial measures, helping clients navigate health concerns, relationship compatibility, and long-term financial planning through a Vedic lens.",
    education: ["PhD in Jyotish Shastra — Sanskrit University, Mumbai", "Certified Medical Astrologer, ICAS"],
    awards: ["Rising Star in Vedic Sciences 2022"],
  },
  {
    id: "3",
    slug: "acharya-vikram",
    name: "Acharya Vikram Joshi",
    tier: "Acharya",
    experience: 11,
    languages: ["Hindi", "Marathi", "English"],
    specialties: ["Vastu", "Business", "Finance"],
    rating: 4.8,
    reviews: 1456,
    price: 20,
    online: false,
    consultations: "29,000+",
    initials: "VJ",
    city: "Pune",
    gender: "Male",
    gurukul: "Bharatiya Vastu Shastra Sansthan",
    bio: "Acharya Vikram Joshi is a Vastu and business astrology specialist, advising founders and family businesses on auspicious timing, office layout, and expansion decisions.",
    education: ["Vastu Shastra Visharad — Pune University", "Jyotish Praveen — ICAS"],
    awards: ["Vastu Excellence Award 2021"],
  },
  {
    id: "4",
    slug: "priya-nair",
    name: "Priya Nair",
    tier: "Acharya",
    experience: 9,
    languages: ["Malayalam", "Tamil", "English"],
    specialties: ["Marriage", "Family", "Spiritual"],
    rating: 4.7,
    reviews: 987,
    price: 18,
    online: true,
    consultations: "21,000+",
    initials: "PN",
    city: "Kochi",
    gender: "Female",
    gurukul: "Kerala Jyotisha Vidyapeetham",
    bio: "Priya Nair focuses on family harmony, Kundli matching, and spiritual guidance rooted in South Indian astrological tradition, with a gentle, listening-first consultation style.",
    education: ["Jyotish Visharad — Kerala Jyotisha Vidyapeetham"],
    awards: [],
  },
  {
    id: "5",
    slug: "swami-devendra",
    name: "Swami Devendra Ji",
    tier: "Maharishi",
    experience: 22,
    languages: ["Hindi", "Sanskrit", "English"],
    specialties: ["Spiritual", "Mantra", "Vastu"],
    rating: 5.0,
    reviews: 3120,
    price: 40,
    online: false,
    consultations: "70,000+",
    initials: "SD",
    city: "Varanasi",
    gender: "Male",
    gurukul: "Kashi Vidwat Parishad",
    bio: "Swami Devendra Ji is one of the platform's most senior Maharishi-tier gurus, trained in the Kashi tradition, offering mantra sadhana guidance alongside classical Jyotish consultations.",
    education: ["Acharya, Sanskrit & Jyotish — Kashi Vidwat Parishad"],
    awards: ["Lifetime Contribution to Vedic Sciences 2020"],
  },
  {
    id: "6",
    slug: "meera-iyer",
    name: "Meera Iyer",
    tier: "Pandit",
    experience: 7,
    languages: ["Tamil", "English", "Hindi"],
    specialties: ["Love", "Career", "Numerology"],
    rating: 4.6,
    reviews: 612,
    price: 15,
    online: true,
    consultations: "14,000+",
    initials: "MI",
    city: "Chennai",
    gender: "Female",
    gurukul: "Chennai School of Vedic Astrology",
    bio: "Meera Iyer pairs numerology with birth chart analysis to give young professionals clarity on career pivots and relationship timing.",
    education: ["Jyotish Praveshika — Chennai School of Vedic Astrology"],
    awards: [],
  },
  {
    id: "7",
    slug: "arjun-mehta",
    name: "Arjun Mehta",
    tier: "Pandit",
    experience: 6,
    languages: ["Hindi", "English", "Gujarati"],
    specialties: ["Finance", "Business", "Foreign Settlement"],
    rating: 4.6,
    reviews: 540,
    price: 16,
    online: true,
    consultations: "11,000+",
    initials: "AM",
    city: "Ahmedabad",
    gender: "Male",
    gurukul: "Gujarat Jyotish Mandal",
    bio: "Arjun Mehta specializes in financial astrology and visa/settlement timing for clients pursuing opportunities abroad.",
    education: ["Jyotish Praveen — Gujarat Jyotish Mandal"],
    awards: [],
  },
  {
    id: "8",
    slug: "ritu-singh",
    name: "Ritu Singh",
    tier: "Vidyarthi",
    experience: 3,
    languages: ["Hindi", "English"],
    specialties: ["Love", "Tarot", "Spiritual"],
    rating: 4.5,
    reviews: 214,
    price: 12,
    online: true,
    consultations: "3,800+",
    initials: "RS",
    city: "Jaipur",
    gender: "Female",
    gurukul: "Jaipur Institute of Astro Sciences",
    bio: "Ritu Singh is a rising Vidyarthi-tier guide combining tarot with foundational Vedic principles for approachable, conversational readings.",
    education: ["Jyotish Foundation Certificate — Jaipur Institute of Astro Sciences"],
    awards: [],
  },
];

export const categories = [
  {
    icon: "heart",
    title: "Love & Relationships",
    description: "Find your soulmate, resolve conflicts, understand compatibility",
    gradient: "from-[#7a1f2b] to-[#a6321f]",
    href: "/talk-to-astrologer/love-relationship",
  },
  {
    icon: "briefcase",
    title: "Career & Success",
    description: "Job change timing, business growth, promotion predictions",
    gradient: "from-[#3d2b1a] to-[#c9a962]",
    href: "/talk-to-astrologer/career",
  },
  {
    icon: "coins",
    title: "Finance & Wealth",
    description: "Investment timing, debt solutions, property decisions",
    gradient: "from-[#1f3d2b] to-[#4a7c59]",
    href: "/talk-to-astrologer/finance",
  },
  {
    icon: "gem",
    title: "Marriage & Family",
    description: "Marriage timing, Kundli matching, family harmony",
    gradient: "from-[#b3691c] to-[#d4af37]",
    href: "/talk-to-astrologer/marriage",
  },
  {
    icon: "heart-pulse",
    title: "Health & Wellness",
    description: "Health predictions, Ayurvedic remedies, mental peace",
    gradient: "from-[#8a4a1f] to-[#c98a1c]",
    href: "/talk-to-astrologer/health",
  },
  {
    icon: "plane",
    title: "Foreign Settlement",
    description: "Visa approval, abroad opportunities, settlement chances",
    gradient: "from-[#1a3d3d] to-[#2f6b6b]",
    href: "/talk-to-astrologer/foreign-settlement",
  },
];

export const stats = [
  { icon: "phone", value: 25_000_000, suffix: "+", label: "Minutes Consulted" },
  { icon: "users", value: 2_000_000, suffix: "+", label: "Happy Customers" },
  { icon: "award", value: 5_000, suffix: "+", label: "Verified Astrologers" },
  { icon: "globe", value: 11, suffix: "+", label: "Languages Supported" },
  { icon: "calendar", value: 25, suffix: "+", label: "Years of Trust" },
];

export const whyChooseUs = [
  {
    icon: "shield-check",
    title: "100% Verified Astrologers",
    description:
      "Every astrologer undergoes rigorous background verification, document checks, and sample consultation review.",
  },
  {
    icon: "clock",
    title: "24/7 Availability",
    description: "Connect with astrologers anytime, anywhere. Day or night, festival or weekday.",
  },
  {
    icon: "message-circle",
    title: "Multiple Languages",
    description: "Consult in Hindi, English, Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali & more.",
  },
  {
    icon: "lock",
    title: "100% Confidential",
    description: "Your consultations and personal information are encrypted and never shared.",
  },
  {
    icon: "refresh-cw",
    title: "Satisfaction Guaranteed",
    description: "Not happy with your consultation? Get a full refund within 24 hours.",
  },
  {
    icon: "zap",
    title: "Instant Connection",
    description: "No appointments needed. Connect in under 60 seconds. First 3 minutes FREE.",
  },
];

export const freeTools = [
  { icon: "chart", name: "Free Kundli", description: "Generate your birth chart instantly", href: "/free-kundli" },
  { icon: "heart", name: "Kundli Matching", description: "Check marriage compatibility", href: "/kundli-matching" },
  { icon: "sun", name: "Daily Horoscope", description: "Know what stars say today", href: "/horoscope/daily" },
  { icon: "moon", name: "Nakshatra Finder", description: "Find your birth star", href: "/nakshatra-finder" },
  { icon: "calculator", name: "Numerology", description: "Discover your life path number", href: "/numerology-calculator" },
  { icon: "cards", name: "Tarot Reading", description: "Free 3-card spread reading", href: "/tarot-reading" },
  { icon: "calendar", name: "Panchang Today", description: "Tithi, Nakshatra, Muhurat", href: "/panchang" },
  { icon: "alert", name: "Mangal Dosha", description: "Check Mars affliction", href: "/mangal-dosha-calculator" },
];

export const testimonials = [
  {
    name: "Priya S.",
    city: "Mumbai",
    rating: 5,
    quote: "Pt. Sharma predicted my marriage timing exactly. Forever grateful for the guidance.",
    consultationType: "Premium Kundli",
  },
  {
    name: "Rahul K.",
    city: "Delhi",
    rating: 5,
    quote: "Accurate career predictions helped me make the right job change at the right time.",
    consultationType: "Voice Call",
  },
  {
    name: "Ananya R.",
    city: "Bengaluru",
    rating: 5,
    quote: "The Kundli matching report saved us from a difficult match. So detailed and clear.",
    consultationType: "Kundli Matching",
  },
];

export const blogPosts = [
  {
    slug: "understanding-12-houses",
    category: "Astrology Basics",
    title: "Understanding the 12 Houses of Your Kundli",
    excerpt: "Each house represents a different aspect of life, from career to relationships...",
    author: "Pt. Rajesh Sharma",
    readTime: "8 min read",
    href: "/blog/understanding-12-houses",
    date: "July 12, 2026",
    content: [
      "In Vedic astrology, your birth chart is divided into twelve houses, each governing a distinct area of your life — from identity and appearance in the 1st house to career and public standing in the 10th.",
      "The houses work alongside the planets and signs to build a complete picture. A strong planet in a weak house may express differently than the same planet in a strong one, which is why a full reading looks at the chart as a system, not isolated placements.",
      "For beginners, it helps to start with the four angular houses — the 1st, 4th, 7th, and 10th — since these tend to have the strongest influence on visible life events like career changes, marriage, and home life.",
      "Understanding your houses is the foundation for reading any deeper prediction, whether it's about timing (dasha), compatibility (Kundli matching), or remedial measures.",
    ],
  },
  {
    slug: "gemstones-guide",
    category: "Remedies",
    title: "5 Powerful Gemstones and Who Should Wear Them",
    excerpt: "Not every gemstone suits every chart. Here's how to know what's right for you...",
    author: "Dr. Anjali Gupta",
    readTime: "6 min read",
    href: "/blog/gemstones-guide",
    date: "July 8, 2026",
    content: [
      "Gemstone recommendations in Vedic astrology are never one-size-fits-all. The right stone depends on which planet needs strengthening in your specific chart, and wearing the wrong one can do more harm than good.",
      "Ruby (Manik) strengthens the Sun and is generally suited to those with a weak or afflicted Sun in the 1st, 9th, or 10th house. Yellow Sapphire (Pukhraj) strengthens Jupiter and is often recommended for marriage delays or financial stagnation.",
      "Before wearing any gemstone, it's worth getting a proper reading — not just a sun-sign lookup — since the same stone can help one person and cause discomfort in another depending on their full chart.",
      "We always recommend a short trial period of 3–7 days before committing to a gemstone long-term, and pairing it with the correct mantra and wearing ritual for full effect.",
    ],
  },
  {
    slug: "nadi-dosha-explained",
    category: "Marriage",
    title: "What is Nadi Dosha and How Does It Affect Marriage?",
    excerpt: "One of the most misunderstood doshas in Kundli matching, explained simply...",
    author: "Acharya Vikram Joshi",
    readTime: "5 min read",
    href: "/blog/nadi-dosha-explained",
    date: "June 30, 2026",
    content: [
      "Nadi is one of the eight categories (Ashtakoot) checked during Kundli matching, worth 8 of the total 36 points — making it the single most heavily weighted factor in Gun Milan.",
      "Nadi Dosha occurs when both partners share the same Nadi (Aadi, Madhya, or Antya), which traditionally raises concern about the health of future children and general compatibility.",
      "It's important to note that Nadi Dosha isn't automatically disqualifying — there are recognized exceptions (such as differing Rashi or Nakshatra) that can cancel the dosha, and traditional remedies exist for cases where it applies.",
      "Rather than treating a Nadi Dosha finding as a hard stop, we recommend a full consultation to check for cancellation factors before making any decision.",
    ],
  },
  {
    slug: "yearly-predictions-2026",
    category: "Horoscope",
    title: "2026 Yearly Predictions: What's in Store for Your Sign",
    excerpt: "A month-by-month breakdown of what the planets have planned this year...",
    author: "Priya Nair",
    readTime: "10 min read",
    href: "/blog/yearly-predictions-2026",
    date: "June 20, 2026",
    content: [
      "2026 brings several significant planetary shifts, including Saturn's continued transit and Jupiter's movement into a new sign mid-year — both of which will be felt differently across the twelve rashis.",
      "Fire signs (Aries, Leo, Sagittarius) can expect a career-focused year with opportunities for leadership roles, particularly in the second half of the year as Jupiter's aspect strengthens the 10th house for several signs.",
      "Earth signs (Taurus, Virgo, Capricorn) should pay attention to financial planning in Q1 and Q2, with a more stable outlook from August onward.",
      "For a personalized month-by-month breakdown based on your actual birth chart rather than sun sign alone, a full yearly prediction report is available through our Premium Kundli service.",
    ],
  },
];

export const fourPillars = [
  {
    icon: "scroll-text",
    title: "Vedic Wisdom",
    description: "Rooted in ancient texts — Vedas, Upanishads, and the Brihat Parashara Hora Shastra.",
    gradient: "from-[#b3691c] to-[#d4a745]",
  },
  {
    icon: "cpu",
    title: "Modern Technology",
    description: "AI-assisted chart analysis and real-time consultation, built on Swiss Ephemeris precision.",
    gradient: "from-[#4a148c] to-[#1a237e]",
  },
  {
    icon: "heart-handshake",
    title: "Divine Connectivity",
    description: "Direct access to authenticated Gurus and temple priests, verified by lineage.",
    gradient: "from-[#7a1f2b] to-[#c62828]",
  },
  {
    icon: "globe-2",
    title: "Global Family",
    description: "Vasudhaiva Kutumbakam — serving seekers across 15+ languages and 5 continents.",
    gradient: "from-[#0d47a1] to-[#2f6b6b]",
  },
];

export const navLanguages = [
  "Sanskrit", "Hindi", "English", "Tamil", "Telugu", "Kannada",
  "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Odia",
];

export const navTiers = [
  "Maharishi (15+ yrs)",
  "Acharya (10-15 yrs)",
  "Pandit (5-10 yrs)",
  "Vidyarthi (2-5 yrs)",
];

export const premiumServices = [
  { label: "Handwritten Kundli Report", href: "/premium-kundli/order" },
  { label: "Personal Video Analysis", href: "/premium-kundli/order" },
  { label: "Gemstone Recommendation", href: "/gemstone-recommendation" },
  { label: "Pooja & Rituals Booking", href: "/live-pooja" },
  { label: "Vastu Consultation", href: "/vastu" },
  { label: "Personal Astrologer", href: "/personal-astrologer" },
];

export const communityMenu = [
  { label: "Spiritual Discussions", href: "/community" },
  { label: "Ask the Gurus", href: "/community/ask" },
  { label: "Success Stories", href: "/community/stories" },
  { label: "Daily Shlokas", href: "/community/shlokas" },
];

export const knowledgeMenu = [
  { label: "Astrology Basics", href: "/learn" },
  { label: "Learn Jyotish", href: "/learn/courses" },
  { label: "Blog", href: "/blog" },
  { label: "FAQ", href: "/faq" },
];

export const navSpecializations = [
  "Love/Relationship", "Marriage", "Career", "Finance", "Health",
  "Education", "Business", "Foreign Settlement", "Legal/Court", "Spiritual",
];

export const freeToolsMenu = {
  "Kundli Tools": ["Free Kundli", "Kundli Matching", "Birth Chart", "Nakshatra Finder"],
  "Horoscope": ["Daily Horoscope", "Weekly Horoscope", "Monthly Horoscope", "Yearly 2026"],
  "Dosha Calculators": ["Mangal Dosha", "Kaal Sarp Dosha", "Pitra Dosha", "Sade Sati"],
  "Numerology": ["Life Path Number", "Destiny Number", "Name Numerology", "Lucky Numbers"],
};

export const storeMenu = {
  Gemstones: ["Ruby", "Pearl", "Coral", "Emerald", "Yellow Sapphire", "Blue Sapphire"],
  Rudraksha: ["1 Mukhi", "2 Mukhi", "3 Mukhi", "5 Mukhi (Panch)", "Rudraksha Mala"],
  "Yantras & More": ["Shri Yantra", "Kuber Yantra", "Pooja Items", "Kavach & Bracelets"],
};

// ============================================
// SHOP / PRODUCTS
// ============================================

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviews: number;
  certified: boolean;
  energized: boolean;
  color: string;
  description: string;
  benefits: string[];
  howToWear: string;
  mantra: string;
};

export const productCategories = ["All", "Gemstones", "Rudraksha", "Yantras", "Pooja Items", "Kavach & Bracelets", "Books & Courses"];

export const products: Product[] = [
  {
    id: "p1",
    slug: "certified-ruby-manik",
    name: "Certified Natural Ruby (Manik) — 5.25 Ratti",
    category: "Gemstones",
    price: 2999,
    originalPrice: 5999,
    rating: 4.8,
    reviews: 234,
    certified: true,
    energized: true,
    color: "#c62828",
    description: "This natural Ruby (Manik) is sourced from Burma and represents the Sun in Vedic astrology. Wearing Ruby strengthens the Sun in your chart, bringing confidence, leadership, and success in government or politics.",
    benefits: ["Strengthens the Sun", "Boosts confidence and leadership", "Supports father-related relationships"],
    howToWear: "Gold or copper ring, ring finger of the right hand, Sunday morning between 5:30–7:30 AM.",
    mantra: "ॐ घृणि सूर्याय नमः (108 times)",
  },
  {
    id: "p2",
    slug: "yellow-sapphire-pukhraj",
    name: "Natural Yellow Sapphire (Pukhraj) — 6 Ratti",
    category: "Gemstones",
    price: 8499,
    originalPrice: 14999,
    rating: 4.9,
    reviews: 187,
    certified: true,
    energized: true,
    color: "#f9a825",
    description: "Yellow Sapphire strengthens Jupiter (Guru), the planet of wisdom, wealth, and marriage. Recommended for those seeking career growth, marital harmony, and spiritual clarity.",
    benefits: ["Strengthens Jupiter", "Supports marriage and finances", "Enhances wisdom and decision-making"],
    howToWear: "Gold ring, index finger of the right hand, Thursday morning.",
    mantra: "ॐ बृं बृहस्पतये नमः (108 times)",
  },
  {
    id: "p3",
    slug: "5-mukhi-rudraksha-mala",
    name: "5 Mukhi (Panch Mukhi) Rudraksha Mala — 108 Beads",
    category: "Rudraksha",
    price: 1299,
    originalPrice: 2199,
    rating: 4.7,
    reviews: 412,
    certified: true,
    energized: true,
    color: "#6b4226",
    description: "The 5 Mukhi Rudraksha is ruled by Lord Shiva and is the most commonly worn for peace of mind, focus, and general well-being. This mala is lab-certified and energized.",
    benefits: ["Calms the mind", "Improves focus and meditation", "General health and well-being"],
    howToWear: "Wear as a mala or bracelet after Monday morning cleansing ritual.",
    mantra: "ॐ नमः शिवाय",
  },
  {
    id: "p4",
    slug: "shri-yantra-brass",
    name: "Shri Yantra — Pure Brass, Energized",
    category: "Yantras",
    price: 899,
    originalPrice: 1499,
    rating: 4.6,
    reviews: 156,
    certified: false,
    energized: true,
    color: "#a8703a",
    description: "The Shri Yantra is one of the most powerful yantras for prosperity and abundance. This brass piece is energized through traditional Vedic rituals before shipping.",
    benefits: ["Attracts wealth and prosperity", "Removes financial obstacles", "Enhances positive energy at home"],
    howToWear: "Place facing east in the pooja room or main entrance.",
    mantra: "ॐ श्रीं ह्रीं क्लीं महालक्ष्म्यै नमः",
  },
  {
    id: "p5",
    slug: "kuber-yantra",
    name: "Kuber Yantra — Copper, Energized",
    category: "Yantras",
    price: 649,
    originalPrice: 999,
    rating: 4.5,
    reviews: 98,
    certified: false,
    energized: true,
    color: "#d4a745",
    description: "Dedicated to Kuber, the god of wealth, this copper yantra is recommended for business owners seeking financial stability and growth.",
    benefits: ["Supports business growth", "Attracts financial stability"],
    howToWear: "Place in the cash drawer or safe, facing north.",
    mantra: "ॐ यक्षाय कुबेराय वैश्रवणाय धनधान्याधिपतये नमः",
  },
  {
    id: "p6",
    slug: "navgrah-pooja-thali",
    name: "Navgrah Pooja Thali Set",
    category: "Pooja Items",
    price: 1199,
    originalPrice: 1799,
    rating: 4.7,
    reviews: 89,
    certified: false,
    energized: false,
    color: "#8b1538",
    description: "A complete pooja thali set for Navgrah (nine planets) worship, including diya, kumkum holder, incense stand, and bell.",
    benefits: ["Complete ritual set", "Handcrafted brass finish"],
    howToWear: "Use during weekly or festival pooja rituals.",
    mantra: "ॐ ग्रहाणाम् आदिराजाय नमः",
  },
  {
    id: "p7",
    slug: "zodiac-silver-bracelet",
    name: "Zodiac Silver Bracelet — Personalized",
    category: "Kavach & Bracelets",
    price: 1899,
    originalPrice: 2999,
    rating: 4.6,
    reviews: 143,
    certified: false,
    energized: true,
    color: "#b0bec5",
    description: "A sterling silver bracelet engraved with your zodiac sign and ruling planet symbol, energized for protection and positive planetary influence.",
    benefits: ["Personalized to your rashi", "Protective and auspicious"],
    howToWear: "Wear on the left wrist, any day after cleansing.",
    mantra: "ॐ ग्रह शांति मंत्र",
  },
  {
    id: "p8",
    slug: "vedic-astrology-beginners-book",
    name: "Vedic Astrology for Beginners — Illustrated Guide",
    category: "Books & Courses",
    price: 499,
    originalPrice: 799,
    rating: 4.8,
    reviews: 267,
    certified: false,
    energized: false,
    color: "#4a0e1b",
    description: "A beginner-friendly, illustrated introduction to Vedic astrology covering the 12 houses, 9 planets, and 27 nakshatras — written by our senior Acharya-tier gurus.",
    benefits: ["Beginner friendly", "Illustrated with charts", "Written by verified gurus"],
    howToWear: "N/A — physical/digital book.",
    mantra: "—",
  },
];

// ============================================
// COMMUNITY
// ============================================

export const communityPosts = [
  {
    id: "c1",
    title: "Is Saturn transit really as bad as everyone says?",
    category: "Question",
    author: "Anonymous Seeker",
    replies: 24,
    upvotes: 58,
    excerpt: "My Sade Sati just started and I'm nervous. Has anyone actually had a good experience with it?",
    isExpertAnswered: true,
  },
  {
    id: "c2",
    title: "My marriage was predicted 3 years in advance — sharing my story",
    category: "Success Story",
    author: "Kavita M.",
    replies: 41,
    upvotes: 132,
    excerpt: "In 2023 my astrologer told me marriage would happen within 3 years, in a specific month. It just happened exactly as predicted.",
    isExpertAnswered: false,
  },
  {
    id: "c3",
    title: "Daily Shloka: ॐ असतो मा सद्गमय",
    category: "Daily Shloka",
    author: "AstroTredev Team",
    replies: 9,
    upvotes: 76,
    excerpt: "Today's shloka is from the Brihadaranyaka Upanishad — a prayer for moving from untruth to truth, darkness to light.",
    isExpertAnswered: false,
  },
  {
    id: "c4",
    title: "What questions should I ask in my first consultation?",
    category: "Question",
    author: "FirstTimeUser22",
    replies: 17,
    upvotes: 33,
    excerpt: "Booking my first call tomorrow and want to make the most of the free 3 minutes. Any tips?",
    isExpertAnswered: true,
  },
];

// ============================================
// PRICING
// ============================================

export const pricingTiers = [
  {
    name: "Seeker",
    price: 0,
    period: "Free forever",
    description: "For exploring your chart and getting started.",
    features: ["Free Janam Kundli", "Daily horoscope", "1 free 3-minute trial call", "Community access"],
    cta: "Get Started Free",
    popular: false,
  },
  {
    name: "Devotee",
    price: 499,
    period: "/month",
    description: "For regular guidance and priority access.",
    features: [
      "Everything in Seeker",
      "20% off all consultations",
      "Priority queue for top Gurus",
      "Monthly personalized horoscope",
      "1 free premium Kundli report / year",
    ],
    cta: "Start as Devotee",
    popular: true,
  },
  {
    name: "Enterprise",
    price: null,
    period: "Custom",
    description: "For corporate astrology, teams, and bulk consultations.",
    features: [
      "Dedicated account Guru",
      "Corporate muhurat planning",
      "Team compatibility mapping",
      "Custom billing & invoicing",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

// ============================================
// FAQ
// ============================================

export const faqs = [
  {
    question: "How accurate are the predictions?",
    answer: "Accuracy depends on the precision of your birth details (date, time, and place). Our Gurus maintain a historically high accuracy rate, but astrology offers guidance and probability, not absolute certainty.",
  },
  {
    question: "What happens in the free 3-minute trial?",
    answer: "New users get 3 free minutes with any astrologer for voice or chat consultations. The timer starts when the astrologer joins, and billing begins automatically after the trial ends unless you disconnect.",
  },
  {
    question: "Is my birth data kept confidential?",
    answer: "Yes. Your birth details are encrypted at rest and in transit, and are only shared with the astrologer you actively consult. We never sell or share your data with third parties.",
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer: "Yes, we offer a full refund or a free follow-up session with a senior astrologer if you're not satisfied with your consultation, within 24 hours of the session.",
  },
  {
    question: "Do you support languages other than Hindi and English?",
    answer: "Yes — we support 11+ Indian languages including Tamil, Telugu, Kannada, Malayalam, Marathi, Bengali, Gujarati, Punjabi, and Odia, plus Sanskrit for traditional consultations.",
  },
  {
    question: "How is the Premium Kundli report delivered?",
    answer: "Digital access is available instantly in your account once ready (typically 5–7 days), with a physical handwritten copy shipped separately at no extra cost.",
  },
];

// ============================================
// TEAM (About page)
// ============================================

export const teamMembers = [
  { name: "Rohan Verma", role: "Founder & CEO", initials: "RV" },
  { name: "Dr. Anjali Gupta", role: "Head of Astrology", initials: "AG" },
  { name: "Sana Kapoor", role: "Head of Product", initials: "SK" },
  { name: "Pt. Rajesh Sharma", role: "Chief Astrologer", initials: "RS" },
];

export const companyValues = [
  { title: "Authenticity First", description: "Every Guru is verified for lineage, training, and track record before joining the platform." },
  { title: "Sacred Confidentiality", description: "Your birth details and consultations are treated with the same privacy as a medical record." },
  { title: "Accessible Wisdom", description: "Ancient Jyotish, priced and delivered for the modern seeker — no gatekeeping." },
  { title: "Radical Transparency", description: "Clear pricing, honest predictions, and no manufactured urgency." },
];

// ============================================
// HOROSCOPE / ZODIAC
// ============================================

export const zodiacSigns = [
  { sign: "Aries", symbol: "♈", dates: "Mar 21 – Apr 19" },
  { sign: "Taurus", symbol: "♉", dates: "Apr 20 – May 20" },
  { sign: "Gemini", symbol: "♊", dates: "May 21 – Jun 20" },
  { sign: "Cancer", symbol: "♋", dates: "Jun 21 – Jul 22" },
  { sign: "Leo", symbol: "♌", dates: "Jul 23 – Aug 22" },
  { sign: "Virgo", symbol: "♍", dates: "Aug 23 – Sep 22" },
  { sign: "Libra", symbol: "♎", dates: "Sep 23 – Oct 22" },
  { sign: "Scorpio", symbol: "♏", dates: "Oct 23 – Nov 21" },
  { sign: "Sagittarius", symbol: "♐", dates: "Nov 22 – Dec 21" },
  { sign: "Capricorn", symbol: "♑", dates: "Dec 22 – Jan 19" },
  { sign: "Aquarius", symbol: "♒", dates: "Jan 20 – Feb 18" },
  { sign: "Pisces", symbol: "♓", dates: "Feb 19 – Mar 20" },
];

export const horoscopeSections = [
  { icon: "heart", title: "Love & Relationships", content: "Venus brings warmth to your closest relationships today. Singles may meet someone interesting through a shared social circle; couples benefit from open conversation.", stars: 4 },
  { icon: "briefcase", title: "Career & Profession", content: "Mars energizes your professional house, giving you the confidence to take on a bold decision. A senior colleague notices your recent effort.", stars: 5 },
  { icon: "coins", title: "Money & Finance", content: "Financial matters remain stable. An older investment may show modest gains — avoid lending money impulsively today.", stars: 3 },
  { icon: "heart-pulse", title: "Health & Wellness", content: "Energy levels run high. A good day to start a new routine, though screen time in the evening may cause mild eye strain.", stars: 4 },
];

// ============================================
// KUNDLI MATCHING (Gun Milan)
// ============================================

export const gunMilanCategories = [
  { category: "Varna (Caste)", max: 1, earned: 1 },
  { category: "Vashya (Dominance)", max: 2, earned: 2 },
  { category: "Tara (Star)", max: 3, earned: 2 },
  { category: "Yoni (Nature)", max: 4, earned: 4 },
  { category: "Graha Maitri (Planetary Friendship)", max: 5, earned: 4 },
  { category: "Gana (Temperament)", max: 6, earned: 6 },
  { category: "Bhakoot (Health & Wealth)", max: 7, earned: 5 },
  { category: "Nadi (Pulse)", max: 8, earned: 4 },
];
