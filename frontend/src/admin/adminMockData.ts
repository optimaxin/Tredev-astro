import type { ContentModule } from './adminTypes';

export const CONTENT_MODULES: ContentModule[] = [
  { key: 'homepage', labelKey: 'admin_content_homepage', heading: 'Your Stars. Your Dharma.', body: 'Personalized Vedic astrology, expert guidance and timeless Jyotish wisdom.', updatedAt: '2026-07-28' },
  { key: 'reports', labelKey: 'admin_content_reports', heading: 'Go Deeper with Jyotish', body: 'Detailed, manuscript-grade Kundli readings translating cosmic alignment into direct life direction.', updatedAt: '2026-07-20' },
  { key: 'panchang', labelKey: 'admin_content_panchang', heading: "Today's Panchang", body: 'Vedic daily almanac for auspicious timings, planetary transits, and daily energy grid.', updatedAt: '2026-07-15' },
  { key: 'academy', labelKey: 'admin_content_academy', heading: 'TredevAstro Gurukul', body: 'Structured, in-depth courses in Vedic astrology and Jyotish, guided by lineage Acharyas.', updatedAt: '2026-06-30' },
  { key: 'store', labelKey: 'admin_content_store', heading: 'TredevStore', body: 'Authentic, energized gemstones, yantras and spiritual tools, carefully curated.', updatedAt: '2026-06-22' },
  { key: 'faq', labelKey: 'admin_content_faq', heading: 'Frequently Asked Questions', body: 'Answers to common questions about consultations, reports and orders.', updatedAt: '2026-06-10' },
];
