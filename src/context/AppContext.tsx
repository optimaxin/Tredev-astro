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

// ── Role-based auth (mock/frontend-only prototype — no real backend exists in
// this project, so "backend authority" is simulated via localStorage) ──
export type Role = 'USER' | 'ASTROLOGIST' | 'ADMIN';

export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: AccountStatus;
}

interface StoredAccount extends AuthUser {
  password: string; // dev/demo only — never store plaintext passwords in a real backend
}

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AstrologerApplication {
  id: string;
  userEmail: string;
  userName: string;
  expertise: string;
  experience: string;
  status: ApplicationStatus;
  submittedAt: string;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  actor: string;
  target: string;
  at: string;
}

export interface NotificationEntry {
  id: string;
  message: string;
  at: string;
  recipientEmail?: string;
  read?: boolean;
  kind?: 'request' | 'review' | 'payment' | 'system';
}

// ── Astrologist practice-management mock domain (dev seed data only — see
// DEMO_ACCOUNTS below; a real backend would own and authorize all of this) ──
export type ConsultationType = 'chat' | 'voice' | 'video';
export type ConsultationStatus = 'upcoming' | 'completed' | 'cancelled';
export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED';
export type AvailabilityStatus = 'AVAILABLE' | 'BUSY' | 'OFFLINE';

export interface ConsultationRequest {
  id: string;
  astrologerEmail: string;
  clientName: string;
  clientEmail: string;
  service: string;
  type: ConsultationType;
  requestedFor: string; // ISO datetime the client asked for
  duration: number; // minutes
  price: number;
  status: RequestStatus;
  submittedAt: string;
}

export interface Consultation {
  id: string;
  astrologerEmail: string;
  clientName: string;
  clientEmail: string;
  type: ConsultationType;
  service: string;
  scheduledAt: string; // ISO
  duration: number; // minutes
  amount: number;
  status: ConsultationStatus;
  notes: string; // private astrologer notes — never shown to the client
  payoutStatus: 'PENDING' | 'PAID';
}

export interface TimeWindow {
  start: string; // HH:MM
  end: string;
}

export interface BlockedSlot {
  id: string;
  astrologerEmail: string;
  date: string; // YYYY-MM-DD
  start: string;
  end: string;
  reason: string;
}

export interface AvailabilitySettings {
  workingDays: number[]; // 0=Sun..6=Sat
  slots: TimeWindow[];
  consultationDuration: number; // minutes
  bufferMinutes: number;
  status: AvailabilityStatus;
}

export interface AstrologerReview {
  id: string;
  astrologerEmail: string;
  clientName: string;
  rating: number;
  text: string;
  at: string;
}

export interface AstrologerProfileOverride {
  title: string;
  bio: string;
  specialization: string[];
  languages: string[];
  publicVisible: boolean;
}

// Development-only demo accounts so all three dashboards can be tested
// immediately. Not real credentials — never expose seed data like this in production.
const DEMO_ACCOUNTS: StoredAccount[] = [
  { id: 'demo-user', name: 'Arjun Sharma', email: 'demo.user@tredevastro.local', password: 'DevUser@123', role: 'USER' },
  { id: 'demo-astrologer', name: 'Astrologist Rahul Shastri', email: 'demo.astrologer@tredevastro.local', password: 'DevAstro@123', role: 'ASTROLOGIST' },
  { id: 'demo-admin', name: 'Admin Priya Verma', email: 'demo.admin@tredevastro.local', password: 'DevAdmin@123', role: 'ADMIN' },
];

const normalizeEmail = (email: string) => email.trim().toLowerCase();

function loadUsers(): Record<string, StoredAccount> {
  let saved: Record<string, StoredAccount> = {};
  try {
    saved = JSON.parse(localStorage.getItem('auth_users') || '{}');
  } catch {
    saved = {};
  }
  DEMO_ACCOUNTS.forEach(acc => {
    if (!saved[acc.email]) saved[acc.email] = acc;
  });
  return saved;
}

function loadLS<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

const DEMO_ASTROLOGER_EMAIL = 'demo.astrologer@tredevastro.local';

const DEFAULT_AVAILABILITY: AvailabilitySettings = {
  workingDays: [1, 2, 3, 4, 5],
  slots: [{ start: '09:00', end: '13:00' }, { start: '17:00', end: '21:00' }],
  consultationDuration: 30,
  bufferMinutes: 10,
  status: 'AVAILABLE',
};

// Fallback for astrologists who haven't filled in their profile yet — kept
// genuinely empty so profile-completion tracking is meaningful for new accounts.
const EMPTY_PROFILE_OVERRIDE: AstrologerProfileOverride = {
  title: '',
  bio: '',
  specialization: [],
  languages: [],
  publicVisible: true,
};

// Seeded only for the demo astrologer account (see seedAstrologistDemoData) so
// the dashboard demo has a filled-in profile to show.
const DEFAULT_PROFILE_OVERRIDE: AstrologerProfileOverride = {
  title: '',
  bio: 'Specializes in predictive Vedic astrology with deep expertise in Dashas, transits, and marriage compatibility. Draws on over a decade of consultation experience to give direct, practical guidance.',
  specialization: [],
  languages: [],
  publicVisible: true,
};

