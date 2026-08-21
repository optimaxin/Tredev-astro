import { queryOne, withTransaction } from './db.ts';

// One-time idempotent seed for the journal/testimonials/report catalog
// content — same pattern as seedAstrologerCatalog.ts. After the first run,
// the DB is the source of truth; these arrays are only the initial content.

const BLOG_POSTS = [
  {
    title: 'What is Your Nakshatra? A Guide to the 27 Lunar Mansions',
    category: 'Learn', readTime: '8 min read', tag: 'Nakshatra', featured: true,
    excerpt: 'In Vedic astrology, the Nakshatra of your birth Moon reveals deep qualities of mind, temperament and destiny. Understanding yours is one of the most personal insights astrology can offer.',
    content: 'Vedic calculations rely on the sidereal zodiac where planetary positions align directly to the fixed constellations. Your Janma Nakshatra — the lunar mansion your Moon occupied at birth — is one of the most personal data points in your chart, shaping emotional temperament, instinctive reactions and even the syllables traditionally used to choose your name.\n\nEach of the 27 nakshatras spans exactly 13°20\' of the zodiac and is ruled by one of nine planets in a fixed repeating sequence — the same sequence that governs the Vimshottari Dasha system. Knowing your nakshatra and its ruling planet is the first step to understanding the larger planetary periods that structure your life.',
    publishedAt: Date.UTC(2026, 7, 10),
  },
  {
    title: 'Understanding Sade Sati: The Seven-and-a-Half Years of Saturn',
    category: 'Planets', readTime: '6 min read', tag: 'Saturn', featured: false,
    excerpt: 'Sade Sati is one of the most discussed periods in Vedic astrology. Here\'s what it actually means for your life, and how to navigate it with awareness.',
    content: 'Sade Sati refers to the roughly seven-and-a-half-year period when transiting Saturn moves through the 12th, 1st and 2nd houses counted from your natal Moon sign. Traditionally split into a rising phase, a peak phase, and a setting phase, it is associated with restructuring, discipline and long-term consequences of past choices — not misfortune by default.\n\nAcharyas suggest that how Sade Sati plays out depends heavily on Saturn\'s own dignity in your natal chart and the houses it activates. Awareness, patience and consistent effort during this transit are considered more useful than fear of it.',
    publishedAt: Date.UTC(2026, 7, 7),
  },
  {
    title: 'How Kundli Matching Works: Beyond the 36 Gunas',
    category: 'Marriage', readTime: '7 min read', tag: 'Marriage', featured: false,
    excerpt: 'Traditional Guna Milan is only one lens. A complete Kundli matching analysis considers Navamsha, Mangal Dosha, Dasha timing and more. Here\'s what to look for.',
    content: 'The classical Ashtakoota (36-guna) system scores compatibility across eight factors — Varna, Vashya, Tara, Yoni, Graha Maitri, Gana, Bhakoot and Nadi — derived from both partners\' Moon nakshatra and rashi. A high guna score is a useful signal, but a complete reading also checks each chart\'s Mangal Dosha status and the Dasha periods both partners will be running around the proposed marriage date.\n\nA thorough matching considers the couple\'s charts together, not just a numeric score in isolation — which is why most serious matching reports pair the Guna Milan calculation with an astrologer\'s reading of both full charts.',
    publishedAt: Date.UTC(2026, 7, 4),
  },
  {
    title: 'Career & Vedic Astrology: Reading the 10th House',
    category: 'Career', readTime: '9 min read', tag: 'Career', featured: false,
    excerpt: 'Your 10th house, its lord, and its planetary occupants reveal much about your professional dharma. This guide walks you through a practical career chart analysis.',
    content: 'The 10th house from the Ascendant governs career, status, authority and public reputation — but reading it well means looking at three things together: which planets occupy the 10th house, where the 10th house\'s ruling lord sits elsewhere in the chart, and which Dasha period is currently active.\n\nA strong 10th house alone does not guarantee career events happen on demand — timing usually comes from the interaction between that house and the Dasha/transit cycle. This is why career questions are best answered with a full chart in hand rather than a single placement.',
    publishedAt: Date.UTC(2026, 6, 30),
  },
  {
    title: 'What is Panchang? The Five Limbs of Vedic Time',
    category: 'Learn', readTime: '5 min read', tag: 'Daily Astrology', featured: false,
    excerpt: 'Panchang is the Vedic calendar system that organises time into five sacred elements. Understanding it transforms how you approach daily decisions and muhurtas.',
    content: 'Panchang literally means "five limbs" — Tithi (lunar day), Vara (weekday), Nakshatra (lunar mansion), Yoga (Sun-Moon angular combination) and Karana (half-tithi). Together they describe the quality of a given day far more precisely than the weekday alone.\n\nMuhurta selection — choosing an auspicious time for a wedding, a house-warming, or a business launch — is built entirely on Panchang elements, along with checking for inauspicious windows like Rahu Kaal. A daily Panchang reading is the practical, everyday application of the same astronomy that underlies the rest of Vedic astrology.',
    publishedAt: Date.UTC(2026, 6, 26),
  },
];

