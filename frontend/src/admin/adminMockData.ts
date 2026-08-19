import type { AdminConsultation, AdminOrder, AdminReportPurchase, ContentModule } from './adminTypes';

// Demo-only operational data — this project has no real backend, so consultations,
// purchases and orders (unlike accounts/applications) are not persisted anywhere.
// Seeded here purely so the admin tables/filters have something real to render.
export const SAMPLE_CONSULTATIONS: AdminConsultation[] = [
  { id: 'c-1', userName: 'Arjun Sharma', astrologerName: 'Astrologist Rahul Shastri', date: 'Today', time: '4:30 PM', type: 'Video', payment: 1470, status: 'UPCOMING' },
  { id: 'c-2', userName: 'Sneha Iyer', astrologerName: 'Pandit Meera Devi', date: 'Today', time: '6:00 PM', type: 'Chat', payment: 980, status: 'LIVE' },
  { id: 'c-3', userName: 'Aditya Rao', astrologerName: 'Dr. Vikram Joshi', date: 'Yesterday', time: '11:30 AM', type: 'Voice', payment: 1225, status: 'COMPLETED' },
  { id: 'c-4', userName: 'Kiran Kumar', astrologerName: 'Jyotishi Priya Nair', date: 'Yesterday', time: '2:00 PM', type: 'Chat', payment: 980, status: 'COMPLETED' },
  { id: 'c-5', userName: 'Nalini Suresh', astrologerName: 'Astrologist Rahul Shastri', date: '2 days ago', time: '10:00 AM', type: 'Video', payment: 1470, status: 'CANCELLED' },
  { id: 'c-6', userName: 'Rohit Verma', astrologerName: 'Pandit Meera Devi', date: 'Tomorrow', time: '9:00 AM', type: 'Voice', payment: 1225, status: 'UPCOMING' },
];

export const SAMPLE_PURCHASED_REPORTS: AdminReportPurchase[] = [
  { id: 'r-1', userName: 'Arjun Sharma', reportTitle: 'Career Intelligence', price: 499, status: 'COMPLETED', date: '2026-08-10' },
  { id: 'r-2', userName: 'Sneha Iyer', reportTitle: 'Premium Kundli', price: 1299, status: 'COMPLETED', date: '2026-08-12' },
  { id: 'r-3', userName: 'Aditya Rao', reportTitle: 'Love & Relationships', price: 449, status: 'PENDING', date: '2026-08-15' },
  { id: 'r-4', userName: 'Kiran Kumar', reportTitle: 'Fortune & Wealth', price: 549, status: 'PENDING', date: '2026-08-16' },
  { id: 'r-5', userName: 'Nalini Suresh', reportTitle: 'Year Ahead', price: 599, status: 'COMPLETED', date: '2026-08-09' },
];

export const SAMPLE_ORDERS: AdminOrder[] = [
  { id: 'ORD-1042', customer: 'Arjun Sharma', product: 'Natural Colombian Emerald', amount: 2499, payment: 'PAID', delivery: 'DELIVERED' },
  { id: 'ORD-1043', customer: 'Pooja Mehta', product: 'Five-Mukhi Rudraksha', amount: 899, payment: 'PAID', delivery: 'SHIPPED' },
  { id: 'ORD-1044', customer: 'Amit Rathi', product: 'Shri Yantra (Brass)', amount: 1599, payment: 'PAID', delivery: 'PROCESSING' },
  { id: 'ORD-1045', customer: 'Sunil Nair', product: 'Navgraha Puja Kit', amount: 2199, payment: 'UNPAID', delivery: 'PROCESSING' },
  { id: 'ORD-1046', customer: 'Meera Iyer', product: 'Rose Quartz Cluster', amount: 799, payment: 'PAID', delivery: 'DELIVERED' },
];

export const CONTENT_MODULES: ContentModule[] = [
  { key: 'homepage', labelKey: 'admin_content_homepage', heading: 'Your Stars. Your Dharma.', body: 'Personalized Vedic astrology, expert guidance and timeless Jyotish wisdom.', updatedAt: '2026-07-28' },
  { key: 'reports', labelKey: 'admin_content_reports', heading: 'Go Deeper with Jyotish', body: 'Detailed, manuscript-grade Kundli readings translating cosmic alignment into direct life direction.', updatedAt: '2026-07-20' },
  { key: 'panchang', labelKey: 'admin_content_panchang', heading: "Today's Panchang", body: 'Vedic daily almanac for auspicious timings, planetary transits, and daily energy grid.', updatedAt: '2026-07-15' },
  { key: 'academy', labelKey: 'admin_content_academy', heading: 'TredevAstro Gurukul', body: 'Structured, in-depth courses in Vedic astrology and Jyotish, guided by lineage Acharyas.', updatedAt: '2026-06-30' },
  { key: 'store', labelKey: 'admin_content_store', heading: 'TredevStore', body: 'Authentic, energized gemstones, yantras and spiritual tools, carefully curated.', updatedAt: '2026-06-22' },
  { key: 'faq', labelKey: 'admin_content_faq', heading: 'Frequently Asked Questions', body: 'Answers to common questions about consultations, reports and orders.', updatedAt: '2026-06-10' },
];