// Seeds the demo Astrologist account (and only that account — see DEMO_ACCOUNTS)
// with development-only practice data so the dashboard has something to show
// on first load. Real astrologists start with empty state and an empty-state UI.
function seedAstrologistDemoData() {
  const now = Date.now();
  const day = 86400000;
  const iso = (offsetDays: number, hh: number, mm: number) => {
    const d = new Date(now + offsetDays * day);
    d.setHours(hh, mm, 0, 0);
    return d.toISOString();
  };

  const requests = loadLS<ConsultationRequest[]>('astro_requests', []);
  if (!requests.some(r => r.astrologerEmail === DEMO_ASTROLOGER_EMAIL)) {
    requests.push(
      { id: 'req-seed-1', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Priya Sharma', clientEmail: 'priya.sharma@example.com', service: 'Marriage Consultation', type: 'video', requestedFor: iso(1, 10, 0), duration: 30, price: 1470, status: 'PENDING', submittedAt: iso(0, 8, 0) },
      { id: 'req-seed-2', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Karan Malhotra', clientEmail: 'karan.malhotra@example.com', service: 'Career Reading', type: 'chat', requestedFor: iso(2, 15, 0), duration: 45, price: 2205, status: 'PENDING', submittedAt: iso(0, 9, 30) },
    );
    localStorage.setItem('astro_requests', JSON.stringify(requests));
  }

  const consultations = loadLS<Consultation[]>('astro_consultations', []);
  if (!consultations.some(c => c.astrologerEmail === DEMO_ASTROLOGER_EMAIL)) {
    consultations.push(
      { id: 'con-seed-1', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Rohit Verma', clientEmail: 'rohit.verma@example.com', type: 'video', service: 'Kundli Consultation', scheduledAt: iso(0, 16, 30), duration: 30, amount: 1470, status: 'upcoming', notes: '', payoutStatus: 'PENDING' },
      { id: 'con-seed-2', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Sneha Iyer', clientEmail: 'sneha.iyer@example.com', type: 'chat', service: 'Love & Relationship Reading', scheduledAt: iso(0, 18, 0), duration: 20, amount: 980, status: 'upcoming', notes: '', payoutStatus: 'PENDING' },
      { id: 'con-seed-3', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Aditya Rao', clientEmail: 'aditya.rao@example.com', type: 'voice', service: 'Career Reading', scheduledAt: iso(1, 11, 0), duration: 25, amount: 1225, status: 'upcoming', notes: '', payoutStatus: 'PENDING' },
      { id: 'con-seed-4', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Kiran Kapoor', clientEmail: 'kiran.kapoor@example.com', type: 'video', service: 'Marriage Consultation', scheduledAt: iso(-5, 15, 0), duration: 30, amount: 1470, status: 'completed', notes: 'Recommended a Mangal Dosha remedy; suggested a follow-up in 3 months.', payoutStatus: 'PAID' },
      { id: 'con-seed-5', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Nalini Suresh', clientEmail: 'nalini.suresh@example.com', type: 'chat', service: 'Vastu Consultation', scheduledAt: iso(-12, 12, 0), duration: 20, amount: 980, status: 'completed', notes: '', payoutStatus: 'PAID' },
      { id: 'con-seed-6', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Meera Joshi', clientEmail: 'meera.joshi@example.com', type: 'voice', service: 'Kundli Reading', scheduledAt: iso(-2, 17, 0), duration: 30, amount: 1470, status: 'completed', notes: '', payoutStatus: 'PENDING' },
    );
    localStorage.setItem('astro_consultations', JSON.stringify(consultations));
  }

  const blocked = loadLS<BlockedSlot[]>('astro_blocked_slots', []);
  if (!blocked.some(b => b.astrologerEmail === DEMO_ASTROLOGER_EMAIL)) {
    blocked.push({ id: 'blk-seed-1', astrologerEmail: DEMO_ASTROLOGER_EMAIL, date: iso(1, 0, 0).slice(0, 10), start: '14:00', end: '16:00', reason: 'Personal' });
    localStorage.setItem('astro_blocked_slots', JSON.stringify(blocked));
  }

  const reviews = loadLS<AstrologerReview[]>('astro_reviews', []);
  if (!reviews.some(r => r.astrologerEmail === DEMO_ASTROLOGER_EMAIL)) {
    reviews.push(
      { id: 'rev-seed-1', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Kiran K.', rating: 5, text: 'Incredibly insightful reading on my Saturn transit. Clear, direct, and the remedy actually helped.', at: iso(-4, 10, 0) },
      { id: 'rev-seed-2', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Nalini S.', rating: 5, text: 'Accurate marriage timing forecast. Strongly recommended.', at: iso(-11, 14, 0) },
      { id: 'rev-seed-3', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Aditya R.', rating: 4, text: 'Good session overall, would have liked a bit more time on career remedies.', at: iso(-20, 9, 0) },
    );
    localStorage.setItem('astro_reviews', JSON.stringify(reviews));
  }

  const notifs = loadLS<NotificationEntry[]>('astro_notifications', []);
  if (!notifs.some(n => n.recipientEmail === DEMO_ASTROLOGER_EMAIL)) {
    notifs.push(
      { id: 'an-seed-1', recipientEmail: DEMO_ASTROLOGER_EMAIL, message: 'New consultation request from Priya Sharma.', at: iso(0, 8, 0), read: false, kind: 'request' },
      { id: 'an-seed-2', recipientEmail: DEMO_ASTROLOGER_EMAIL, message: 'New consultation request from Karan Malhotra.', at: iso(0, 9, 30), read: false, kind: 'request' },
      { id: 'an-seed-3', recipientEmail: DEMO_ASTROLOGER_EMAIL, message: 'Nalini S. left you a 5★ review.', at: iso(-12, 13, 0), read: true, kind: 'review' },
      { id: 'an-seed-4', recipientEmail: DEMO_ASTROLOGER_EMAIL, message: 'Payout of ₹1,470 was completed.', at: iso(-5, 16, 0), read: true, kind: 'payment' },
    );
    localStorage.setItem('astro_notifications', JSON.stringify(notifs));
  }
}

function loadAvailabilityMap(): Record<string, AvailabilitySettings> {
  const saved = loadLS<Record<string, AvailabilitySettings>>('astro_availability', {});
  if (!saved[DEMO_ASTROLOGER_EMAIL]) saved[DEMO_ASTROLOGER_EMAIL] = DEFAULT_AVAILABILITY;
  return saved;
}

function loadProfileOverrideMap(): Record<string, AstrologerProfileOverride> {
  const saved = loadLS<Record<string, AstrologerProfileOverride>>('astro_profile_overrides', {});
  if (!saved[DEMO_ASTROLOGER_EMAIL]) saved[DEMO_ASTROLOGER_EMAIL] = DEFAULT_PROFILE_OVERRIDE;
  return saved;
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
  // Auth state (mock prototype — role is the single source of truth for dashboard access)
  isLoggedIn: boolean;
  currentUser: AuthUser | null;
  login: (email: string, password: string) => AuthUser | null;
  loginOrRegister: (email: string) => AuthUser;
  register: (name: string, email: string, password: string) => AuthUser | null;
  logout: () => void;
  pendingAction: string | null;
  setPendingAction: (a: string | null) => void;
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  // Astrologer application + admin approval workflow (mock prototype)
  accounts: AuthUser[];
  applications: AstrologerApplication[];
  applyToBecomeAstrologer: (details: { expertise: string; experience: string }) => void;
  approveApplication: (id: string) => void;
  rejectApplication: (id: string) => void;
  auditLog: AuditLogEntry[];
  notifications: NotificationEntry[];
  // Admin console actions (mock prototype — see Role-based auth note above)
  logAdminAction: (action: string, target: string) => void;
  suspendAccount: (email: string) => void;
  restoreAccount: (email: string) => void;
  createAstrologerAccount: (name: string, email: string, password: string) => AuthUser | null;
  // Astrologist practice-management (mock prototype, scoped to currentUser.email)
  consultationRequests: ConsultationRequest[];
  consultations: Consultation[];
  acceptConsultationRequest: (id: string) => void;
  declineConsultationRequest: (id: string) => void;
  completeConsultation: (id: string) => void;
  cancelConsultation: (id: string) => void;
  saveConsultationNotes: (id: string, notes: string) => void;
  blockedSlots: BlockedSlot[];
  addBlockedSlot: (slot: Omit<BlockedSlot, 'id' | 'astrologerEmail'>) => void;
  removeBlockedSlot: (id: string) => void;
  availability: AvailabilitySettings;
  setAvailabilityStatus: (status: AvailabilityStatus) => void;
  updateAvailability: (partial: Partial<AvailabilitySettings>) => void;
  profileOverride: AstrologerProfileOverride;
  updateProfileOverride: (partial: Partial<AstrologerProfileOverride>) => void;
  astrologerNotifications: NotificationEntry[];
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  astrologerReviews: AstrologerReview[];
  // Language selector state
  language: 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te';
  setLanguage: (l: 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te') => void;
  t: (key: string) => string;
  /** Like t(), but only uses `key` if the CURRENT language has it; otherwise
   *  falls back to `fallbackKey` in the current language. Lets a subset of
   *  languages (en/hi/mr) get a specific translation while the rest keep
   *  using the existing generic one, instead of a blanket replacement. */
  tOr: (key: string, fallbackKey: string) => string;
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
    seek_card_marriage_cta: 'Explore Relationship →',
    seek_card_career_cta: 'Explore Career →',
    seek_card_money_cta: 'Explore Prosperity →',
    seek_card_family_cta: 'Explore Heritage →',
    seek_card_growth_cta: 'Explore Personal Growth →',
    seek_card_spirituality_cta: 'Explore Spirituality →',
    seek_card_vastu_cta: 'Explore Vastu →',
    tools_kundli_milan_cta: 'Check Compatibility →',
    tools_nakshatra_cta: 'Explore Nakshatra →',

    // Card details & buttons translations
    btn_add_to_cart: 'Buy Now',
    btn_enroll: 'Enroll Now',
    btn_view_details: 'View Details',
    btn_chat: 'Chat',
    btn_call: 'Call',
    lbl_online: 'Online',
    lbl_offline: 'Offline',
    lbl_per_min: '/min',
    lbl_yrs: 'yrs',
    lbl_consults: 'consults',

    // Categories
    cat_gemstones: 'Ratna (Gemstones)',
    cat_rudraksha: 'Rudraksha',
    cat_crystals: 'Sphatik (Crystals)',
    cat_bracelets: 'Mala & Bracelets',
    cat_yantras: 'Yantras',
    cat_puja_essentials: 'Puja Essentials',
    cat_all: 'All Remedies',
    cat_career: 'Career',
    cat_love: 'Love',
    cat_marriage: 'Marriage',
    cat_general: 'General',
    cat_finance: 'Finance',
    cat_spirituality: 'Spirituality',
    cat_astrology: 'Astrology',
    cat_numerology: 'Numerology',
    cat_tarot: 'Tarot',

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

    // Footer
    footer_tagline: 'Your Sky. Your Story.',
    footer_desc: 'A modern astrology ecosystem combining personalized Vedic astrology, expert consultations, intelligent AI guidance, and timeless wisdom.',
    footer_newsletter_label: 'Receive thoughtful astrology insights',
    footer_email_placeholder: 'Your email address',
    btn_subscribe: 'Subscribe',
    footer_subscribed: "You're subscribed. Thank you.",
    footer_col_consultations: 'Consultations',
    footer_col_company: 'Company',
    footer_col_support: 'Support',
    footer_kundli_matching: 'Kundli Matching',
    footer_daily_horoscope: 'Daily Horoscope',
    footer_muhurat: 'Muhurat',
    footer_find_astrologers: 'Find Astrologers',
    footer_chat_consultation: 'Chat Consultation',
    footer_call_consultation: 'Call Consultation',
    footer_about_us: 'About Us',
    footer_our_approach: 'Our Approach',
    footer_careers: 'Careers',
    footer_press: 'Press',
    footer_help_centre: 'Help Centre',
    footer_privacy_policy: 'Privacy Policy',
    footer_terms_of_service: 'Terms of Service',
    footer_contact_us: 'Contact Us',
    footer_copyright: '© 2026 TredevAstro. All rights reserved.',
    footer_privacy_short: 'Privacy',
    footer_terms_short: 'Terms',
    footer_cookies_short: 'Cookies',
    footer_legal_note: 'Astrology is for entertainment and spiritual guidance. Not a substitute for professional advice.',

    // Login Modal
    login_heading_signin_prefix: 'Sign in to continue ',
    login_heading_signup_prefix: 'Begin ',
    login_heading_em: 'your journey',
    login_subheading_pending: 'Please sign in to access this feature.',
    login_subheading_default: 'Your personalized Jyotish experience awaits.',
    login_google: 'Continue with Google',
    login_email: 'Continue with Email',
    login_new_here: 'New here? ',
    login_have_account: 'Already have an account? ',
    login_create_account: 'Create Account',
    login_sign_in: 'Sign In',
    login_email_placeholder: 'Enter your email or mobile',
    login_back: '← Back',
    login_privacy_prefix: 'By continuing, you agree to our ',
    login_privacy_and: ' & ',
    login_terms: 'Terms',
    login_privacy_policy: 'Privacy Policy',

    // Monk Widget
    monk_cta_title: 'Ask Monk Guide',
    monk_dismiss: 'Dismiss',
    monk_alt: 'Sacred Monk Guide',
    monk_notif_1: 'Rohan from New Delhi just booked a chat with Astrologist Rahul Shastri 🪐',
    monk_notif_2: 'Pooja from Bengaluru just ordered a Natural Colombian Emerald 💎',
    monk_notif_3: 'Aditya from Mumbai just generated a Premium Kundli Report 📜',
    monk_notif_4: 'Sneha from Pune just booked Pandit Meera Devi 🌸',
    monk_notif_5: 'Amit from Jaipur just ordered a Five-Mukhi Rudraksha 📿',
    monk_notif_6: 'Kiran from Indore just enrolled in Vedic Astrology Complete Course 🎓',
    monk_notif_7: 'Meera from Chennai just generated their Love & Relationships Report 💖',
    monk_notif_8: 'Rajesh from Hyderabad just booked Dr. Vikram Joshi 🪐',
    monk_notif_9: 'Ananya from Kolkata just booked a call with Jyotishi Priya Nair 📞',
    monk_notif_10: 'Sunil from Noida just ordered a Shri Yantra (Brass) 🕉️',

    // Auth Page (manuscript sign-up/sign-in)
    auth_tab_register: 'Inscribe Birth Details',
    auth_tab_login: 'Member Sign In',
    auth_subtitle_register: 'ANCIENT VEDIC BIRTH MANUSCRIPT · INSCRIBE YOUR KUNDLI DETAILS',
    auth_subtitle_login: 'SACRED USER VAULT · ACCESS STORED BIRTH PROFILE',
    auth_label_fullname: "Full Name / Seeker's Name *",
    auth_placeholder_fullname: 'e.g. Sparsh Sharma',
    auth_label_email: 'Email Address *',
    auth_placeholder_email: 'name@example.com',
    auth_label_password: 'Secret Password *',
    auth_label_login_email: 'Registered Email Address *',
    auth_label_login_password: 'Password *',
    auth_separator_birth_coords: 'Birth Coordinates',
    auth_label_dob: 'Date of Birth *',
    auth_placeholder_dob: 'Select Date of Birth',
    auth_label_tob: 'Time of Birth *',
    auth_placeholder_tob: 'Select Time of Birth',
    auth_label_pob: 'Place of Birth (City, State) *',
    auth_placeholder_pob: 'e.g. New Delhi, India',
    auth_label_gender: 'Gender',
    auth_gender_male: 'Male',
    auth_gender_female: 'Female',
    auth_gender_other: 'Other',
    auth_btn_inscribing: 'Inscribing Birth Chart...',
    auth_btn_seal: 'SEAL INSCRIPTION →',
    auth_btn_unlocking: 'Unlocking Vault...',
    auth_btn_signin_vault: 'SIGN IN TO VAULT →',
    auth_success_message: 'Greetings {name}! Your birth coordinates ({date} at {time}, {place}) have been successfully inscribed onto the sacred Vedic manuscript archive.',
    auth_btn_continue: '✦ ENTER CELESTIAL PORTAL ✦',
    auth_footer_stamp: 'ENCRYPTED ANCIENT VEDIC ARCHIVE',

    // Admin Console
    admin_console_name: 'TredevAstro Admin',
    admin_console_caption: 'Administration Console',
    admin_search_placeholder: 'Search...',
    admin_notifications: 'Notifications',
    admin_profile: 'Admin Profile',
    admin_logout: 'Logout',
    admin_sidebar_overview: 'Overview',
    admin_sidebar_applications: 'Applications',
    admin_sidebar_astrologers: 'Astrologers',
    admin_sidebar_users: 'Users',
    admin_sidebar_consultations: 'Consultations',
    admin_sidebar_reports: 'Reports',
    admin_sidebar_orders: 'Orders',
    admin_sidebar_content: 'Content',
    admin_sidebar_notifications: 'Notifications',
    admin_sidebar_audit: 'Audit Logs',
    admin_sidebar_settings: 'Settings',
    admin_status_pending: 'Pending',
    admin_status_approved: 'Approved',
    admin_status_rejected: 'Rejected',
    admin_status_active: 'Active',
    admin_status_suspended: 'Suspended',
    admin_status_upcoming: 'Upcoming',
    admin_status_live: 'Live',
    admin_status_completed: 'Completed',
    admin_status_cancelled: 'Cancelled',
    admin_status_all: 'All',
    admin_status_paid: 'Paid',
    admin_status_unpaid: 'Unpaid',
    admin_status_delivered: 'Delivered',
    admin_status_processing: 'Processing',
    admin_status_shipped: 'Shipped',
    admin_action_view: 'View',
    admin_action_edit: 'Edit',
    admin_action_suspend: 'Suspend',
    admin_action_activate: 'Activate',
    admin_action_restore: 'Restore',
    admin_action_approve: 'Approve',
    admin_action_reject: 'Reject',
    admin_action_request_info: 'Request Information',
    admin_action_confirm: 'Confirm',
    admin_action_cancel: 'Cancel',
    admin_action_send: 'Send',
    admin_action_close: 'Close',
    admin_action_add_astrologer: 'Add Astrologer',
    admin_action_save: 'Save Changes',
    admin_empty_title: 'Nothing here yet',
    admin_empty_desc: 'There is no data to display for this view right now.',
    admin_search_name_email: 'Search by name or email',
    admin_no_results: 'No results match your search.',
    admin_kpi_total_users: 'Total Users',
    admin_kpi_active_users: 'Active Users',
    admin_kpi_astrologers: 'Astrologers',
    admin_kpi_pending_applications: 'Pending Applications',
    admin_kpi_todays_consultations: "Today's Consultations",
    admin_kpi_revenue: 'Revenue',
    admin_kpi_reports_generated: 'Reports Generated',
    admin_kpi_store_orders: 'Store Orders',
    admin_quick_actions: 'Quick Actions',
    admin_qa_review_applications: 'Review Applications',
    admin_qa_add_astrologer: 'Add Astrologer',
    admin_qa_view_consultations: 'View Consultations',
    admin_qa_manage_reports: 'Manage Reports',
    admin_qa_manage_store: 'Manage Store',
    admin_qa_send_announcement: 'Send Announcement',
    admin_recent_activity: 'Recent Activity',
    admin_activity_new_user: '{name} registered a new account',
    admin_activity_astrologer_applied: '{name} applied to become an astrologer',
    admin_activity_application_approved: "{name}'s astrologer application was approved",
    admin_activity_application_rejected: "{name}'s astrologer application was rejected",
    admin_activity_consultation_booked: '{user} booked a consultation with {astrologer}',
    admin_activity_report_purchased: '{user} purchased the {report} report',
    admin_activity_order_completed: 'Order {id} was completed',
    admin_apps_title: 'Astrologer Applications',
    admin_apps_col_applicant: 'Applicant',
    admin_apps_col_experience: 'Experience',
    admin_apps_col_languages: 'Languages',
    admin_apps_col_expertise: 'Expertise',
    admin_apps_col_submitted: 'Submitted',
    admin_apps_col_status: 'Status',
    admin_apps_col_action: 'Action',
    admin_apps_drawer_profile: 'Profile',
    admin_apps_drawer_professional: 'Professional',
    admin_apps_drawer_documents: 'Documents',
    admin_apps_doc_id_proof: 'ID Proof',
    admin_apps_doc_certification: 'Certification',
    admin_apps_doc_resume: 'Resume',
    admin_apps_no_docs: 'No documents submitted with this application.',
    admin_apps_confirm_approve_title: 'Approve this application?',
    admin_apps_confirm_approve_desc: 'This will grant the applicant an Astrologist account and console access.',
    admin_apps_confirm_reject_title: 'Reject this application?',
    admin_apps_confirm_reject_desc: 'The applicant will be notified that their application was not approved.',
    admin_astro_title: 'Astrologers',
    admin_astro_view_cards: 'Cards',
    admin_astro_view_table: 'Table',
    admin_astro_col_name: 'Name',
    admin_astro_col_rating: 'Rating',
    admin_astro_col_experience: 'Experience',
    admin_astro_col_languages: 'Languages',
    admin_astro_col_consultations: 'Consultations',
    admin_astro_col_earnings: 'Earnings',
    admin_astro_col_status: 'Status',
    admin_astro_add_title: 'Add Astrologer',
    admin_astro_add_name: 'Full Name',
    admin_astro_add_email: 'Email Address',
    admin_astro_add_password: 'Temporary Password',
    admin_astro_tab_overview: 'Overview',
    admin_astro_tab_schedule: 'Schedule',
    admin_astro_tab_reviews: 'Reviews',
    admin_astro_tab_earnings: 'Earnings',
    admin_astro_tab_consultations: 'Consultations',
    admin_astro_tab_documents: 'Documents',
    admin_users_title: 'Users',
    admin_users_col_user: 'User',
    admin_users_col_joined: 'Joined',
    admin_users_col_reports: 'Reports',
    admin_users_col_consultations: 'Consultations',
    admin_users_col_orders: 'Orders',
    admin_users_col_status: 'Status',
    admin_consult_title: 'Consultations',
    admin_consult_col_user: 'User',
    admin_consult_col_astrologer: 'Astrologer',
    admin_consult_col_date: 'Date',
    admin_consult_col_time: 'Time',
    admin_consult_col_type: 'Type',
    admin_consult_col_payment: 'Payment',
    admin_consult_col_status: 'Status',
    admin_reports_title: 'Reports',
    admin_reports_kpi_total: 'Total Reports',
    admin_reports_kpi_pending: 'Pending',
    admin_reports_kpi_completed: 'Completed',
    admin_reports_kpi_revenue: 'Revenue',
    admin_reports_col_user: 'User',
    admin_reports_col_report: 'Report',
    admin_reports_col_price: 'Price',
    admin_reports_col_status: 'Status',
    admin_reports_col_date: 'Date',
    admin_orders_title: 'Orders',
    admin_orders_col_id: 'Order ID',
    admin_orders_col_customer: 'Customer',
    admin_orders_col_product: 'Product',
    admin_orders_col_amount: 'Amount',
    admin_orders_col_payment: 'Payment',
    admin_orders_col_delivery: 'Delivery Status',
    admin_content_title: 'Content Management',
    admin_content_desc: 'Manage published content across the platform. No code editing — content only.',
    admin_content_homepage: 'Homepage',
    admin_content_reports: 'Reports',
    admin_content_panchang: 'Panchang',
    admin_content_academy: 'Academy',
    admin_content_store: 'Store',
    admin_content_faq: 'FAQ',
    admin_content_edit: 'Edit Content',
    admin_content_updated: 'Last updated',
    admin_content_field_heading: 'Heading',
    admin_content_field_body: 'Body Text',
    admin_notif_title: 'Announcement Center',
    admin_notif_target_all_users: 'All Users',
    admin_notif_target_all_astrologers: 'All Astrologers',
    admin_notif_target_specific_user: 'Specific User',
    admin_notif_field_title: 'Title',
    admin_notif_field_message: 'Message',
    admin_notif_field_audience: 'Target Audience',
    admin_notif_field_schedule: 'Schedule',
    admin_notif_schedule_now: 'Send Now',
    admin_notif_schedule_later: 'Schedule for Later',
    admin_notif_field_user_email: 'User Email',
    admin_notif_history: 'History',
    admin_notif_sent: 'Announcement sent successfully.',
    admin_audit_title: 'Audit Logs',
    admin_audit_col_timestamp: 'Timestamp',
    admin_audit_col_admin: 'Admin',
    admin_audit_col_action: 'Action',
    admin_audit_col_target: 'Target',
    admin_audit_col_ip: 'IP',
    admin_audit_col_status: 'Status',
    admin_settings_title: 'Settings',
    admin_settings_general: 'General',
    admin_settings_languages: 'Languages',
    admin_settings_roles: 'Roles',
    admin_settings_notification_templates: 'Notification Templates',
    admin_settings_payment: 'Payment Settings',
    admin_settings_system_prefs: 'System Preferences',
    admin_settings_readonly_note: 'Settings management is available to administrators only.',
    admin_settings_platform: 'Platform',
    admin_settings_support_email: 'Support Email',
    admin_settings_admins: 'Admins',
    admin_settings_notification_templates_desc: 'Manage the message templates used by the Announcement Center.',
    admin_settings_payment_desc: 'Gateway configuration for reports, consultations and store orders.',
    admin_settings_system_prefs_desc: 'Session timeouts, audit retention and platform-wide defaults.',

    // Astrologist Console
    astro_console_title: 'Astrologist Console',
    astro_console_sub: 'Manage your consultations, availability & earnings',
    astro_role_label: 'Astrologist',
    astro_sign_out: 'Sign Out',
    astro_suspended_banner: 'Your account has been suspended by TredevAstro. You cannot accept new bookings or appear in public search until it is reactivated.',
    astro_status_available: 'Available',
    astro_status_busy: 'Busy',
    astro_status_offline: 'Offline',
    astro_nav_overview: 'Overview',
    astro_nav_consultations: 'Consultations',
    astro_nav_clients: 'Clients',
    astro_nav_availability: 'Availability',
    astro_nav_earnings: 'Earnings',
    astro_nav_reviews: 'Reviews',
    astro_nav_profile: 'Astrologer Profile',
    astro_nav_notifications: 'Notifications',
    astro_nav_settings: 'Settings',
    astro_greeting_morning: 'Good morning',
    astro_greeting_afternoon: 'Good afternoon',
    astro_greeting_evening: 'Good evening',
    astro_overview_tagline: 'Your astrology practice at a glance',
    astro_kpi_today: "Today's Consultations",
    astro_kpi_pending: 'Pending Requests',
    astro_kpi_month_earnings: "This Month's Earnings",
    astro_kpi_rating: 'Average Rating',
    astro_todays_schedule: "Today's Schedule",
    astro_pending_requests: 'Pending Requests',
    astro_view_all: 'View All',
    astro_min: 'min',
    astro_action_accept: 'Accept',
    astro_action_decline: 'Decline',
    astro_action_complete: 'Mark Completed',
    astro_action_cancel: 'Cancel',
    astro_action_save_notes: 'Save Notes',
    astro_private_notes: 'Private Notes',
    astro_private_notes_placeholder: 'Notes for yourself — never shown to the client.',
    astro_payout_status: 'Payout Status',
    astro_subtab_upcoming: 'Upcoming',
    astro_subtab_requests: 'Requests',
    astro_subtab_history: 'History',
    astro_recently_decided: 'Recently Decided',
    astro_search_clients: 'Search clients by name...',
    astro_consultations_count: 'consultations',
    astro_last: 'Last',
    astro_next: 'Next',
    astro_working_days: 'Working Days',
    astro_day_sun: 'Sun',
    astro_day_mon: 'Mon',
    astro_day_tue: 'Tue',
    astro_day_wed: 'Wed',
    astro_day_thu: 'Thu',
    astro_day_fri: 'Fri',
    astro_day_sat: 'Sat',
    astro_time_slots: 'Time Slots',
    astro_action_add_slot: 'Add Slot',
    astro_consultation_duration: 'Consultation Duration',
    astro_buffer_time: 'Buffer Time Between Consultations',
    astro_blocked_time: 'Blocked Time',
    astro_no_blocked_time: 'No blocked time periods.',
    astro_reason_placeholder: 'Reason (private, not shown publicly)',
    astro_action_block_time: 'Block Time',
    astro_earnings_total: 'Total Earnings',
    astro_earnings_month: 'This Month',
    astro_earnings_week: 'This Week',
    astro_earnings_pending_payout: 'Pending Payout',
    astro_earnings_completed_payout: 'Completed Payout',
    astro_transactions: 'Transaction History',
    astro_average_rating: 'Average Rating',
    astro_total_reviews: 'Total Reviews',
    astro_recent_reviews: 'Recent Reviews',
    astro_profile_completion: 'Profile Completion',
    astro_missing: 'Missing',
    astro_profile_title: 'Professional Title',
    astro_profile_bio: 'Biography',
    astro_profile_expertise: 'Consultation Categories',
    astro_profile_languages: 'Languages',
    astro_profile_public_toggle: 'Public Profile',
    astro_profile_public_desc: 'Visible in public astrologer search and discovery.',
    astro_public_disabled_suspended: 'Hidden from public search while your account is suspended.',
    astro_view_public_profile: 'View Public Profile',
    astro_mark_all_read: 'Mark All as Read',
    astro_settings_account: 'Account',
    astro_empty_schedule_title: 'No consultations scheduled today',
    astro_empty_schedule_desc: 'Your accepted consultations for today will appear here.',
    astro_empty_requests_title: 'No pending requests',
    astro_empty_requests_desc: "New consultation requests from clients will show up here.",
    astro_empty_upcoming_title: 'No upcoming consultations',
    astro_empty_upcoming_desc: 'Accepted requests will appear here as upcoming consultations.',
    astro_empty_history_title: 'No consultation history yet',
    astro_empty_history_desc: 'Completed and cancelled consultations will appear here.',
    astro_empty_clients_title: 'No clients yet',
    astro_empty_clients_desc: 'Clients you have consulted with will appear here.',
    astro_empty_transactions_title: 'No transactions yet',
    astro_empty_transactions_desc: 'Completed consultations will appear here as transactions.',
    astro_empty_reviews_title: 'No reviews yet',
    astro_empty_reviews_desc: 'Client reviews will appear here once you complete consultations.',
    astro_empty_notifications_title: 'No notifications',
    astro_empty_notifications_desc: "You're all caught up.",
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
    seek_card_marriage_cta: 'रिश्ते को समझें →',
    seek_card_career_cta: 'करियर को जानें →',
    seek_card_money_cta: 'समृद्धि को समझें →',
    seek_card_family_cta: 'विरासत को जानें →',
    seek_card_growth_cta: 'व्यक्तिगत विकास जानें →',
    seek_card_spirituality_cta: 'आध्यात्मिकता को जानें →',
    seek_card_vastu_cta: 'वास्तु का विश्लेषण करें →',
    tools_kundli_milan_cta: 'अनुकूलता जांचें →',
    tools_nakshatra_cta: 'नक्षत्र जानें →',

    btn_add_to_cart: 'अभी खरीदें',
    btn_enroll: 'प्रवेश लें',
    btn_view_details: 'विवरण देखें',
    btn_chat: 'चैट',
    btn_call: 'कॉल',
    lbl_online: 'ऑनलाइन',
    lbl_offline: 'ऑफ़लाइन',
    lbl_per_min: '/मिनट',
    lbl_yrs: 'वर्ष',
    lbl_consults: 'परामर्श',

    cat_gemstones: 'रत्न',
    cat_rudraksha: 'रुद्राक्ष',
    cat_crystals: 'स्फटिक',
    cat_bracelets: 'माला और ब्रेसलेट',
    cat_yantras: 'यंत्र',
    cat_puja_essentials: 'पूजा सामग्री',
    cat_all: 'सभी उपाय',
    cat_career: 'करियर',
    cat_love: 'प्रेम व संबंध',
    cat_marriage: 'विवाह',
    cat_general: 'सामान्य',
    cat_finance: 'वित्त व धन',
    cat_spirituality: 'आध्यात्मिकता',
    cat_astrology: 'ज्योतिष',
    cat_numerology: 'अंकशास्त्र',
    cat_tarot: 'टैरो',

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

    // Footer
    footer_tagline: 'आपका आकाश। आपकी कहानी।',
    footer_desc: 'व्यक्तिगत वैदिक ज्योतिष, विशेषज्ञ परामर्श, बुद्धिमान एआई मार्गदर्शन और कालातीत ज्ञान का आधुनिक संगम।',
    footer_newsletter_label: 'सारगर्भित ज्योतिष अंतर्दृष्टि प्राप्त करें',
    footer_email_placeholder: 'आपका ईमेल पता',
    btn_subscribe: 'सब्सक्राइब करें',
    footer_subscribed: 'आप सफलतापूर्वक सब्सक्राइब हो गए हैं। धन्यवाद।',
    footer_col_consultations: 'परामर्श',
    footer_col_company: 'कंपनी',
    footer_col_support: 'सहायता',
    footer_kundli_matching: 'कुंडली मिलान',
    footer_daily_horoscope: 'दैनिक राशिफल',
    footer_muhurat: 'मुहूर्त',
    footer_find_astrologers: 'आचार्य खोजें',
    footer_chat_consultation: 'चैट परामर्श',
    footer_call_consultation: 'कॉल परामर्श',
    footer_about_us: 'हमारे बारे में',
    footer_our_approach: 'हमारा दृष्टिकोण',
    footer_careers: 'करियर',
    footer_press: 'प्रेस',
    footer_help_centre: 'सहायता केंद्र',
    footer_privacy_policy: 'गोपनीयता नीति',
    footer_terms_of_service: 'सेवा की शर्तें',
    footer_contact_us: 'संपर्क करें',
    footer_copyright: '© 2026 त्रिदेव ज्योतिष। सर्वाधिकार सुरक्षित।',
    footer_privacy_short: 'गोपनीयता',
    footer_terms_short: 'शर्तें',
    footer_cookies_short: 'कुकीज़',
    footer_legal_note: 'ज्योतिष मनोरंजन और आध्यात्मिक मार्गदर्शन हेतु है। यह पेशेवर सलाह का विकल्प नहीं है।',

    // Login Modal
    login_heading_signin_prefix: 'अपनी यात्रा जारी रखने के लिए साइन इन करें ',
    login_heading_signup_prefix: 'शुरू करें ',
    login_heading_em: 'अपनी यात्रा',
    login_subheading_pending: 'इस सुविधा तक पहुंचने के लिए कृपया साइन इन करें।',
    login_subheading_default: 'आपका व्यक्तिगत ज्योतिष अनुभव तैयार है।',
    login_google: 'Google से जारी रखें',
    login_email: 'ईमेल से जारी रखें',
    login_new_here: 'यहाँ नए हैं? ',
    login_have_account: 'पहले से खाता है? ',
    login_create_account: 'खाता बनाएं',
    login_sign_in: 'साइन इन करें',
    login_email_placeholder: 'अपना ईमेल या मोबाइल दर्ज करें',
    login_back: '← वापस',
    login_privacy_prefix: 'जारी रखकर, आप हमारी ',
    login_privacy_and: ' और ',
    login_terms: 'शर्तों',
    login_privacy_policy: 'गोपनीयता नीति',

    // Monk Widget
    monk_cta_title: 'मॉन्क गाइड से पूछें',
    monk_dismiss: 'बंद करें',
    monk_alt: 'पवित्र मॉन्क गाइड',
    monk_notif_1: 'रोहन (नई दिल्ली) ने अभी ज्योतिषी राहुल शास्त्री से चैट बुक की 🪐',
    monk_notif_2: 'पूजा (बेंगलुरु) ने अभी नेचुरल कोलंबियाई पन्ना ऑर्डर किया 💎',
    monk_notif_3: 'आदित्य (मुंबई) ने अभी प्रीमियम कुंडली रिपोर्ट बनाई 📜',
    monk_notif_4: 'स्नेहा (पुणे) ने अभी पंडित मीरा देवी को बुक किया 🌸',
    monk_notif_5: 'अमित (जयपुर) ने अभी पंचमुखी रुद्राक्ष ऑर्डर किया 📿',
    monk_notif_6: 'किरण (इंदौर) ने अभी वैदिक ज्योतिष पूर्ण पाठ्यक्रम में दाखिला लिया 🎓',
    monk_notif_7: 'मीरा (चेन्नई) ने अभी अपनी प्रेम और रिश्ते रिपोर्ट बनाई 💖',
    monk_notif_8: 'राजेश (हैदराबाद) ने अभी डॉ. विक्रम जोशी को बुक किया 🪐',
    monk_notif_9: 'अनन्या (कोलकाता) ने अभी ज्योतिषी प्रिया नायर से कॉल बुक की 📞',
    monk_notif_10: 'सुनील (नोएडा) ने अभी श्री यंत्र (पीतल) ऑर्डर किया 🕉️',

    // Auth Page (manuscript sign-up/sign-in)
    auth_tab_register: 'जन्म विवरण अंकित करें',
    auth_tab_login: 'सदस्य साइन इन',
    auth_subtitle_register: 'प्राचीन वैदिक जन्म पत्र · अपनी कुंडली का विवरण दर्ज करें',
    auth_subtitle_login: 'पवित्र सदस्य कक्ष · संग्रहीत जन्म प्रोफ़ाइल तक पहुंचें',
    auth_label_fullname: 'पूरा नाम *',
    auth_placeholder_fullname: 'उदा. स्पर्श शर्मा',
    auth_label_email: 'ईमेल पता *',
    auth_placeholder_email: 'name@example.com',
    auth_label_password: 'गुप्त पासवर्ड *',
    auth_label_login_email: 'पंजीकृत ईमेल पता *',
    auth_label_login_password: 'पासवर्ड *',
    auth_separator_birth_coords: 'जन्म विवरण',
    auth_label_dob: 'जन्म तिथि *',
    auth_placeholder_dob: 'जन्म तिथि चुनें',
    auth_label_tob: 'जन्म समय *',
    auth_placeholder_tob: 'जन्म समय चुनें',
    auth_label_pob: 'जन्म स्थान (शहर, राज्य) *',
    auth_placeholder_pob: 'उदा. नई दिल्ली, भारत',
    auth_label_gender: 'लिंग',
    auth_gender_male: 'पुरुष',
    auth_gender_female: 'महिला',
    auth_gender_other: 'अन्य',
    auth_btn_inscribing: 'कुंडली अंकित की जा रही है...',
    auth_btn_seal: 'मुद्रा लगाएं →',
    auth_btn_unlocking: 'कक्ष अनलॉक हो रहा है...',
    auth_btn_signin_vault: 'साइन इन करें →',
    auth_success_message: 'प्रणाम {name}! आपका जन्म विवरण ({date}, {time} बजे, {place}) पवित्र वैदिक पांडुलिपि संग्रह में सफलतापूर्वक अंकित कर दिया गया है।',
    auth_btn_continue: '✦ आकाशीय द्वार में प्रवेश करें ✦',
    auth_footer_stamp: 'एन्क्रिप्टेड प्राचीन वैदिक संग्रह',

    // Admin Console
    admin_console_name: 'त्रिदेव ज्योतिष एडमिन',
    admin_console_caption: 'प्रशासन कंसोल',
    admin_search_placeholder: 'खोजें...',
    admin_notifications: 'सूचनाएं',
    admin_profile: 'एडमिन प्रोफ़ाइल',
    admin_logout: 'लॉगआउट',
    admin_sidebar_overview: 'अवलोकन',
    admin_sidebar_applications: 'आवेदन',
    admin_sidebar_astrologers: 'आचार्यगण',
    admin_sidebar_users: 'उपयोगकर्ता',
    admin_sidebar_consultations: 'परामर्श',
    admin_sidebar_reports: 'रिपोर्ट्स',
    admin_sidebar_orders: 'ऑर्डर',
    admin_sidebar_content: 'सामग्री',
    admin_sidebar_notifications: 'सूचनाएं',
    admin_sidebar_audit: 'ऑडिट लॉग',
    admin_sidebar_settings: 'सेटिंग्स',
    admin_status_pending: 'लंबित',
    admin_status_approved: 'स्वीकृत',
    admin_status_rejected: 'अस्वीकृत',
    admin_status_active: 'सक्रिय',
    admin_status_suspended: 'निलंबित',
    admin_status_upcoming: 'आगामी',
    admin_status_live: 'लाइव',
    admin_status_completed: 'पूर्ण',
    admin_status_cancelled: 'रद्द',
    admin_status_all: 'सभी',
    admin_status_paid: 'भुगतान हुआ',
    admin_status_unpaid: 'भुगतान लंबित',
    admin_status_delivered: 'वितरित',
    admin_status_processing: 'प्रक्रिया में',
    admin_status_shipped: 'भेजा गया',
    admin_action_view: 'देखें',
    admin_action_edit: 'संपादित करें',
    admin_action_suspend: 'निलंबित करें',
    admin_action_activate: 'सक्रिय करें',
    admin_action_restore: 'पुनर्स्थापित करें',
    admin_action_approve: 'स्वीकृत करें',
    admin_action_reject: 'अस्वीकृत करें',
    admin_action_request_info: 'जानकारी माँगें',
    admin_action_confirm: 'पुष्टि करें',
    admin_action_cancel: 'रद्द करें',
    admin_action_send: 'भेजें',
    admin_action_close: 'बंद करें',
    admin_action_add_astrologer: 'आचार्य जोड़ें',
    admin_action_save: 'परिवर्तन सहेजें',
    admin_empty_title: 'यहाँ अभी कुछ नहीं है',
    admin_empty_desc: 'इस दृश्य के लिए फ़िलहाल कोई डेटा उपलब्ध नहीं है।',
    admin_search_name_email: 'नाम या ईमेल से खोजें',
    admin_no_results: 'आपकी खोज से कोई परिणाम नहीं मिला।',
    admin_kpi_total_users: 'कुल उपयोगकर्ता',
    admin_kpi_active_users: 'सक्रिय उपयोगकर्ता',
    admin_kpi_astrologers: 'आचार्यगण',
    admin_kpi_pending_applications: 'लंबित आवेदन',
    admin_kpi_todays_consultations: 'आज के परामर्श',
    admin_kpi_revenue: 'राजस्व',
    admin_kpi_reports_generated: 'बनी रिपोर्ट्स',
    admin_kpi_store_orders: 'स्टोर ऑर्डर',
    admin_quick_actions: 'त्वरित कार्य',
    admin_qa_review_applications: 'आवेदन समीक्षा करें',
    admin_qa_add_astrologer: 'आचार्य जोड़ें',
    admin_qa_view_consultations: 'परामर्श देखें',
    admin_qa_manage_reports: 'रिपोर्ट्स प्रबंधित करें',
    admin_qa_manage_store: 'स्टोर प्रबंधित करें',
    admin_qa_send_announcement: 'घोषणा भेजें',
    admin_recent_activity: 'हाल की गतिविधि',
    admin_activity_new_user: '{name} ने नया खाता पंजीकृत किया',
    admin_activity_astrologer_applied: '{name} ने आचार्य बनने हेतु आवेदन किया',
    admin_activity_application_approved: '{name} का आचार्य आवेदन स्वीकृत हुआ',
    admin_activity_application_rejected: '{name} का आचार्य आवेदन अस्वीकृत हुआ',
    admin_activity_consultation_booked: '{user} ने {astrologer} के साथ परामर्श बुक किया',
    admin_activity_report_purchased: '{user} ने {report} रिपोर्ट खरीदी',
    admin_activity_order_completed: 'ऑर्डर {id} पूर्ण हुआ',
    admin_apps_title: 'आचार्य आवेदन',
    admin_apps_col_applicant: 'आवेदक',
    admin_apps_col_experience: 'अनुभव',
    admin_apps_col_languages: 'भाषाएं',
    admin_apps_col_expertise: 'विशेषज्ञता',
    admin_apps_col_submitted: 'प्रस्तुत तिथि',
    admin_apps_col_status: 'स्थिति',
    admin_apps_col_action: 'कार्रवाई',
    admin_apps_drawer_profile: 'प्रोफ़ाइल',
    admin_apps_drawer_professional: 'व्यावसायिक विवरण',
    admin_apps_drawer_documents: 'दस्तावेज़',
    admin_apps_doc_id_proof: 'पहचान प्रमाण',
    admin_apps_doc_certification: 'प्रमाणन',
    admin_apps_doc_resume: 'रिज्यूमे',
    admin_apps_no_docs: 'इस आवेदन के साथ कोई दस्तावेज़ प्रस्तुत नहीं किया गया।',
    admin_apps_confirm_approve_title: 'क्या इस आवेदन को स्वीकृत करें?',
    admin_apps_confirm_approve_desc: 'इससे आवेदक को आचार्य खाता और कंसोल पहुंच प्राप्त होगी।',
    admin_apps_confirm_reject_title: 'क्या इस आवेदन को अस्वीकृत करें?',
    admin_apps_confirm_reject_desc: 'आवेदक को सूचित किया जाएगा कि उनका आवेदन स्वीकृत नहीं हुआ।',
    admin_astro_title: 'आचार्यगण',
    admin_astro_view_cards: 'कार्ड',
    admin_astro_view_table: 'तालिका',
    admin_astro_col_name: 'नाम',
    admin_astro_col_rating: 'रेटिंग',
    admin_astro_col_experience: 'अनुभव',
    admin_astro_col_languages: 'भाषाएं',
    admin_astro_col_consultations: 'परामर्श',
    admin_astro_col_earnings: 'कमाई',
    admin_astro_col_status: 'स्थिति',
    admin_astro_add_title: 'आचार्य जोड़ें',
    admin_astro_add_name: 'पूरा नाम',
    admin_astro_add_email: 'ईमेल पता',
    admin_astro_add_password: 'अस्थायी पासवर्ड',
    admin_astro_tab_overview: 'अवलोकन',
    admin_astro_tab_schedule: 'समय-सारिणी',
    admin_astro_tab_reviews: 'समीक्षाएं',
    admin_astro_tab_earnings: 'कमाई',
    admin_astro_tab_consultations: 'परामर्श',
    admin_astro_tab_documents: 'दस्तावेज़',
    admin_users_title: 'उपयोगकर्ता',
    admin_users_col_user: 'उपयोगकर्ता',
    admin_users_col_joined: 'शामिल हुए',
    admin_users_col_reports: 'रिपोर्ट्स',
    admin_users_col_consultations: 'परामर्श',
    admin_users_col_orders: 'ऑर्डर',
    admin_users_col_status: 'स्थिति',
    admin_consult_title: 'परामर्श',
    admin_consult_col_user: 'उपयोगकर्ता',
    admin_consult_col_astrologer: 'आचार्य',
    admin_consult_col_date: 'तिथि',
    admin_consult_col_time: 'समय',
    admin_consult_col_type: 'प्रकार',
    admin_consult_col_payment: 'भुगतान',
    admin_consult_col_status: 'स्थिति',
    admin_reports_title: 'रिपोर्ट्स',
    admin_reports_kpi_total: 'कुल रिपोर्ट्स',
    admin_reports_kpi_pending: 'लंबित',
    admin_reports_kpi_completed: 'पूर्ण',
    admin_reports_kpi_revenue: 'राजस्व',
    admin_reports_col_user: 'उपयोगकर्ता',
    admin_reports_col_report: 'रिपोर्ट',
    admin_reports_col_price: 'मूल्य',
    admin_reports_col_status: 'स्थिति',
    admin_reports_col_date: 'तिथि',
    admin_orders_title: 'ऑर्डर',
    admin_orders_col_id: 'ऑर्डर आईडी',
    admin_orders_col_customer: 'ग्राहक',
    admin_orders_col_product: 'उत्पाद',
    admin_orders_col_amount: 'राशि',
    admin_orders_col_payment: 'भुगतान',
    admin_orders_col_delivery: 'डिलीवरी स्थिति',
    admin_content_title: 'सामग्री प्रबंधन',
    admin_content_desc: 'प्लेटफ़ॉर्म की प्रकाशित सामग्री प्रबंधित करें। कोई कोड संपादन नहीं — केवल सामग्री।',
    admin_content_homepage: 'होमपेज',
    admin_content_reports: 'रिपोर्ट्स',
    admin_content_panchang: 'पंचांग',
    admin_content_academy: 'गुरुकुल',
    admin_content_store: 'स्टोर',
    admin_content_faq: 'सामान्य प्रश्न',
    admin_content_edit: 'सामग्री संपादित करें',
    admin_content_updated: 'अंतिम अद्यतन',
    admin_content_field_heading: 'शीर्षक',
    admin_content_field_body: 'मुख्य पाठ',
    admin_notif_title: 'घोषणा केंद्र',
    admin_notif_target_all_users: 'सभी उपयोगकर्ता',
    admin_notif_target_all_astrologers: 'सभी आचार्यगण',
    admin_notif_target_specific_user: 'विशिष्ट उपयोगकर्ता',
    admin_notif_field_title: 'शीर्षक',
    admin_notif_field_message: 'संदेश',
    admin_notif_field_audience: 'लक्षित दर्शक',
    admin_notif_field_schedule: 'समय निर्धारण',
    admin_notif_schedule_now: 'अभी भेजें',
    admin_notif_schedule_later: 'बाद के लिए निर्धारित करें',
    admin_notif_field_user_email: 'उपयोगकर्ता ईमेल',
    admin_notif_history: 'इतिहास',
    admin_notif_sent: 'घोषणा सफलतापूर्वक भेजी गई।',
    admin_audit_title: 'ऑडिट लॉग',
    admin_audit_col_timestamp: 'समय-चिह्न',
    admin_audit_col_admin: 'एडमिन',
    admin_audit_col_action: 'कार्रवाई',
    admin_audit_col_target: 'लक्ष्य',
    admin_audit_col_ip: 'आईपी',
    admin_audit_col_status: 'स्थिति',
    admin_settings_title: 'सेटिंग्स',
    admin_settings_general: 'सामान्य',
    admin_settings_languages: 'भाषाएं',
    admin_settings_roles: 'भूमिकाएं',
    admin_settings_notification_templates: 'सूचना टेम्पलेट',
    admin_settings_payment: 'भुगतान सेटिंग्स',
    admin_settings_system_prefs: 'सिस्टम प्राथमिकताएं',
    admin_settings_readonly_note: 'सेटिंग्स प्रबंधन केवल प्रशासकों के लिए उपलब्ध है।',

    // Astrologist Console
    astro_console_title: 'ज्योतिषी कंसोल',
    astro_console_sub: 'अपने परामर्श, उपलब्धता और आय प्रबंधित करें',
    astro_role_label: 'ज्योतिषी',
    astro_sign_out: 'साइन आउट',
    astro_suspended_banner: 'आपका खाता त्रिदेव ज्योतिष द्वारा निलंबित कर दिया गया है। जब तक इसे पुनः सक्रिय नहीं किया जाता, तब तक आप नई बुकिंग स्वीकार नहीं कर सकते और सार्वजनिक खोज में नहीं दिखेंगे।',
    astro_status_available: 'उपलब्ध',
    astro_status_busy: 'व्यस्त',
    astro_status_offline: 'ऑफ़लाइन',
    astro_nav_overview: 'अवलोकन',
    astro_nav_consultations: 'परामर्श',
    astro_nav_clients: 'ग्राहक',
    astro_nav_availability: 'उपलब्धता',
    astro_nav_earnings: 'आय',
    astro_nav_reviews: 'समीक्षाएं',
    astro_nav_profile: 'ज्योतिषी प्रोफ़ाइल',
    astro_nav_notifications: 'सूचनाएं',
    astro_nav_settings: 'सेटिंग्स',
    astro_greeting_morning: 'सुप्रभात',
    astro_greeting_afternoon: 'नमस्कार',
    astro_greeting_evening: 'शुभ संध्या',
    astro_overview_tagline: 'आपकी ज्योतिष प्रैक्टिस एक नज़र में',
    astro_kpi_today: 'आज के परामर्श',
    astro_kpi_pending: 'लंबित अनुरोध',
    astro_kpi_month_earnings: 'इस माह की आय',
    astro_kpi_rating: 'औसत रेटिंग',
    astro_todays_schedule: 'आज का शेड्यूल',
    astro_pending_requests: 'लंबित अनुरोध',
    astro_view_all: 'सभी देखें',
    astro_min: 'मिनट',
    astro_action_accept: 'स्वीकार करें',
    astro_action_decline: 'अस्वीकार करें',
    astro_action_complete: 'पूर्ण के रूप में चिह्नित करें',
    astro_action_cancel: 'रद्द करें',
    astro_action_save_notes: 'नोट्स सहेजें',
    astro_private_notes: 'निजी नोट्स',
    astro_private_notes_placeholder: 'अपने लिए नोट्स — ग्राहक को कभी नहीं दिखाए जाते।',
    astro_payout_status: 'भुगतान स्थिति',
    astro_subtab_upcoming: 'आगामी',
    astro_subtab_requests: 'अनुरोध',
    astro_subtab_history: 'इतिहास',
    astro_recently_decided: 'हाल ही में तय किए गए',
    astro_search_clients: 'नाम से ग्राहक खोजें...',
    astro_consultations_count: 'परामर्श',
    astro_last: 'पिछला',
    astro_next: 'अगला',
    astro_working_days: 'कार्य दिवस',
    astro_day_sun: 'रवि',
    astro_day_mon: 'सोम',
    astro_day_tue: 'मंगल',
    astro_day_wed: 'बुध',
    astro_day_thu: 'गुरु',
    astro_day_fri: 'शुक्र',
    astro_day_sat: 'शनि',
    astro_time_slots: 'समय स्लॉट',
    astro_action_add_slot: 'स्लॉट जोड़ें',
    astro_consultation_duration: 'परामर्श अवधि',
    astro_buffer_time: 'परामर्शों के बीच बफर समय',
    astro_blocked_time: 'अवरुद्ध समय',
    astro_no_blocked_time: 'कोई अवरुद्ध समय अवधि नहीं है।',
    astro_reason_placeholder: 'कारण (निजी, सार्वजनिक रूप से नहीं दिखाया जाता)',
    astro_action_block_time: 'समय अवरुद्ध करें',
    astro_earnings_total: 'कुल आय',
    astro_earnings_month: 'इस माह',
    astro_earnings_week: 'इस सप्ताह',
    astro_earnings_pending_payout: 'लंबित भुगतान',
    astro_earnings_completed_payout: 'पूर्ण भुगतान',
    astro_transactions: 'लेन-देन इतिहास',
    astro_average_rating: 'औसत रेटिंग',
    astro_total_reviews: 'कुल समीक्षाएं',
    astro_recent_reviews: 'हाल की समीक्षाएं',
    astro_profile_completion: 'प्रोफ़ाइल पूर्णता',
    astro_missing: 'शेष',
    astro_profile_title: 'व्यावसायिक उपाधि',
    astro_profile_bio: 'जीवन परिचय',
    astro_profile_expertise: 'परामर्श श्रेणियां',
    astro_profile_languages: 'भाषाएं',
    astro_profile_public_toggle: 'सार्वजनिक प्रोफ़ाइल',
    astro_profile_public_desc: 'सार्वजनिक ज्योतिषी खोज में दिखाई देता है।',
    astro_public_disabled_suspended: 'खाता निलंबित होने तक सार्वजनिक खोज से छिपा हुआ है।',
    astro_view_public_profile: 'सार्वजनिक प्रोफ़ाइल देखें',
    astro_mark_all_read: 'सभी को पढ़ा हुआ चिह्नित करें',
    astro_settings_account: 'खाता',
    astro_empty_schedule_title: 'आज कोई परामर्श निर्धारित नहीं है',
    astro_empty_schedule_desc: 'आज के लिए आपके स्वीकृत परामर्श यहां दिखाई देंगे।',
    astro_empty_requests_title: 'कोई लंबित अनुरोध नहीं',
    astro_empty_requests_desc: 'ग्राहकों से नए परामर्श अनुरोध यहां दिखाई देंगे।',
    astro_empty_upcoming_title: 'कोई आगामी परामर्श नहीं',
    astro_empty_upcoming_desc: 'स्वीकृत अनुरोध यहां आगामी परामर्श के रूप में दिखाई देंगे।',
    astro_empty_history_title: 'अभी तक कोई परामर्श इतिहास नहीं',
    astro_empty_history_desc: 'पूर्ण और रद्द किए गए परामर्श यहां दिखाई देंगे।',
    astro_empty_clients_title: 'अभी तक कोई ग्राहक नहीं',
    astro_empty_clients_desc: 'जिन ग्राहकों से आपने परामर्श किया है वे यहां दिखाई देंगे।',
    astro_empty_transactions_title: 'अभी तक कोई लेन-देन नहीं',
    astro_empty_transactions_desc: 'पूर्ण परामर्श यहां लेन-देन के रूप में दिखाई देंगे।',
    astro_empty_reviews_title: 'अभी तक कोई समीक्षा नहीं',
    astro_empty_reviews_desc: 'परामर्श पूर्ण करने के बाद ग्राहक समीक्षाएं यहां दिखाई देंगी।',
    astro_empty_notifications_title: 'कोई सूचना नहीं',
    astro_empty_notifications_desc: 'आप पूरी तरह अद्यतित हैं।',
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
    seek_card_marriage_cta: 'नाते समजून घ्या →',
    seek_card_career_cta: 'करिअर जाणून घ्या →',
    seek_card_money_cta: 'समृद्धी समजून घ्या →',
    seek_card_family_cta: 'वारसा जाणून घ्या →',
    seek_card_growth_cta: 'वैयक्तिक विकास पहा →',
    seek_card_spirituality_cta: 'आध्यात्मिकता जाणून घ्या →',
    seek_card_vastu_cta: 'वास्तु विश्लेषण पहा →',
    tools_kundli_milan_cta: 'सुसंगतता तपासा →',
    tools_nakshatra_cta: 'नक्षत्र जाणून घ्या →',

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

    // Footer
    footer_tagline: 'तुमचे आकाश। तुमची कहाणी।',
    footer_desc: 'वैयक्तिकृत वैदिक ज्योतिष, तज्ञ सल्ला, बुद्धिमान एआय मार्गदर्शन आणि शाश्वत ज्ञानाचा आधुनिक संगम.',
    footer_newsletter_label: 'अर्थपूर्ण ज्योतिष अंतर्दृष्टी मिळवा',
    footer_email_placeholder: 'तुमचा ईमेल पत्ता',
    btn_subscribe: 'सबस्क्राइब करा',
    footer_subscribed: 'तुम्ही यशस्वीरित्या सबस्क्राइब झाला आहात. धन्यवाद.',
    footer_col_consultations: 'सल्लामसलत',
    footer_col_company: 'कंपनी',
    footer_col_support: 'सहाय्य',
    footer_kundli_matching: 'कुंडली जुळवणी',
    footer_daily_horoscope: 'दैनिक राशीभविष्य',
    footer_muhurat: 'मुहूर्त',
    footer_find_astrologers: 'आचार्य शोधा',
    footer_chat_consultation: 'चॅट सल्ला',
    footer_call_consultation: 'कॉल सल्ला',
    footer_about_us: 'आमच्याबद्दल',
    footer_our_approach: 'आमचा दृष्टिकोन',
    footer_careers: 'करिअर',
    footer_press: 'प्रेस',
    footer_help_centre: 'मदत केंद्र',
    footer_privacy_policy: 'गोपनीयता धोरण',
    footer_terms_of_service: 'सेवा अटी',
    footer_contact_us: 'संपर्क करा',
    footer_copyright: '© 2026 त्रिदेव ज्योतिष. सर्व हक्क राखीव.',
    footer_privacy_short: 'गोपनीयता',
    footer_terms_short: 'अटी',
    footer_cookies_short: 'कुकीज',
    footer_legal_note: 'ज्योतिष हे मनोरंजन आणि आध्यात्मिक मार्गदर्शनासाठी आहे. ही व्यावसायिक सल्ल्याची जागा घेत नाही.',

    // Login Modal
    login_heading_signin_prefix: 'तुमचा प्रवास सुरू ठेवण्यासाठी साइन इन करा ',
    login_heading_signup_prefix: 'सुरुवात करा ',
    login_heading_em: 'तुमचा प्रवास',
    login_subheading_pending: 'ही सुविधा वापरण्यासाठी कृपया साइन इन करा.',
    login_subheading_default: 'तुमचा वैयक्तिकृत ज्योतिष अनुभव तयार आहे.',
    login_google: 'Google सह सुरू ठेवा',
    login_email: 'ईमेलने सुरू ठेवा',
    login_new_here: 'इथे नवीन आहात? ',
    login_have_account: 'आधीच खाते आहे? ',
    login_create_account: 'खाते तयार करा',
    login_sign_in: 'साइन इन करा',
    login_email_placeholder: 'तुमचा ईमेल किंवा मोबाइल टाका',
    login_back: '← मागे',
    login_privacy_prefix: 'सुरू ठेवून, तुम्ही आमच्या ',
    login_privacy_and: ' आणि ',
    login_terms: 'अटी',
    login_privacy_policy: 'गोपनीयता धोरणा',

    // Monk Widget
    monk_cta_title: 'मॉन्क गाइडला विचारा',
    monk_dismiss: 'बंद करा',
    monk_alt: 'पवित्र मॉन्क गाइड',
    monk_notif_1: 'रोहन (नवी दिल्ली) यांनी नुकतीच ज्योतिषी राहुल शास्त्री यांच्याशी चॅट बुक केली 🪐',
    monk_notif_2: 'पूजा (बेंगळुरू) यांनी नुकतेच नैसर्गिक कोलंबियन पाचू ऑर्डर केले 💎',
    monk_notif_3: 'आदित्य (मुंबई) यांनी नुकताच प्रीमियम कुंडली अहवाल तयार केला 📜',
    monk_notif_4: 'स्नेहा (पुणे) यांनी नुकतेच पंडित मीरा देवी यांना बुक केले 🌸',
    monk_notif_5: 'अमित (जयपूर) यांनी नुकतेच पंचमुखी रुद्राक्ष ऑर्डर केले 📿',
    monk_notif_6: 'किरण (इंदूर) यांनी नुकताच वैदिक ज्योतिष पूर्ण अभ्यासक्रमात प्रवेश घेतला 🎓',
    monk_notif_7: 'मीरा (चेन्नई) यांनी नुकताच त्यांचा प्रेम आणि नातेसंबंध अहवाल तयार केला 💖',
    monk_notif_8: 'राजेश (हैदराबाद) यांनी नुकतेच डॉ. विक्रम जोशी यांना बुक केले 🪐',
    monk_notif_9: 'अनन्या (कोलकाता) यांनी नुकताच ज्योतिषी प्रिया नायर यांच्याशी कॉल बुक केला 📞',
    monk_notif_10: 'सुनील (नोएडा) यांनी नुकतेच श्री यंत्र (पितळ) ऑर्डर केले 🕉️',

    // Auth Page (manuscript sign-up/sign-in)
    auth_tab_register: 'जन्म तपशील नोंदवा',
    auth_tab_login: 'सदस्य साइन इन',
    auth_subtitle_register: 'प्राचीन वैदिक जन्मपत्रिका · तुमची कुंडली माहिती भरा',
    auth_subtitle_login: 'पवित्र सदस्य कक्ष · जतन केलेल्या जन्म प्रोफाइलमध्ये प्रवेश करा',
    auth_label_fullname: 'पूर्ण नाव *',
    auth_placeholder_fullname: 'उदा. स्पर्श शर्मा',
    auth_label_email: 'ईमेल पत्ता *',
    auth_placeholder_email: 'name@example.com',
    auth_label_password: 'गुप्त पासवर्ड *',
    auth_label_login_email: 'नोंदणीकृत ईमेल पत्ता *',
    auth_label_login_password: 'पासवर्ड *',
    auth_separator_birth_coords: 'जन्म तपशील',
    auth_label_dob: 'जन्मतारीख *',
    auth_placeholder_dob: 'जन्मतारीख निवडा',
    auth_label_tob: 'जन्मवेळ *',
    auth_placeholder_tob: 'जन्मवेळ निवडा',
    auth_label_pob: 'जन्मस्थान (शहर, राज्य) *',
    auth_placeholder_pob: 'उदा. नवी दिल्ली, भारत',
    auth_label_gender: 'लिंग',
    auth_gender_male: 'पुरुष',
    auth_gender_female: 'स्त्री',
    auth_gender_other: 'इतर',
    auth_btn_inscribing: 'कुंडली नोंदवली जात आहे...',
    auth_btn_seal: 'मुद्रा लावा →',
    auth_btn_unlocking: 'कक्ष अनलॉक होत आहे...',
    auth_btn_signin_vault: 'साइन इन करा →',
    auth_success_message: 'नमस्कार {name}! तुमचे जन्म तपशील ({date}, {time} वाजता, {place}) पवित्र वैदिक हस्तलिखित संग्रहात यशस्वीरित्या नोंदवले गेले आहेत.',
    auth_btn_continue: '✦ खगोलीय द्वारातून प्रवेश करा ✦',
    auth_footer_stamp: 'एन्क्रिप्टेड प्राचीन वैदिक संग्रह',

    // Admin Console
    admin_console_name: 'त्रिदेव ज्योतिष अ‍ॅडमिन',
    admin_console_caption: 'प्रशासन कन्सोल',
    admin_search_placeholder: 'शोधा...',
    admin_notifications: 'सूचना',
    admin_profile: 'अ‍ॅडमिन प्रोफाइल',
    admin_logout: 'लॉगआउट',
    admin_sidebar_overview: 'अवलोकन',
    admin_sidebar_applications: 'अर्ज',
    admin_sidebar_astrologers: 'आचार्य',
    admin_sidebar_users: 'वापरकर्ते',
    admin_sidebar_consultations: 'सल्लामसलत',
    admin_sidebar_reports: 'अहवाल',
    admin_sidebar_orders: 'ऑर्डर',
    admin_sidebar_content: 'मजकूर',
    admin_sidebar_notifications: 'सूचना',
    admin_sidebar_audit: 'ऑडिट लॉग',
    admin_sidebar_settings: 'सेटिंग्ज',
    admin_status_pending: 'प्रलंबित',
    admin_status_approved: 'मंजूर',
    admin_status_rejected: 'नाकारले',
    admin_status_active: 'सक्रिय',
    admin_status_suspended: 'निलंबित',
    admin_status_upcoming: 'आगामी',
    admin_status_live: 'थेट',
    admin_status_completed: 'पूर्ण',
    admin_status_cancelled: 'रद्द',
    admin_status_all: 'सर्व',
    admin_status_paid: 'भरणा झाला',
    admin_status_unpaid: 'भरणा प्रलंबित',
    admin_status_delivered: 'वितरित',
    admin_status_processing: 'प्रक्रियेत',
    admin_status_shipped: 'पाठवले',
    admin_action_view: 'पहा',
    admin_action_edit: 'संपादित करा',
    admin_action_suspend: 'निलंबित करा',
    admin_action_activate: 'सक्रिय करा',
    admin_action_restore: 'पुनर्स्थापित करा',
    admin_action_approve: 'मंजूर करा',
    admin_action_reject: 'नाकारा',
    admin_action_request_info: 'माहिती मागवा',
    admin_action_confirm: 'निश्चित करा',
    admin_action_cancel: 'रद्द करा',
    admin_action_send: 'पाठवा',
    admin_action_close: 'बंद करा',
    admin_action_add_astrologer: 'आचार्य जोडा',
    admin_action_save: 'बदल जतन करा',
    admin_empty_title: 'येथे अजून काही नाही',
    admin_empty_desc: 'या विभागासाठी सध्या कोणताही डेटा उपलब्ध नाही.',
    admin_search_name_email: 'नाव किंवा ईमेलने शोधा',
    admin_no_results: 'तुमच्या शोधाशी जुळणारे कोणतेही परिणाम नाहीत.',
    admin_kpi_total_users: 'एकूण वापरकर्ते',
    admin_kpi_active_users: 'सक्रिय वापरकर्ते',
    admin_kpi_astrologers: 'आचार्य',
    admin_kpi_pending_applications: 'प्रलंबित अर्ज',
    admin_kpi_todays_consultations: 'आजची सल्लामसलत',
    admin_kpi_revenue: 'महसूल',
    admin_kpi_reports_generated: 'तयार अहवाल',
    admin_kpi_store_orders: 'स्टोअर ऑर्डर',
    admin_quick_actions: 'त्वरित कृती',
    admin_qa_review_applications: 'अर्जांचे पुनरावलोकन करा',
    admin_qa_add_astrologer: 'आचार्य जोडा',
    admin_qa_view_consultations: 'सल्लामसलत पहा',
    admin_qa_manage_reports: 'अहवाल व्यवस्थापित करा',
    admin_qa_manage_store: 'स्टोअर व्यवस्थापित करा',
    admin_qa_send_announcement: 'घोषणा पाठवा',
    admin_recent_activity: 'अलीकडील क्रियाकलाप',
    admin_activity_new_user: '{name} यांनी नवीन खाते नोंदणी केली',
    admin_activity_astrologer_applied: '{name} यांनी आचार्य होण्यासाठी अर्ज केला',
    admin_activity_application_approved: '{name} यांचा आचार्य अर्ज मंजूर झाला',
    admin_activity_application_rejected: '{name} यांचा आचार्य अर्ज नाकारला गेला',
    admin_activity_consultation_booked: '{user} यांनी {astrologer} सोबत सल्ला बुक केला',
    admin_activity_report_purchased: '{user} यांनी {report} अहवाल विकत घेतला',
    admin_activity_order_completed: 'ऑर्डर {id} पूर्ण झाली',
    admin_apps_title: 'आचार्य अर्ज',
    admin_apps_col_applicant: 'अर्जदार',
    admin_apps_col_experience: 'अनुभव',
    admin_apps_col_languages: 'भाषा',
    admin_apps_col_expertise: 'तज्ज्ञता',
    admin_apps_col_submitted: 'सादर तारीख',
    admin_apps_col_status: 'स्थिती',
    admin_apps_col_action: 'कृती',
    admin_apps_drawer_profile: 'प्रोफाइल',
    admin_apps_drawer_professional: 'व्यावसायिक तपशील',
    admin_apps_drawer_documents: 'कागदपत्रे',
    admin_apps_doc_id_proof: 'ओळखपत्र',
    admin_apps_doc_certification: 'प्रमाणपत्र',
    admin_apps_doc_resume: 'रेझ्युमे',
    admin_apps_no_docs: 'या अर्जासोबत कोणतेही कागदपत्र सादर केलेले नाही.',
    admin_apps_confirm_approve_title: 'हा अर्ज मंजूर करायचा आहे का?',
    admin_apps_confirm_approve_desc: 'यामुळे अर्जदाराला आचार्य खाते व कन्सोल प्रवेश मिळेल.',
    admin_apps_confirm_reject_title: 'हा अर्ज नाकारायचा आहे का?',
    admin_apps_confirm_reject_desc: 'अर्जदाराला त्यांचा अर्ज मंजूर न झाल्याचे कळवले जाईल.',
    admin_astro_title: 'आचार्य',
    admin_astro_view_cards: 'कार्ड',
    admin_astro_view_table: 'तक्ता',
    admin_astro_col_name: 'नाव',
    admin_astro_col_rating: 'रेटिंग',
    admin_astro_col_experience: 'अनुभव',
    admin_astro_col_languages: 'भाषा',
    admin_astro_col_consultations: 'सल्लामसलत',
    admin_astro_col_earnings: 'कमाई',
    admin_astro_col_status: 'स्थिती',
    admin_astro_add_title: 'आचार्य जोडा',
    admin_astro_add_name: 'पूर्ण नाव',
    admin_astro_add_email: 'ईमेल पत्ता',
    admin_astro_add_password: 'तात्पुरता पासवर्ड',
    admin_astro_tab_overview: 'अवलोकन',
    admin_astro_tab_schedule: 'वेळापत्रक',
    admin_astro_tab_reviews: 'अभिप्राय',
    admin_astro_tab_earnings: 'कमाई',
    admin_astro_tab_consultations: 'सल्लामसलत',
    admin_astro_tab_documents: 'कागदपत्रे',
    admin_users_title: 'वापरकर्ते',
    admin_users_col_user: 'वापरकर्ता',
    admin_users_col_joined: 'सामील झाले',
    admin_users_col_reports: 'अहवाल',
    admin_users_col_consultations: 'सल्लामसलत',
    admin_users_col_orders: 'ऑर्डर',
    admin_users_col_status: 'स्थिती',
    admin_consult_title: 'सल्लामसलत',
    admin_consult_col_user: 'वापरकर्ता',
    admin_consult_col_astrologer: 'आचार्य',
    admin_consult_col_date: 'तारीख',
    admin_consult_col_time: 'वेळ',
    admin_consult_col_type: 'प्रकार',
    admin_consult_col_payment: 'भरणा',
    admin_consult_col_status: 'स्थिती',
    admin_reports_title: 'अहवाल',
    admin_reports_kpi_total: 'एकूण अहवाल',
    admin_reports_kpi_pending: 'प्रलंबित',
    admin_reports_kpi_completed: 'पूर्ण',
    admin_reports_kpi_revenue: 'महसूल',
    admin_reports_col_user: 'वापरकर्ता',
    admin_reports_col_report: 'अहवाल',
    admin_reports_col_price: 'किंमत',
    admin_reports_col_status: 'स्थिती',
    admin_reports_col_date: 'तारीख',
    admin_orders_title: 'ऑर्डर',
    admin_orders_col_id: 'ऑर्डर आयडी',
    admin_orders_col_customer: 'ग्राहक',
    admin_orders_col_product: 'उत्पादन',
    admin_orders_col_amount: 'रक्कम',
    admin_orders_col_payment: 'भरणा',
    admin_orders_col_delivery: 'वितरण स्थिती',
    admin_content_title: 'मजकूर व्यवस्थापन',
    admin_content_desc: 'प्लॅटफॉर्मवरील प्रकाशित मजकूर व्यवस्थापित करा. कोणतेही कोड संपादन नाही — फक्त मजकूर.',
    admin_content_homepage: 'मुख्यपृष्ठ',
    admin_content_reports: 'अहवाल',
    admin_content_panchang: 'पंचांग',
    admin_content_academy: 'गुरुकुल',
    admin_content_store: 'स्टोअर',
    admin_content_faq: 'सामान्य प्रश्न',
    admin_content_edit: 'मजकूर संपादित करा',
    admin_content_updated: 'शेवटचे अद्यतन',
    admin_content_field_heading: 'शीर्षक',
    admin_content_field_body: 'मुख्य मजकूर',
    admin_notif_title: 'घोषणा केंद्र',
    admin_notif_target_all_users: 'सर्व वापरकर्ते',
    admin_notif_target_all_astrologers: 'सर्व आचार्य',
    admin_notif_target_specific_user: 'विशिष्ट वापरकर्ता',
    admin_notif_field_title: 'शीर्षक',
    admin_notif_field_message: 'संदेश',
    admin_notif_field_audience: 'लक्ष्य प्रेक्षक',
    admin_notif_field_schedule: 'वेळापत्रक',
    admin_notif_schedule_now: 'आत्ता पाठवा',
    admin_notif_schedule_later: 'नंतरसाठी नियोजित करा',
    admin_notif_field_user_email: 'वापरकर्ता ईमेल',
    admin_notif_history: 'इतिहास',
    admin_notif_sent: 'घोषणा यशस्वीरित्या पाठवली गेली.',
    admin_audit_title: 'ऑडिट लॉग',
    admin_audit_col_timestamp: 'वेळनोंद',
    admin_audit_col_admin: 'अ‍ॅडमिन',
    admin_audit_col_action: 'कृती',
    admin_audit_col_target: 'लक्ष्य',
    admin_audit_col_ip: 'आयपी',
    admin_audit_col_status: 'स्थिती',
    admin_settings_title: 'सेटिंग्ज',
    admin_settings_general: 'सामान्य',
    admin_settings_languages: 'भाषा',
    admin_settings_roles: 'भूमिका',
    admin_settings_notification_templates: 'सूचना टेम्पलेट्स',
    admin_settings_payment: 'भरणा सेटिंग्ज',
    admin_settings_system_prefs: 'सिस्टम प्राधान्ये',
    admin_settings_readonly_note: 'सेटिंग्ज व्यवस्थापन केवळ प्रशासकांसाठी उपलब्ध आहे.',

    // Astrologist Console
    astro_console_title: 'ज्योतिषी कन्सोल',
    astro_console_sub: 'तुमचे सल्ला सत्रे, उपलब्धता आणि कमाई व्यवस्थापित करा',
    astro_role_label: 'ज्योतिषी',
    astro_sign_out: 'साइन आउट',
    astro_suspended_banner: 'तुमचे खाते त्रिदेव ज्योतिषने निलंबित केले आहे. ते पुन्हा सक्रिय होईपर्यंत तुम्ही नवीन बुकिंग स्वीकारू शकत नाही आणि सार्वजनिक शोधात दिसणार नाही.',
    astro_status_available: 'उपलब्ध',
    astro_status_busy: 'व्यस्त',
    astro_status_offline: 'ऑफलाइन',
    astro_nav_overview: 'आढावा',
    astro_nav_consultations: 'सल्ला सत्रे',
    astro_nav_clients: 'ग्राहक',
    astro_nav_availability: 'उपलब्धता',
    astro_nav_earnings: 'कमाई',
    astro_nav_reviews: 'समीक्षा',
    astro_nav_profile: 'ज्योतिषी प्रोफाइल',
    astro_nav_notifications: 'सूचना',
    astro_nav_settings: 'सेटिंग्ज',
    astro_greeting_morning: 'शुभ सकाळ',
    astro_greeting_afternoon: 'नमस्कार',
    astro_greeting_evening: 'शुभ संध्याकाळ',
    astro_overview_tagline: 'तुमची ज्योतिष प्रॅक्टिस एका दृष्टीक्षेपात',
    astro_kpi_today: 'आजची सल्ला सत्रे',
    astro_kpi_pending: 'प्रलंबित विनंत्या',
    astro_kpi_month_earnings: 'या महिन्याची कमाई',
    astro_kpi_rating: 'सरासरी रेटिंग',
    astro_todays_schedule: 'आजचे वेळापत्रक',
    astro_pending_requests: 'प्रलंबित विनंत्या',
    astro_view_all: 'सर्व पहा',
    astro_min: 'मिनिटे',
    astro_action_accept: 'स्वीकार करा',
    astro_action_decline: 'नाकारा',
    astro_action_complete: 'पूर्ण म्हणून चिन्हांकित करा',
    astro_action_cancel: 'रद्द करा',
    astro_action_save_notes: 'नोंदी जतन करा',
    astro_private_notes: 'खाजगी नोंदी',
    astro_private_notes_placeholder: 'स्वतःसाठी नोंदी — ग्राहकाला कधीही दाखवल्या जात नाहीत.',
    astro_payout_status: 'भरणा स्थिती',
    astro_subtab_upcoming: 'आगामी',
    astro_subtab_requests: 'विनंत्या',
    astro_subtab_history: 'इतिहास',
    astro_recently_decided: 'नुकतेच ठरवलेले',
    astro_search_clients: 'नावाने ग्राहक शोधा...',
    astro_consultations_count: 'सल्ला सत्रे',
    astro_last: 'शेवटचे',
    astro_next: 'पुढील',
    astro_working_days: 'कामाचे दिवस',
    astro_day_sun: 'रवि',
    astro_day_mon: 'सोम',
    astro_day_tue: 'मंगळ',
    astro_day_wed: 'बुध',
    astro_day_thu: 'गुरु',
    astro_day_fri: 'शुक्र',
    astro_day_sat: 'शनि',
    astro_time_slots: 'वेळ स्लॉट्स',
    astro_action_add_slot: 'स्लॉट जोडा',
    astro_consultation_duration: 'सल्ला सत्राचा कालावधी',
    astro_buffer_time: 'सत्रांमधील बफर वेळ',
    astro_blocked_time: 'अवरोधित वेळ',
    astro_no_blocked_time: 'कोणताही अवरोधित कालावधी नाही.',
    astro_reason_placeholder: 'कारण (खाजगी, सार्वजनिकरित्या दाखवले जात नाही)',
    astro_action_block_time: 'वेळ अवरोधित करा',
    astro_earnings_total: 'एकूण कमाई',
    astro_earnings_month: 'या महिन्यात',
    astro_earnings_week: 'या आठवड्यात',
    astro_earnings_pending_payout: 'प्रलंबित भरणा',
    astro_earnings_completed_payout: 'पूर्ण झालेला भरणा',
    astro_transactions: 'व्यवहार इतिहास',
    astro_average_rating: 'सरासरी रेटिंग',
    astro_total_reviews: 'एकूण समीक्षा',
    astro_recent_reviews: 'अलीकडील समीक्षा',
    astro_profile_completion: 'प्रोफाइल पूर्णता',
    astro_missing: 'बाकी',
    astro_profile_title: 'व्यावसायिक पदवी',
    astro_profile_bio: 'परिचय',
    astro_profile_expertise: 'सल्ला श्रेणी',
    astro_profile_languages: 'भाषा',
    astro_profile_public_toggle: 'सार्वजनिक प्रोफाइल',
    astro_profile_public_desc: 'सार्वजनिक ज्योतिषी शोधात दृश्यमान.',
    astro_public_disabled_suspended: 'खाते निलंबित असताना सार्वजनिक शोधातून लपवले आहे.',
    astro_view_public_profile: 'सार्वजनिक प्रोफाइल पहा',
    astro_mark_all_read: 'सर्व वाचले म्हणून चिन्हांकित करा',
    astro_settings_account: 'खाते',
    astro_empty_schedule_title: 'आज कोणतेही सल्ला सत्र नियोजित नाही',
    astro_empty_schedule_desc: 'आजचे तुमचे स्वीकृत सल्ला सत्रे येथे दिसतील.',
    astro_empty_requests_title: 'कोणत्याही प्रलंबित विनंत्या नाहीत',
    astro_empty_requests_desc: 'ग्राहकांकडून नवीन सल्ला विनंत्या येथे दिसतील.',
    astro_empty_upcoming_title: 'कोणतेही आगामी सल्ला सत्र नाही',
    astro_empty_upcoming_desc: 'स्वीकृत विनंत्या येथे आगामी सल्ला सत्रे म्हणून दिसतील.',
    astro_empty_history_title: 'अद्याप सल्ला इतिहास नाही',
    astro_empty_history_desc: 'पूर्ण आणि रद्द केलेले सल्ला सत्रे येथे दिसतील.',
    astro_empty_clients_title: 'अद्याप कोणतेही ग्राहक नाहीत',
    astro_empty_clients_desc: 'तुम्ही सल्ला दिलेले ग्राहक येथे दिसतील.',
    astro_empty_transactions_title: 'अद्याप कोणतेही व्यवहार नाहीत',
    astro_empty_transactions_desc: 'पूर्ण झालेले सल्ला सत्रे येथे व्यवहार म्हणून दिसतील.',
    astro_empty_reviews_title: 'अद्याप कोणत्याही समीक्षा नाहीत',
    astro_empty_reviews_desc: 'सल्ला सत्रे पूर्ण केल्यानंतर ग्राहक समीक्षा येथे दिसतील.',
    astro_empty_notifications_title: 'कोणत्याही सूचना नाहीत',
    astro_empty_notifications_desc: 'तुम्ही पूर्णपणे अद्ययावत आहात.',
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

  // Auth State (mock prototype — simulates a backend-authoritative role system via localStorage)
  const [users, setUsersState] = useState<Record<string, StoredAccount>>(() => loadUsers());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    const savedEmail = localStorage.getItem('auth_session');
    if (!savedEmail) return null;
    const acc = loadUsers()[savedEmail];
    return acc ? { id: acc.id, name: acc.name, email: acc.email, role: acc.role } : null;
  });
  const isLoggedIn = !!currentUser;
  const [applications, setApplications] = useState<AstrologerApplication[]>(() => {
    try { return JSON.parse(localStorage.getItem('astro_applications') || '[]'); } catch { return []; }
  });
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('audit_log') || '[]'); } catch { return []; }
  });
  const [notifications, setNotifications] = useState<NotificationEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('notifications') || '[]'); } catch { return []; }
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const persistUsers = (next: Record<string, StoredAccount>) => {
    setUsersState(next);
    localStorage.setItem('auth_users', JSON.stringify(next));
  };

  const startSession = (acc: StoredAccount): AuthUser => {
    const user: AuthUser = { id: acc.id, name: acc.name, email: acc.email, role: acc.role };
    setCurrentUser(user);
    localStorage.setItem('auth_session', acc.email);
    return user;
  };

  const login = (email: string, password: string): AuthUser | null => {
    const acc = users[normalizeEmail(email)];
    if (!acc || acc.password !== password) return null;
    return startSession(acc);
  };

  // Lenient entry point for the quick-login modal (no password field) — logs
  // into an existing account if the email is known, otherwise registers a new USER.
  const loginOrRegister = (email: string): AuthUser => {
    const key = normalizeEmail(email);
    const existing = users[key];
    if (existing) return startSession(existing);
    const acc: StoredAccount = { id: `u-${Date.now()}`, name: email.split('@')[0], email: key, password: '', role: 'USER' };
    const next = { ...users, [key]: acc };
    persistUsers(next);
    return startSession(acc);
  };

  const register = (name: string, email: string, password: string): AuthUser | null => {
    const key = normalizeEmail(email);
    if (users[key]) return null; // account already exists
    const acc: StoredAccount = { id: `u-${Date.now()}`, name, email: key, password, role: 'USER' };
    persistUsers({ ...users, [key]: acc });
    return startSession(acc);
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('auth_session');
  };

  const persistApplications = (next: AstrologerApplication[]) => {
    setApplications(next);
    localStorage.setItem('astro_applications', JSON.stringify(next));
  };

  const logAudit = (action: string, actor: string, target: string) => {
    const entry: AuditLogEntry = { id: `log-${Date.now()}`, action, actor, target, at: new Date().toISOString() };
    const next = [entry, ...auditLog];
    setAuditLog(next);
    localStorage.setItem('audit_log', JSON.stringify(next));
  };

  const notify = (message: string) => {
    const entry: NotificationEntry = { id: `notif-${Date.now()}`, message, at: new Date().toISOString() };
    const next = [entry, ...notifications];
    setNotifications(next);
    localStorage.setItem('notifications', JSON.stringify(next));
  };

  const applyToBecomeAstrologer = (details: { expertise: string; experience: string }) => {
    if (!currentUser) return;
    const app: AstrologerApplication = {
      id: `app-${Date.now()}`,
      userEmail: currentUser.email,
      userName: currentUser.name,
      expertise: details.expertise,
      experience: details.experience,
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
    };
    persistApplications([app, ...applications]);
  };

  const approveApplication = (id: string) => {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    persistApplications(applications.map(a => a.id === id ? { ...a, status: 'APPROVED' as const } : a));
    const acc = users[app.userEmail];
    if (acc) persistUsers({ ...users, [app.userEmail]: { ...acc, role: 'ASTROLOGIST' } });
    logAudit('APPROVE_ASTROLOGER_APPLICATION', currentUser?.email || 'admin', app.userEmail);
    notify(`${app.userName}'s astrologer application was approved.`);
  };

  const rejectApplication = (id: string) => {
    const app = applications.find(a => a.id === id);
    if (!app) return;
    persistApplications(applications.map(a => a.id === id ? { ...a, status: 'REJECTED' as const } : a));
    logAudit('REJECT_ASTROLOGER_APPLICATION', currentUser?.email || 'admin', app.userEmail);
    notify(`${app.userName}'s astrologer application was rejected.`);
  };

  const suspendAccount = (email: string) => {
    const key = normalizeEmail(email);
    const acc = users[key];
    if (!acc) return;
    persistUsers({ ...users, [key]: { ...acc, status: 'SUSPENDED' } });
    logAudit('SUSPEND_ACCOUNT', currentUser?.email || 'admin', key);
  };

  const restoreAccount = (email: string) => {
    const key = normalizeEmail(email);
    const acc = users[key];
    if (!acc) return;
    persistUsers({ ...users, [key]: { ...acc, status: 'ACTIVE' } });
    logAudit('RESTORE_ACCOUNT', currentUser?.email || 'admin', key);
  };

  const createAstrologerAccount = (name: string, email: string, password: string): AuthUser | null => {
    const key = normalizeEmail(email);
    if (users[key]) return null;
    const acc: StoredAccount = { id: `u-${Date.now()}`, name, email: key, password, role: 'ASTROLOGIST', status: 'ACTIVE' };
    persistUsers({ ...users, [key]: acc });
    logAudit('ADD_ASTROLOGER', currentUser?.email || 'admin', key);
    return { id: acc.id, name: acc.name, email: acc.email, role: acc.role, status: acc.status };
  };

  const accounts: AuthUser[] = Object.values(users).map(({ id, name, email, role, status }) => ({ id, name, email, role, status }));

  // ── Astrologist practice-management state (mock prototype, see comment on
  // seedAstrologistDemoData above) ──
  const [allConsultationRequests, setAllConsultationRequests] = useState<ConsultationRequest[]>(() => {
    seedAstrologistDemoData();
    return loadLS<ConsultationRequest[]>('astro_requests', []);
  });
  const [allConsultations, setAllConsultations] = useState<Consultation[]>(() => loadLS<Consultation[]>('astro_consultations', []));
  const [allBlockedSlots, setAllBlockedSlots] = useState<BlockedSlot[]>(() => loadLS<BlockedSlot[]>('astro_blocked_slots', []));
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, AvailabilitySettings>>(() => loadAvailabilityMap());
  const [profileOverrideMap, setProfileOverrideMap] = useState<Record<string, AstrologerProfileOverride>>(() => loadProfileOverrideMap());
  const [allAstrologerNotifications, setAllAstrologerNotifications] = useState<NotificationEntry[]>(() => loadLS<NotificationEntry[]>('astro_notifications', []));
  const [allAstrologerReviews] = useState<AstrologerReview[]>(() => loadLS<AstrologerReview[]>('astro_reviews', []));

  const astrologerEmail = currentUser?.role === 'ASTROLOGIST' ? currentUser.email : '';

  const persistConsultationRequests = (next: ConsultationRequest[]) => {
    setAllConsultationRequests(next);
    localStorage.setItem('astro_requests', JSON.stringify(next));
  };
  const persistConsultations = (next: Consultation[]) => {
    setAllConsultations(next);
    localStorage.setItem('astro_consultations', JSON.stringify(next));
  };
  const persistBlockedSlots = (next: BlockedSlot[]) => {
    setAllBlockedSlots(next);
    localStorage.setItem('astro_blocked_slots', JSON.stringify(next));
  };
  const persistAvailabilityMap = (next: Record<string, AvailabilitySettings>) => {
    setAvailabilityMap(next);
    localStorage.setItem('astro_availability', JSON.stringify(next));
  };
  const persistProfileOverrideMap = (next: Record<string, AstrologerProfileOverride>) => {
    setProfileOverrideMap(next);
    localStorage.setItem('astro_profile_overrides', JSON.stringify(next));
  };
  const persistAstrologerNotifications = (next: NotificationEntry[]) => {
    setAllAstrologerNotifications(next);
    localStorage.setItem('astro_notifications', JSON.stringify(next));
  };

  // Scoped to the signed-in astrologist only — mirrors the ownership checks a
  // real backend would enforce server-side (see AppContext auth note above).
  const consultationRequests = allConsultationRequests.filter(r => r.astrologerEmail === astrologerEmail);
  const consultations = allConsultations.filter(c => c.astrologerEmail === astrologerEmail);
  const blockedSlots = allBlockedSlots.filter(b => b.astrologerEmail === astrologerEmail);
  const availability = availabilityMap[astrologerEmail] || DEFAULT_AVAILABILITY;
  const profileOverride = profileOverrideMap[astrologerEmail] || EMPTY_PROFILE_OVERRIDE;
  const astrologerNotifications = allAstrologerNotifications.filter(n => n.recipientEmail === astrologerEmail);
  const astrologerReviews = allAstrologerReviews.filter(r => r.astrologerEmail === astrologerEmail);

  const acceptConsultationRequest = (id: string) => {
    const req = allConsultationRequests.find(r => r.id === id);
    if (!req) return;
    persistConsultationRequests(allConsultationRequests.map(r => r.id === id ? { ...r, status: 'ACCEPTED' as const } : r));
    const consultation: Consultation = {
      id: `con-${Date.now()}`,
      astrologerEmail: req.astrologerEmail,
      clientName: req.clientName,
      clientEmail: req.clientEmail,
      type: req.type,
      service: req.service,
      scheduledAt: req.requestedFor,
      duration: req.duration,
      amount: req.price,
      status: 'upcoming',
      notes: '',
      payoutStatus: 'PENDING',
    };
    persistConsultations([consultation, ...allConsultations]);
  };

  const declineConsultationRequest = (id: string) => {
    persistConsultationRequests(allConsultationRequests.map(r => r.id === id ? { ...r, status: 'DECLINED' as const } : r));
  };

  const completeConsultation = (id: string) => {
    persistConsultations(allConsultations.map(c => c.id === id ? { ...c, status: 'completed' as const } : c));
  };

  const cancelConsultation = (id: string) => {
    persistConsultations(allConsultations.map(c => c.id === id ? { ...c, status: 'cancelled' as const } : c));
  };

  const saveConsultationNotes = (id: string, notes: string) => {
    persistConsultations(allConsultations.map(c => c.id === id ? { ...c, notes } : c));
  };

  const addBlockedSlot = (slot: Omit<BlockedSlot, 'id' | 'astrologerEmail'>) => {
    if (!astrologerEmail) return;
    const entry: BlockedSlot = { id: `blk-${Date.now()}`, astrologerEmail, ...slot };
    persistBlockedSlots([entry, ...allBlockedSlots]);
  };

  const removeBlockedSlot = (id: string) => {
    persistBlockedSlots(allBlockedSlots.filter(b => b.id !== id));
  };

  const setAvailabilityStatus = (status: AvailabilityStatus) => {
    if (!astrologerEmail) return;
    persistAvailabilityMap({ ...availabilityMap, [astrologerEmail]: { ...availability, status } });
  };

  const updateAvailability = (partial: Partial<AvailabilitySettings>) => {
    if (!astrologerEmail) return;
    persistAvailabilityMap({ ...availabilityMap, [astrologerEmail]: { ...availability, ...partial } });
  };

  const updateProfileOverride = (partial: Partial<AstrologerProfileOverride>) => {
    if (!astrologerEmail) return;
    persistProfileOverrideMap({ ...profileOverrideMap, [astrologerEmail]: { ...profileOverride, ...partial } });
  };

  const markNotificationRead = (id: string) => {
    persistAstrologerNotifications(allAstrologerNotifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = () => {
    persistAstrologerNotifications(allAstrologerNotifications.map(n => n.recipientEmail === astrologerEmail ? { ...n, read: true } : n));
  };

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

  const tOr = (key: string, fallbackKey: string): string => {
    return TRANSLATIONS[language]?.[key] || t(fallbackKey);
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
      isLoggedIn, currentUser, login, loginOrRegister, register, logout,
      pendingAction, setPendingAction,
      showLoginModal, setShowLoginModal,
      accounts, applications, applyToBecomeAstrologer, approveApplication, rejectApplication,
      auditLog, notifications,
      logAdminAction: (action: string, target: string) => logAudit(action, currentUser?.email || 'admin', target),
      suspendAccount, restoreAccount, createAstrologerAccount,
      consultationRequests, consultations,
      acceptConsultationRequest, declineConsultationRequest, completeConsultation, cancelConsultation, saveConsultationNotes,
      blockedSlots, addBlockedSlot, removeBlockedSlot,
      availability, setAvailabilityStatus, updateAvailability,
      profileOverride, updateProfileOverride,
      astrologerNotifications, markNotificationRead, markAllNotificationsRead,
      astrologerReviews,
      language, setLanguage, t, tOr
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

