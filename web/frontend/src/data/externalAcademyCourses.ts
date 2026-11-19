// A curated, hand-picked subset of the real catalog from TredevaAstro's
// sister learning platform, Tredeva Learn (not the mock COURSES in
// mockData.ts, which still backs the unrelated internal course-detail
// page). Every card here links straight to that course's real page — this
// site never carries its own enrollment/checkout for these, by design.
// Same approach as data/externalStoreProducts.ts for the Store section.
export interface ExternalCourse {
  id: string;
  title: string;
  // Only genuinely different from `title` for courses the Learn platform
  // has actually translated — several entries there just duplicate the
  // English string into title_hi, which would look like a bad machine
  // translation if shown verbatim, so callers should fall back to `title`
  // whenever titleHi === title rather than display it as if it were Hindi.
  titleHi: string;
  subtitle: string;
  subtitleHi: string;
  price: number; // INR, 0 = free
  duration: string;
  image: string;
}

export const ACADEMY_BASE_URL = 'https://tredev-learn-main.ashif-ansari.workers.dev';

export function courseUrl(id: string): string {
  return `${ACADEMY_BASE_URL}/courses/${id}`;
}

export const EXTERNAL_COURSES: ExternalCourse[] = [
  {
    id: '892d316b-9ac6-41c8-9c56-d23a629575d2',
    title: 'Jyotish Foundations',
    titleHi: 'Jyotish Foundations',
    subtitle: 'Learn the fundamentals of Vedic Astrology',
    subtitleHi: 'Learn the fundamentals of Vedic Astrology',
    price: 2999,
    duration: '7 weeks',
    image: 'https://tjvzrwxedjzculsnxumt.supabase.co/storage/v1/object/public/course-media/lessons/680af0bd9d85d9db/ChatGPT_Image_Sep_8_2026_12_16_45_AM.png',
  },
  {
    id: 'e2689f5d-ba8e-441c-9528-f940f92970dd',
    title: 'Career & Professional Astrology',
    titleHi: 'Career & Professional Astrology',
    subtitle: 'The Wisdom Chapters',
    subtitleHi: 'The Wisdom Chapters',
    price: 0,
    duration: '6 week',
    image: 'https://tjvzrwxedjzculsnxumt.supabase.co/storage/v1/object/public/course-media/lessons/6c43281e211bbc4c/ChatGPT_Image_Sep_8_2026_12_25_10_AM.png',
  },
  {
    id: 'd75f7211-86d6-4b97-8f0f-c183b3ccb563',
    title: 'Marriage & Relationship Astrology',
    titleHi: 'विवाह एवं संबंध ज्योतिष',
    subtitle: 'Study relationships',
    subtitleHi: 'Study relationships',
    price: 4444,
    duration: '',
    image: 'https://tjvzrwxedjzculsnxumt.supabase.co/storage/v1/object/public/course-media/lessons/ea9d604189f64ab1/ChatGPT_Image_Sep_8_2026_12_18_28_AM.png',
  },
  {
    id: 'a7b155e6-5535-4ebe-a416-e63fb2341a12',
    title: 'Divisional Charts Mastery',
    titleHi: 'Divisional Charts Mastery',
    subtitle: 'Kundli',
    subtitleHi: 'कुंडली',
    price: 5000,
    duration: '8 week',
    image: 'https://tjvzrwxedjzculsnxumt.supabase.co/storage/v1/object/public/course-media/lessons/3bc25c87fbf24177/ChatGPT_Image_Sep_8_2026_12_27_01_AM.png',
  },
  {
    id: 'bb153dca-8391-4e50-890e-3a225b973de2',
    title: 'Bhagavad Gita — A Verse-by-Verse Journey',
    titleHi: 'Bhagavad Gita — A Verse-by-Verse Journey',
    subtitle: 'Foundation Course',
    subtitleHi: 'मूल पाठ्यक्रम',
    price: 4999,
    duration: '12 weeks self-paced',
    image: 'https://images.pexels.com/photos/15235034/pexels-photo-15235034.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  },
  {
    id: '565a5113-460e-431b-a687-a6ab4c907b5d',
    title: 'Sanskrit for Absolute Beginners',
    titleHi: 'Sanskrit for Absolute Beginners',
    subtitle: 'Language & Grammar',
    subtitleHi: 'Language & Grammar',
    price: 8999,
    duration: '8-week cohort',
    image: 'https://images.pexels.com/photos/7128756/pexels-photo-7128756.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940',
  },
];
