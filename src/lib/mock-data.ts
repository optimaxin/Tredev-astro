export type Astrologer = {
  id: string;
  slug: string;
  name: string;
  tier: "Platinum" | "Gold" | "Silver" | "Rising Star";
  experience: number;
  languages: string[];
  specialties: string[];
  rating: number;
  reviews: number;
  price: number;
  online: boolean;
  consultations: string;
  initials: string;
};

export const astrologers: Astrologer[] = [
  {
    id: "1",
    slug: "pt-rajesh-sharma",
    name: "Pt. Rajesh Sharma",
    tier: "Platinum",
    experience: 15,
    languages: ["Hindi", "English", "Punjabi"],
    specialties: ["Marriage", "Career", "Love"],
    rating: 4.9,
    reviews: 2345,
    price: 25,
    online: true,
    consultations: "50,000+",
    initials: "RS",
  },
  {
    id: "2",
    slug: "dr-anjali-gupta",
    name: "Dr. Anjali Gupta",
    tier: "Platinum",
    experience: 12,
    languages: ["Hindi", "English"],
    specialties: ["Love", "Health", "Finance"],
    rating: 4.8,
    reviews: 1890,
    price: 30,
    online: true,
    consultations: "38,000+",
    initials: "AG",
  },
  {
    id: "3",
    slug: "acharya-vikram",
    name: "Acharya Vikram Joshi",
    tier: "Gold",
    experience: 11,
    languages: ["Hindi", "Marathi", "English"],
    specialties: ["Vastu", "Business", "Finance"],
    rating: 4.8,
    reviews: 1456,
    price: 20,
    online: false,
    consultations: "29,000+",
    initials: "VJ",
  },
  {
    id: "4",
    slug: "priya-nair",
    name: "Priya Nair",
    tier: "Gold",
    experience: 9,
    languages: ["Malayalam", "Tamil", "English"],
    specialties: ["Marriage", "Family", "Spiritual"],
    rating: 4.7,
    reviews: 987,
    price: 18,
    online: true,
    consultations: "21,000+",
    initials: "PN",
  },
];

export const categories = [
  {
    icon: "💕",
    title: "Love & Relationships",
    description: "Find your soulmate, resolve conflicts, understand compatibility",
    gradient: "from-[#7a1f2b] to-[#a6321f]",
    href: "/talk-to-astrologer/love-relationship",
  },
  {
    icon: "💼",
    title: "Career & Success",
    description: "Job change timing, business growth, promotion predictions",
    gradient: "from-[#3d2b1a] to-[#c9a962]",
    href: "/talk-to-astrologer/career",
  },
  {
    icon: "💰",
    title: "Finance & Wealth",
    description: "Investment timing, debt solutions, property decisions",
    gradient: "from-[#1f3d2b] to-[#4a7c59]",
    href: "/talk-to-astrologer/finance",
  },
  {
    icon: "💍",
    title: "Marriage & Family",
    description: "Marriage timing, Kundli matching, family harmony",
    gradient: "from-[#b3691c] to-[#d4af37]",
    href: "/talk-to-astrologer/marriage",
  },
  {
    icon: "🏥",
    title: "Health & Wellness",
    description: "Health predictions, Ayurvedic remedies, mental peace",
    gradient: "from-[#8a4a1f] to-[#c98a1c]",
    href: "/talk-to-astrologer/health",
  },
  {
    icon: "🌍",
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
    category: "Astrology Basics",
    title: "Understanding the 12 Houses of Your Kundli",
    excerpt: "Each house represents a different aspect of life, from career to relationships...",
    author: "Pt. Rajesh Sharma",
    readTime: "8 min read",
    href: "/blog/understanding-12-houses",
  },
  {
    category: "Remedies",
    title: "5 Powerful Gemstones and Who Should Wear Them",
    excerpt: "Not every gemstone suits every chart. Here's how to know what's right for you...",
    author: "Dr. Anjali Gupta",
    readTime: "6 min read",
    href: "/blog/gemstones-guide",
  },
  {
    category: "Marriage",
    title: "What is Nadi Dosha and How Does It Affect Marriage?",
    excerpt: "One of the most misunderstood doshas in Kundli matching, explained simply...",
    author: "Acharya Vikram Joshi",
    readTime: "5 min read",
    href: "/blog/nadi-dosha-explained",
  },
  {
    category: "Horoscope",
    title: "2026 Yearly Predictions: What's in Store for Your Sign",
    excerpt: "A month-by-month breakdown of what the planets have planned this year...",
    author: "Priya Nair",
    readTime: "10 min read",
    href: "/blog/yearly-predictions-2026",
  },
];

export const navLanguages = [
  "Hindi", "English", "Tamil", "Telugu", "Kannada",
  "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi", "Odia",
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