const TESTIMONIALS = [
  { name: 'Deepa Krishnan', location: 'Bangalore', service: 'Career Intelligence Report', rating: 5, avatar: 'DK',
    text: 'The Career Intelligence report was remarkably accurate. It described my professional situation so precisely that I had to pause and re-read several sections. The timing predictions for my job change proved surprisingly correct. This is demo content.' },
  { name: 'Rohit Mehta', location: 'Mumbai', service: 'Consultation with Astrologist Rahul', rating: 5, avatar: 'RM',
    text: 'I came in with questions about my business direction. The guidance was thoughtful, grounded in my chart details and not generic at all. It gave me a new way to think about my timing. This is placeholder demo content.' },
  { name: 'Sunita Patel', location: 'Ahmedabad', service: 'Marriage Report + Kundli Matching', rating: 5, avatar: 'SP',
    text: 'The Kundli matching report was detailed and sensitive. It didn\'t just look at Gunas — it considered personality compatibility, chart strength and potential challenges. Very thoughtful approach. Demo content.' },
  { name: 'Arjun Nambiar', location: 'Kochi', service: 'Ask TredevAstro (AI)', rating: 4, avatar: 'AN',
    text: 'The AI astrology feature gave surprisingly relevant answers about my current Mahadasha. I appreciated that it was honest about being chart-based guidance rather than making absolute predictions. Refreshing. Demo content.' },
  { name: 'Kavya Sharma', location: 'Jaipur', service: 'Premium Kundli Report', rating: 5, avatar: 'KS',
    text: 'The 120-page Kundli report is extraordinary. Every divisional chart was explained clearly. I\'ve had Kundli readings before but nothing at this depth. The design of the report itself is beautiful. This is demo content.' },
  { name: 'Vikrant Desai', location: 'Pune', service: 'Vedic Astrology Course', rating: 5, avatar: 'VD',
    text: 'The Vedic Astrology course is well-structured and genuinely educational. The instructor explains complex concepts in an accessible way. By week 4 I was reading my own chart with confidence. Excellent. Demo content.' },
];

const REPORTS = [
  { title: 'Career Intelligence', subtitle: 'Your professional path, decoded', category: 'Career', pages: 40, sections: 8, price: 499, originalPrice: 699, popular: false, color: '#C8A96B', icon: '🪐',
    description: 'Deep analysis of your 10th house, career planets, Mahadasha influence and the optimal timing for career transitions.' },
  { title: 'Love & Relationships', subtitle: 'Understand your heart\'s map', category: 'Love', pages: 38, sections: 7, price: 499, originalPrice: null, popular: false, color: '#B97862', icon: '💫',
    description: 'Explore your Venus placement, 7th house dynamics, and compatibility factors that shape your relationships.' },
  { title: 'Marriage Report', subtitle: 'Timing and compatibility', category: 'Marriage', pages: 52, sections: 10, price: 699, originalPrice: 999, popular: true, color: '#73D9D4', icon: '✨',
    description: 'Comprehensive marriage analysis including Navamsha chart, Mangal Dosha assessment, and marriage timing.' },
  { title: 'Premium Kundli', subtitle: 'Your complete cosmic blueprint', category: 'General', pages: 120, sections: 18, price: 999, originalPrice: 1499, popular: false, color: '#C8A96B', icon: '🌙',
    description: 'The most comprehensive birth chart analysis including all 16 divisional charts, detailed planetary interpretations and life predictions.' },
  { title: 'Fortune & Wealth', subtitle: 'Your financial cosmic map', category: 'Finance', pages: 45, sections: 9, price: 699, originalPrice: null, popular: false, color: '#B97862', icon: '⭐',
    description: 'Analysis of your 2nd and 11th houses, wealth planets, Dhan Yoga identification and financial timing.' },
  { title: 'Soul Purpose', subtitle: 'Discover your dharmic path', category: 'Spirituality', pages: 58, sections: 11, price: 999, originalPrice: 1299, popular: false, color: '#73D9D4', icon: '🌟',
    description: 'An in-depth exploration of your 9th house, Dharma planets, past life karma and your soul\'s purpose in this lifetime.' },
  { title: 'Year Ahead', subtitle: 'Your annual cosmic forecast', category: 'General', pages: 64, sections: 14, price: 799, originalPrice: 999, popular: false, color: '#C8A96B', icon: '🌌',
    description: 'A month-by-month forecast using Solar Return, transit analysis, and Dasha periods for the coming 12 months.' },
];

export async function seedContent() {
  await seedBlogPosts();
  await seedTestimonials();
  await seedAstrologyReports();
}

async function seedBlogPosts() {
  const existing = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM blog_posts');
  if (Number(existing?.n ?? 0) > 0) return;
  await withTransaction(async client => {
    for (const p of BLOG_POSTS) {
      await client.query(
        `INSERT INTO blog_posts (title, category, read_time, excerpt, content, tag, featured, published_at, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [p.title, p.category, p.readTime, p.excerpt, p.content, p.tag, p.featured ? 1 : 0, p.publishedAt, Date.now()]
      );
    }
  });
  console.log(`[db] seeded ${BLOG_POSTS.length} blog posts`);
}

async function seedTestimonials() {
  const existing = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM testimonials');
  if (Number(existing?.n ?? 0) > 0) return;
  await withTransaction(async client => {
    for (let i = 0; i < TESTIMONIALS.length; i++) {
      const t = TESTIMONIALS[i];
      await client.query(
        `INSERT INTO testimonials (name, location, service, rating, text, avatar, display_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [t.name, t.location, t.service, t.rating, t.text, t.avatar, i, Date.now()]
      );
    }
  });
  console.log(`[db] seeded ${TESTIMONIALS.length} testimonials`);
}

async function seedAstrologyReports() {
  const existing = await queryOne<{ n: string }>('SELECT COUNT(*) AS n FROM astrology_reports');
  if (Number(existing?.n ?? 0) > 0) return;
  await withTransaction(async client => {
    for (let i = 0; i < REPORTS.length; i++) {
      const r = REPORTS[i];
      await client.query(
        `INSERT INTO astrology_reports (title, subtitle, description, pages, sections, price, original_price, popular, color, icon, category, display_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [r.title, r.subtitle, r.description, r.pages, r.sections, r.price, r.originalPrice, r.popular ? 1 : 0, r.color, r.icon, r.category, i, Date.now()]
      );
    }
  });
  console.log(`[db] seeded ${REPORTS.length} astrology reports`);
}
