import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { authService, ApiRequestError } from '../services/authService';
import type { ApiUser, RegisterBirthDetails } from '../services/authService';
import { adminService } from '../services/adminService';
import { paymentService } from '../services/paymentService';

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

export interface PaymentResultInfo {
  status: 'success' | 'failed';
  purpose: 'STORE_ORDER' | 'REPORT_PURCHASE' | 'WALLET_RECHARGE' | 'CONSULTATION' | 'CONSULTATION_EXTEND' | 'SLOT_BOOKING';
  amount: number;
  message?: string;
}

// ── Role-based auth — backed by the real backend (backend/app/api/auth.routes.ts) ──
export type Role = 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN';

// ADMIN/STAFF/ASTROLOGIST are workspace-only roles: they must never see the
// public site, only their own console. Shared by App.tsx (which page) chrome
// to render and the invariant effect in AppProvider below.
export function isWorkspaceRole(role?: Role): boolean {
  return role === 'ADMIN' || role === 'STAFF' || role === 'ASTROLOGIST';
}

export const WORKSPACE_PAGES = ['dashboard', 'profile', 'my-jyotish'];

export type AccountStatus = 'ACTIVE' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status?: AccountStatus;
  birthDate?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
  birthLatitude?: number | null;
  birthLongitude?: number | null;
  birthTimezoneOffsetMinutes?: number | null;
  phoneNumber?: string | null;
  phoneVerified?: boolean;
  freeAiChatSeconds?: number;
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
  kind?: 'request' | 'review' | 'payment' | 'system' | 'profile';
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
  certifications: string;
}

export type ReportStatus = 'DRAFT' | 'IN_PROGRESS' | 'SUBMITTED' | 'COMPLETED';

export interface AstrologerReport {
  id: string;
  astrologerEmail: string;
  clientName: string;
  clientEmail: string;
  reportType: string;
  content: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
}

const normalizeEmail = (email: string) => email.trim().toLowerCase();

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
  certifications: '',
};

// Seeded only for the demo astrologer account (see seedAstrologistDemoData) so
// the dashboard demo has a filled-in profile to show.
const DEFAULT_PROFILE_OVERRIDE: AstrologerProfileOverride = {
  title: '',
  bio: 'Specializes in predictive Vedic astrology with deep expertise in Dashas, transits, and marriage compatibility. Draws on over a decade of consultation experience to give direct, practical guidance.',
  specialization: [],
  languages: [],
  publicVisible: true,
  certifications: 'Jyotish Acharya, Indian Council of Astrological Sciences',
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
      { id: 'an-seed-5', recipientEmail: DEMO_ASTROLOGER_EMAIL, message: 'TredevaAstro platform maintenance scheduled for this weekend.', at: iso(-2, 9, 0), read: true, kind: 'system' },
      { id: 'an-seed-6', recipientEmail: DEMO_ASTROLOGER_EMAIL, message: 'Your astrologer profile was approved and is now publicly visible.', at: iso(-30, 10, 0), read: true, kind: 'profile' },
    );
    localStorage.setItem('astro_notifications', JSON.stringify(notifs));
  }

  const reports = loadLS<AstrologerReport[]>('astro_reports', []);
  if (!reports.some(r => r.astrologerEmail === DEMO_ASTROLOGER_EMAIL)) {
    reports.push(
      { id: 'rpt-seed-1', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Rohit Verma', clientEmail: 'rohit.verma@example.com', reportType: 'Kundli Analysis', content: '', status: 'DRAFT', createdAt: iso(0, 9, 0), updatedAt: iso(0, 9, 0) },
      { id: 'rpt-seed-2', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Kiran Kapoor', clientEmail: 'kiran.kapoor@example.com', reportType: 'Marriage Compatibility', content: 'Nadi dosha not present. Bhakoot matches favourably. Recommended proceeding with the alliance after a Ganesh puja on the proposed date.', status: 'COMPLETED', createdAt: iso(-6, 10, 0), updatedAt: iso(-5, 15, 0) },
      { id: 'rpt-seed-3', astrologerEmail: DEMO_ASTROLOGER_EMAIL, clientName: 'Meera Joshi', clientEmail: 'meera.joshi@example.com', reportType: 'Career Timing', content: 'Draft notes: Jupiter transit favours a role change after October.', status: 'IN_PROGRESS', createdAt: iso(-3, 11, 0), updatedAt: iso(-1, 17, 0) },
    );
    localStorage.setItem('astro_reports', JSON.stringify(reports));
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
  // Last completed/declined Cashfree payment — set right before navigating to
  // the 'payment-status' page (see paymentService.pay() call sites in
  // PageRenderer.tsx), so that page has something to render.
  paymentResult: PaymentResultInfo | null;
  setPaymentResult: (r: PaymentResultInfo | null) => void;
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
  authLoading: boolean;
  // Wallet-based consultation billing balance — see its useState's own
  // comment in the provider for why this isn't part of AuthUser.
  walletBalance: number | null;
  refreshWalletBalance: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser | null>;
  register: (name: string, email: string, password: string, phoneNumber: string, birthDetails?: RegisterBirthDetails) => Promise<{ user: AuthUser }>;
  loginWithFirebase: (idToken: string) => Promise<{ user: AuthUser; isNewUser: boolean } | null>;
  verifyPhoneWithFirebase: (idToken: string) => Promise<void>;
  saveBirthDetails: (details: Required<RegisterBirthDetails>) => Promise<boolean>;
  saveMyName: (name: string) => Promise<boolean>;
  logout: () => void;
  pendingAction: string | null;
  setPendingAction: (a: string | null) => void;
  showLoginModal: boolean;
  setShowLoginModal: (v: boolean) => void;
  // Admin account data — real backend (backend/app/api/admin.routes.ts)
  accounts: AuthUser[];
  // Re-pulls accounts + audit log — exposed so a page that creates/changes
  // an account (e.g. AstrologersPage's "Add Astrologer") can refresh the
  // list itself instead of waiting for the next full page load.
  refreshAdminData: () => Promise<void>;
  auditLog: AuditLogEntry[];
  notifications: NotificationEntry[];
  // Admin console actions — real backend, requires an ADMIN-role JWT
  logAdminAction: (action: string, target: string) => void;
  suspendAccount: (email: string) => Promise<void>;
  restoreAccount: (email: string) => Promise<void>;
  // Server enforces who can assign what (see admin.routes.ts's staffOk /
  // in-handler STAFF-vs-ADMIN check) — this just calls the endpoint; a 403
  // for an over-reaching STAFF caller surfaces as a thrown ApiError.
  updateAccountRole: (email: string, role: Role) => Promise<void>; // throws AdminApiError on 403 (e.g. STAFF trying to grant Staff/Admin)
  // Self-service — the currently signed-in Admin/Staff account editing its
  // own name/password (see admin.routes.ts's PATCH /me). Throws AdminApiError
  // (e.g. wrong current password) on failure.
  updateMyProfile: (patch: { name?: string; currentPassword?: string; newPassword?: string }) => Promise<void>;
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
  astrologerReports: AstrologerReport[];
  saveReportDraft: (report: Omit<AstrologerReport, 'id' | 'astrologerEmail' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => void;
  updateReportStatus: (id: string, status: ReportStatus) => void;
  getClientNote: (clientEmail: string) => string;
  saveClientNote: (clientEmail: string, note: string) => void;
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
    nav_astrology: 'Horoscope',
    nav_kundli: 'Free Kundli',
    nav_calculators: 'Calculators',
    nav_reports: 'Reports',
    nav_premium_report: 'Premium Report',
    nav_panchang: 'Panchang',
    nav_academy: 'Academy',
    nav_store: 'Store',
    nav_pooja: 'Pooja',
    nav_free_kundli: 'Free Kundli',
    nav_consult: 'Consult',
    nav_login: 'LOGIN',

    // Kundli section — tab bar + common buttons/headings
    kundli_tab_overview: 'Kundli',
    kundli_tab_charts: 'Charts',
    kundli_tab_gochar: 'Gochar',
    kundli_tab_timeline: 'Timeline & Doshas',
    kundli_tab_predictions: 'Predictions',
    kundli_tab_remedies: 'Remedies',
    kundli_tab_advanced: 'Advanced',
    kundli_edit_details: 'Edit Details',
    kundli_download_pdf: 'Download PDF',
    kundli_show_placements: 'Show Placements',
    kundli_hide: 'Hide',
    kundli_planetary_placements: 'Planetary Placements',
    kundli_panchang_at_birth: 'Panchang at Birth',
    kundli_all_divisional_charts: 'All Divisional Charts',
    kundli_what_chart_means: 'What This Chart Means',

    // Core headings
    section_reports_title: 'Go Deeper with Jyotish',
    section_reports_desc: 'Detailed, manuscript-grade Kundli readings translating cosmic alignment into direct life direction.',
    premium_banner_eyebrow: 'New · Premium',
    premium_banner_title: 'Your full birth-chart reading',
    premium_banner_text: 'A complete, personalised report — your Lagna, Moon, every planet, your Dashas and the life areas they shape — written section by section from classical sources.',
    premium_banner_cta: 'Create My Report',
    section_tools_title: 'Free Astrology Tools',
    section_tools_desc: 'Trusted Vedic astrology tools — free, accurate, and always available.',
    section_panchang_title: "Today's Panchang",
    section_panchang_desc: 'Vedic daily almanac for auspicious timings, planetary transits, and daily energy grid.',
    section_horoscope_title: 'Your Daily Horoscope',
    section_horoscope_desc: 'Real, freshly-computed planetary transits for your Moon Sign — updated every day.',
    horoscope_loading: "Reading today's transits for {rashi}...",
    section_astrologers_title: 'Consult an Astrologist',
    section_astrologers_desc: 'Seek guidance from verified Jyotish masters rooted in authentic Vedic lineages.',
    section_store_title: 'TredevaStore',
    section_store_desc: 'Authentic, energized gemstones, yantras and spiritual tools, carefully curated.',
    cta_explore_gurukul: 'Explore Gurukul',
    lbl_free: 'Free',
    btn_view_course: 'View Course',
    roadmap_title: 'Gurukul Learning Path',
    roadmap_step1: 'Shastri Basics',
    roadmap_step2: 'Kundli Analysis',
    roadmap_step3: 'Grahas & Rashis',
    roadmap_step4: 'Bhavas & Lords',
    roadmap_step5: 'Vimshottari Dasha',
    roadmap_step6: 'Gochara Transits',
    roadmap_step7: 'Phaladeepika',
    cta_explore_acharyas: 'Explore All Acharyas',
    astrologers_load_error: 'Could not load astrologers right now. Please try again shortly.',
    kundli_context_label: 'Your Kundli Context',
    kundli_context_empty: 'Fill in your birth details to start your free chat — your D1 chart will appear here.',
    badge_first_free_chat: 'First free chat',
    ai_disclaimer: 'Based on traditional Vedic principles. Not professional advice.',
    lbl_example_questions: 'Example questions:',
    ai_example_q1: 'What does my Mahadasha mean?',
    ai_example_q2: 'When is a good time for marriage?',
    ai_example_q3: 'What does Rahu in my 7th house indicate?',
    ai_form_title: 'Tell us your birth details',
    ai_form_desc: "This builds your real D1 chart — your free chat's answers are grounded in it, not a generic reading.",
    ai_form_submit: 'Start My Free Chat',
    ai_session_over: 'Your free chat is over.',
    ai_continue_chat: 'Continue Chat — ₹49/session',
    ai_input_placeholder: 'Ask about your chart...',
    ai_suggestion1: 'Will I change my career this year?',
    ai_suggestion2: 'When is a good time for marriage?',
    ai_suggestion3: 'What does my current transit mean?',
    blog_tag_nakshatra: 'Nakshatra',
    blog_tag_saturn: 'Saturn',
    blog_tag_marriage: 'Marriage',
    blog_tag_career: 'Career',
    blog_tag_daily_astrology: 'Daily Astrology',
    hero_eyebrow: 'JYOTISH · DHARMA · GRAHAS · NAKSHATRAS',
    hero_scroll_hint: 'Scroll to explore',
    cta_explore_reports: 'Explore Reports',
    cta_explore_horoscopes: 'Explore Horoscopes',
    cta_explore_tools: 'Explore Tools',
    cta_explore_courses: 'Explore Courses',
    badge_most_popular: 'Most Popular',
    lbl_pages: 'pages',
    lbl_sections: 'sections',
    bundles_title: 'Choose Your Experience',
    bundles_subtitle: 'Every report can be enhanced with expert access',
    btn_choose_this: 'Choose This',
    label_recommended: 'Recommended',
    bundle_1_title: 'Report Only',
    bundle_1_desc: 'Full written report delivered in 48 hours',
    bundle_1_feature1: 'In-depth analysis',
    bundle_1_feature2: 'PDF format',
    bundle_1_feature3: '40+ pages',
    bundle_2_title: 'Report + Expert Q&A',
    bundle_2_desc: 'Report plus 2 written questions to an astrologer',
    bundle_2_feature1: 'Full report',
    bundle_2_feature2: '2 expert questions',
    bundle_2_feature3: '48hr response',
    bundle_3_title: 'Report + Consultation',
    bundle_3_desc: 'Full report plus a 20-minute live consultation',
    bundle_3_feature1: 'Full report',
    bundle_3_feature2: '20-min video call',
    bundle_3_feature3: 'Recorded session',
    btn_explore_all_products: 'Explore All Products',
    store_external_note: 'Shown here as a preview — every purchase is completed on tredevastore.com.',
    btn_shop_now: 'Shop Now',
    about_eyebrow: 'Our Lineage',
    about_title: 'About TredevaAstro',
    about_para1: 'TredevaAstro was founded to bridge ancient Vedic wisdom with modern digital clarity. Rather than generating generic commercial predictions, our platform is built on classical Indian astronomical observations (Jyotish Shastra).',
    about_para2: 'All calculations follow the Lahiri Ayanamsa, matching planetary alignments to the exact degrees of the stars. We partner with respected Acharyas initiated into authentic lineages to ensure all consultations and Pujas follow precise shastric codes.',
    about_para3: 'Explore your birth blueprint, balance energies through energized remedies, and walk your path with alignment, purpose and dharma.',
    section_testimonials_eyebrow: 'What Our Users Say',
    section_testimonials_title: 'Stories of Insight',
    section_testimonials_demo_note: 'The following are illustrative demo testimonials.',
    section_why_eyebrow: 'Our Promise',
    section_why_title: 'Why TredevaAstro',
    why_pillar1_title: 'Verified Experts',
    why_pillar1_desc: 'Every astrologer on TredevaAstro is manually reviewed, assessed and verified for their knowledge, accuracy and approach.',
    why_pillar2_title: 'Private & Secure',
    why_pillar2_desc: 'Your birth data, consultations and reports are private. We never share, sell or expose your personal information.',
    why_pillar3_title: 'Personalized Astrology',
    why_pillar3_desc: 'One birth profile powers your entire experience — Kundli, horoscope, AI insights, recommendations and more.',
    why_pillar4_title: 'Traditional Wisdom, Modern Experience',
    why_pillar4_desc: 'Rooted in classical Vedic astrology, delivered through a thoughtfully designed modern platform.',
    section_blog_eyebrow: 'The Journal',
    section_blog_title: 'From the TredevaAstro Journal',
    btn_read_article: 'Read Article →',
    btn_read_more: 'Read →',
    nav_prev: 'PREVIOUS',
    nav_next: 'NEXT',
    section_academy_title: 'TredevaAstro Gurukul',
    section_academy_desc: 'Structured, in-depth courses in Vedic astrology and Jyotish, guided by lineage Acharyas.',
    section_ai_title: 'Ask TredevaAstro',
    section_ai_desc: 'Have a question about your chart? Get insights grounded in classical Vedic astrology.',

    // CTA & button actions
    cta_explore: 'Explore All',
    cta_consult: 'Consult an Astrologist',
    cta_generate: 'Generate Free Kundli',
    cta_chat: 'START 5-MINUTE FREE SESSION',
    ai_intro_title: 'Your first chat is free.',
    ai_intro_desc: 'Ask questions about your birth chart, current transits, or seek clarity on life matters — all through the lens of classical Vedic Jyotish.',
    ai_start_btn: 'Start your Free chat',

    // Hero Section
    hero_headline: 'Your Stars. Your Dharma.',
    hero_headline_italic: 'Your Journey.',
    hero_hindi_eyebrow: '"Apne Aakash Ko Samjhiye"',
    hero_subhead: 'Personalized Vedic astrology, expert guidance, intelligent insights and timeless Jyotish wisdom.',
    hero_cta_kundli: 'Generate Free Kundli',
    hero_cta_consult: 'Consult an Astrologist',
    hero_trust_acharyas: 'Verified Acharyas',
    hero_trust_jyotish: 'Personalized Jyotish',

    // Homepage campaign carousel (CampaignBanner.tsx) — its own Google
    // Translate pass is unreliable (verified live: text repeatedly stayed
    // English) because each slide fully unmounts/remounts every 6s via
    // framer-motion, which races Google's translation faster than it can
    // keep up — so this carousel's copy is translated through this
    // dictionary like the rest of the site instead of relying on Google.
    banner_0_category: 'VEDIC JYOTISH',
    banner_0_title: 'Discover the Map\nWritten at Your Birth.',
    banner_0_desc: 'Explore your Rashis, Grahas and Nakshatras through an authentic Vedic Kundli — free, instantly.',
    banner_0_cta: 'Generate Free Kundli',
    banner_1_category: 'Astrologist CONSULTATION',
    banner_1_title: 'Speak to an Astrologist\nWho Understands.',
    banner_1_desc: 'Connect with verified Vedic astrologers for personalized guidance on your life\'s most important questions.',
    banner_1_cta: 'Consult an Astrologist',
    banner_2_category: 'JYOTISH REPORTS',
    banner_2_title: 'Go Deeper into\nYour Planetary Patterns.',
    banner_2_desc: 'Detailed Jyotish analysis across career, marriage, health and destiny by classical Vedic methods.',
    banner_2_cta: 'Explore Reports',
    banner_3_category: 'TREDEVASTORE',
    banner_3_title: 'Sacred Objects Chosen\nfor Your Journey.',
    banner_3_desc: 'Authentic gemstones, Rudraksha, Yantras and sacred objects — energized for your Kundli.',
    banner_3_cta: 'Explore TredevaStore',
    banner_4_category: 'TREDEVAASTRO GURUKUL',
    banner_4_title: 'Learn the Language\nof Jyotish.',
    banner_4_desc: 'Study Vedic astrology from foundation to mastery through structured courses taught by expert Acharyas.',
    banner_4_cta: 'Explore Gurukul',
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
    tools_nakshatra_title: 'Nakshatra Finder',
    tools_nakshatra_desc: 'Discover your birth star and its ruling planet.',
    tools_sade_sati_title: 'Sade Sati',
    tools_numerology_title: 'Numerology',
    tools_numerology_desc: 'Life path number forecast.',

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
    cat_vastu: 'Vastu Shastra',
    cat_family: 'Family & Heritage',
    cat_pooja: 'Pooja & Rituals',
    // Astrologers.tsx's "All" filter pill deliberately does NOT reuse cat_all
    // above — that key means "All Remedies" (Store's own "All" category) and
    // was leaking onto this unrelated page's All pill before this existed.
    cat_all_astrologers: 'All Astrologers',

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
    footer_join_astrologer: 'Join as an Astrologer/Pandit',
    footer_press: 'Press',
    footer_help_centre: 'Help Centre',
    footer_privacy_policy: 'Privacy Policy',
    footer_terms_of_service: 'Terms of Service',
    footer_safety: 'Safety',
    footer_contact_us: 'Contact Us',
    footer_copyright: '© 2026 TredevaAstro. All rights reserved.',
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
    auth_tab_register: 'Create Your Account',
    auth_tab_login: 'Member Sign In',
    auth_subtitle_register: 'ANCIENT VEDIC MANUSCRIPT · BEGIN YOUR JOURNEY',
    auth_subtitle_login: 'SACRED USER VAULT · ACCESS STORED BIRTH PROFILE',
    auth_label_fullname: "Full Name / Seeker's Name *",
    auth_placeholder_fullname: 'e.g. Sparsh Sharma',
    auth_label_email: 'Email Address *',
    auth_placeholder_email: 'name@example.com',
    auth_label_password: 'Password *',
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
    auth_success_message: 'Greetings {name}! Your account has been successfully inscribed onto the sacred Vedic manuscript archive.',
    auth_btn_continue: '✦ ENTER CELESTIAL PORTAL ✦',
    auth_footer_stamp: 'ENCRYPTED ANCIENT VEDIC ARCHIVE',

    // Admin Console
    admin_console_name: 'TredevaAstro Admin',
    admin_console_caption: 'Administration Console',
    admin_console_name_staff: 'TredevaAstro Staff',
    admin_console_caption_staff: 'Staff Console',
    admin_search_placeholder: 'Search...',
    admin_notifications: 'Notifications',
    admin_profile: 'Admin Profile',
    admin_profile_staff: 'Staff Profile',
    admin_profile_edit: 'Edit Profile',
    admin_profile_edit_title: 'Edit Profile',
    admin_profile_field_name: 'Name',
    admin_profile_field_current_password: 'Current Password',
    admin_profile_field_new_password: 'New Password (leave blank to keep current)',
    admin_logout: 'Logout',
    admin_sidebar_overview: 'Overview',
    admin_sidebar_applications: 'Hiring',
    admin_sidebar_emails: 'Emails',
    admin_sidebar_astrologers: 'Astrologers',
    admin_sidebar_users: 'Users',
    admin_sidebar_staff: 'Staff',
    admin_sidebar_consultations: 'Consultations',
    admin_sidebar_reports: 'Reports',
    admin_sidebar_orders: 'Orders',
    admin_sidebar_pricing: 'Pricing',
    admin_sidebar_blog: 'Blog',
    admin_sidebar_shlok: 'Daily Shlok',
    admin_sidebar_notifications: 'Notifications',
    admin_sidebar_audit: 'Audit Logs',
    admin_sidebar_tokens: 'Token Meter',
    admin_sidebar_evaluation: 'AI Evaluation',
    admin_sidebar_settings: 'Settings',
    'admin_sidebar_call-recordings': 'Call Recordings',
    'admin_sidebar_banners': 'Banners',
    'admin_sidebar_pooja': 'Pooja',
    admin_call_recordings_desc: 'Recorded voice consultations. Staff-only, and each recording is automatically deleted 10 days after the call.',
    admin_call_recordings_col_user: 'User',
    admin_call_recordings_col_recorded: 'Recorded',
    admin_call_recordings_col_expires: 'Auto-deletes',
    admin_call_recordings_col_size: 'Size',
    admin_call_recordings_play: 'Play',
    admin_status_pending: 'Pending',
    admin_status_approved: 'Approved',
    admin_status_rejected: 'Rejected',
    admin_status_active: 'Active',
    admin_status_suspended: 'Suspended',
    admin_status_upcoming: 'Upcoming',
    admin_status_live: 'Live',
    admin_status_completed: 'Completed',
    admin_status_cancelled: 'Cancelled',
    admin_status_assigned: 'Assigned',
    admin_status_accepted: 'Accepted',
    admin_status_declined: 'Declined',
    admin_status_expired: 'Expired',
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
    admin_action_remove: 'Remove',
    admin_staff_title: 'Staff & Admins',
    admin_staff_add_title: 'Add Team Member',
    admin_staff_add_name: 'Full Name',
    admin_staff_add_email: 'Email',
    admin_staff_add_password: 'Password',
    admin_staff_add_role: 'Role',
    admin_staff_role_staff: 'Staff',
    admin_staff_role_admin: 'Admin',
    admin_staff_col_member: 'Team Member',
    admin_staff_col_role: 'Role',
    admin_staff_col_access: 'Access',
    admin_staff_action_add: 'Add Team Member',
    admin_staff_action_manage_access: 'Manage Access',
    admin_staff_access_title: 'Section Access',
    admin_staff_access_desc: 'Toggle which parts of the admin console this Staff account can reach.',
    admin_staff_access_full: 'Full access (Admin)',
    admin_staff_confirm_remove_title: 'Remove this account\'s access?',
    admin_staff_confirm_remove_desc: 'They will be reverted to a regular User account and lose all admin console access.',
    admin_astro_confirm_remove_title: 'Remove this astrologer?',
    admin_astro_confirm_remove_desc: 'They will be reverted to a regular User account and removed from the bookable astrologer catalog.',
    admin_pricing_title: 'Pricing Regions',
    admin_pricing_desc: 'A visitor\'s country is detected automatically and matched against these regions — the matching multiplier is applied on top of an astrologer\'s own price everywhere it\'s shown or charged. A country in no region here uses the default ×1 (unchanged) price.',
    admin_pricing_action_add: 'Add Region',
    admin_pricing_col_name: 'Region',
    admin_pricing_col_countries: 'Countries',
    admin_pricing_col_multiplier: 'Multiplier',
    admin_pricing_empty_desc: 'No regions yet — every visitor sees the astrologer\'s plain price.',
    admin_pricing_add_title: 'Add Pricing Region',
    admin_pricing_edit_title: 'Edit Pricing Region',
    admin_pricing_field_name: 'Region Name',
    admin_pricing_field_countries: 'Country Codes',
    admin_pricing_field_countries_hint: 'Pick a country and click Add — repeat for each country in this region.',
    admin_pricing_field_multiplier: 'Price Multiplier',
    admin_pricing_field_multiplier_hint: 'e.g. 1.5 = 50% more than the astrologer\'s own price, 0.8 = 20% less',
    admin_pricing_error_country_code: 'Select at least one country.',
    admin_pricing_error_multiplier: 'Multiplier must be a positive number.',
    admin_pricing_confirm_remove_title: 'Remove this region?',
    admin_pricing_confirm_remove_desc: 'Its countries will fall back to the default ×1 price immediately.',
    admin_pricing_override_title: 'Astrologer Overrides',
    admin_pricing_override_desc: 'Set an exact price for one astrologer in one region — it overrides that region\'s multiplier completely. Set them one at a time here, or download the CSV, edit every astrologer\'s price for every region in one sitting, and upload it back.',
    admin_pricing_override_action_add: 'Set a Price',
    admin_pricing_csv_download: 'Download CSV Template',
    admin_pricing_csv_upload: 'Upload CSV',
    admin_pricing_csv_import_result: 'Updated',
    admin_pricing_override_col_astrologer: 'Astrologer',
    admin_pricing_override_col_chat: 'Chat',
    admin_pricing_override_col_call: 'Call',
    admin_pricing_override_col_video: 'Video',
    admin_pricing_override_empty_desc: 'No per-astrologer overrides yet — every astrologer uses the region multiplier above.',
    admin_pricing_override_add_title: 'Set Astrologer Price',
    admin_pricing_override_edit_title: 'Edit Astrologer Price',
    admin_pricing_override_field_astrologer: 'Astrologer',
    admin_pricing_override_field_chat: 'Chat Price (₹/min)',
    admin_pricing_override_field_call: 'Call Price (₹/min)',
    admin_pricing_override_field_video: 'Video Price (₹/min)',
    admin_pricing_override_error_select: 'Please select both an astrologer and a region.',
    admin_pricing_override_error_prices: 'Every price must be a number of 0 or more.',
    admin_pricing_override_confirm_remove_title: 'Remove this price?',
    admin_pricing_override_confirm_remove_desc: 'This astrologer will fall back to the region\'s plain multiplier immediately.',
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
    admin_astro_add: 'Add Astrologer',
    admin_astro_view_cards: 'Cards',
    admin_astro_view_table: 'Table',
    admin_astro_view_revenue: 'Revenue',
    admin_astro_revenue_chat: 'Chat Revenue',
    admin_astro_revenue_voice: 'Voice Revenue',
    admin_astro_revenue_video: 'Video Revenue',
    admin_astro_revenue_total: 'Total Revenue',
    admin_astro_col_name: 'Name',
    admin_astro_col_rating: 'Rating',
    admin_astro_col_experience: 'Experience',
    admin_astro_col_languages: 'Languages',
    admin_astro_col_consultations: 'Consultations',
    admin_astro_col_earnings: 'Earnings',
    admin_astro_col_live_status: 'Live Status',
    admin_astro_status_online_available: 'Available now',
    admin_astro_status_online_busy: 'In a session',
    admin_astro_status_away: 'Away',
    admin_astro_status_offline: 'Offline',
    admin_astro_col_status: 'Status',
    admin_astro_add_title: 'Add Astrologer',
    admin_astro_add_name: 'Full Name',
    admin_astro_add_email: 'Email Address',
    admin_astro_add_password: 'Temporary Password',
    admin_astro_edit_title: 'Professional Title',
    admin_astro_edit_bio: 'Bio',
    admin_astro_edit_avatar: 'Avatar URL',
    admin_astro_edit_experience: 'Years of Experience',
    admin_astro_edit_categories: 'Categories',
    admin_astro_edit_expertise: 'Expertise',
    admin_astro_edit_consultation_types: 'Consultation Types',
    admin_astro_edit_chat_price: 'Chat Price (₹/min)',
    admin_astro_edit_call_price: 'Voice Call Price (₹/min)',
    admin_astro_edit_video_price: 'Video Call Price (₹/min)',
    admin_astro_tab_overview: 'Overview',
    admin_astro_tab_schedule: 'Schedule',
    admin_astro_tab_reviews: 'Reviews',
    admin_astro_tab_earnings: 'Earnings',
    admin_astro_tab_consultations: 'Consultations',
    admin_astro_tab_audit: 'Audit',
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
    astro_suspended_banner: 'Your account has been suspended by TredevaAstro. You cannot accept new bookings or appear in public search until it is reactivated.',
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
    nav_astrology: 'राशिफल',
    nav_kundli: 'मुफ़्त कुंडली',
    nav_calculators: 'कैलकुलेटर',
    nav_reports: 'रिपोर्ट्स',
    nav_premium_report: 'प्रीमियम रिपोर्ट',
    nav_panchang: 'पंचांग',
    nav_academy: 'गुरुकुल',
    nav_store: 'स्टोर',
    nav_free_kundli: 'मुफ़्त कुंडली',
    nav_consult: 'परामर्श',
    nav_login: 'लॉगिन',

    kundli_tab_overview: 'कुंडली',
    kundli_tab_charts: 'चार्ट्स',
    kundli_tab_gochar: 'गोचर',
    kundli_tab_timeline: 'समयरेखा और दोष',
    kundli_tab_predictions: 'भविष्यवाणियाँ',
    kundli_tab_remedies: 'उपाय',
    kundli_tab_advanced: 'विस्तृत',
    kundli_edit_details: 'विवरण संपादित करें',
    kundli_download_pdf: 'पीडीएफ डाउनलोड करें',
    kundli_show_placements: 'ग्रह स्थिति दिखाएं',
    kundli_hide: 'छिपाएं',
    kundli_planetary_placements: 'ग्रह स्थिति',
    kundli_panchang_at_birth: 'जन्म का पंचांग',
    kundli_all_divisional_charts: 'सभी विभाजित चार्ट्स',
    kundli_what_chart_means: 'यह चार्ट क्या दर्शाता है',

    section_reports_title: 'ज्योतिष के साथ गहराई में जाएं',
    section_reports_desc: 'विस्तृत, हस्तलिखित स्तर की कुंडली पठन जो ब्रह्मांडीय संरेखण को जीवन की दिशा में बदलता है।',
    premium_banner_eyebrow: 'नया · प्रीमियम',
    premium_banner_title: 'आपकी पूर्ण जन्म-कुंडली पठन',
    premium_banner_text: 'एक संपूर्ण, व्यक्तिगत रिपोर्ट — आपकी लग्न, चंद्र, हर ग्रह, आपकी दशाएं और वे जीवन क्षेत्र जिन्हें वे प्रभावित करती हैं — शास्त्रीय स्रोतों से खंड दर खंड लिखी गई।',
    premium_banner_cta: 'मेरी रिपोर्ट बनाएं',
    section_tools_title: 'मुफ़्त ज्योतिष उपकरण',
    section_tools_desc: 'विश्वसनीय वैदिक ज्योतिष उपकरण — मुफ़्त, सटीक और हमेशा उपलब्ध।',
    section_panchang_title: 'आज का पंचांग',
    section_panchang_desc: 'शुभ समय, ग्रहों के गोचर और दैनिक ऊर्जा ग्रिड के लिए वैदिक दैनिक पंचांग।',
    section_horoscope_title: 'आपका दैनिक राशिफल',
    section_horoscope_desc: 'आपकी चंद्र राशि के लिए वास्तविक, ताज़ा गणना किए गए ग्रह गोचर — प्रतिदिन अपडेट।',
    horoscope_loading: 'आज के {rashi} गोचर पढ़ रहे हैं...',
    section_astrologers_title: 'आचार्य से परामर्श करें',
    section_astrologers_desc: 'प्रामाणिक वैदिक परंपराओं से जुड़े सत्यापित ज्योतिष आचार्यों से मार्गदर्शन प्राप्त करें।',
    section_store_title: 'त्रिदेव स्टोर',
    section_store_desc: 'प्रामाणिक, जागृत रत्न, यंत्र और आध्यात्मिक सामग्री, सावधानीपूर्वक चुनी गई।',
    cta_explore_gurukul: 'गुरुकुल देखें',
    lbl_free: 'मुफ़्त',
    btn_view_course: 'कोर्स देखें',
    roadmap_title: 'गुरुकुल शिक्षण पथ',
    roadmap_step1: 'शास्त्री आधार',
    roadmap_step2: 'कुंडली विश्लेषण',
    roadmap_step3: 'ग्रह व राशियाँ',
    roadmap_step4: 'भाव व भावेश',
    roadmap_step5: 'विंशोत्तरी दशा',
    roadmap_step6: 'गोचर पारगमन',
    roadmap_step7: 'फलदीपिका',
    cta_explore_acharyas: 'सभी आचार्य देखें',
    astrologers_load_error: 'अभी ज्योतिषी लोड नहीं हो सके। कृपया थोड़ी देर में फिर से प्रयास करें।',
    kundli_context_label: 'आपकी कुंडली संदर्भ',
    kundli_context_empty: 'अपना फ्री चैट शुरू करने के लिए अपनी जन्म जानकारी भरें — आपका D1 चार्ट यहाँ दिखेगा।',
    badge_first_free_chat: 'पहली फ्री चैट',
    ai_disclaimer: 'पारंपरिक वैदिक सिद्धांतों पर आधारित। व्यावसायिक सलाह नहीं है।',
    lbl_example_questions: 'उदाहरण प्रश्न:',
    ai_example_q1: 'मेरी महादशा का क्या अर्थ है?',
    ai_example_q2: 'विवाह के लिए अच्छा समय कब है?',
    ai_example_q3: 'मेरे सातवें भाव में राहु क्या दर्शाता है?',
    ai_form_title: 'अपनी जन्म जानकारी बताएं',
    ai_form_desc: 'इससे आपका असली D1 चार्ट बनता है — आपकी फ्री चैट के जवाब इसी पर आधारित होंगे, किसी सामान्य रीडिंग पर नहीं।',
    ai_form_submit: 'मेरी फ्री चैट शुरू करें',
    ai_session_over: 'आपकी फ्री चैट समाप्त हो गई है।',
    ai_continue_chat: 'चैट जारी रखें — ₹49/सत्र',
    ai_input_placeholder: 'अपनी कुंडली के बारे में पूछें...',
    ai_suggestion1: 'क्या इस साल मेरा करियर बदलेगा?',
    ai_suggestion2: 'विवाह के लिए अच्छा समय कब है?',
    ai_suggestion3: 'मेरा वर्तमान गोचर क्या दर्शाता है?',
    blog_tag_nakshatra: 'नक्षत्र',
    blog_tag_saturn: 'शनि',
    blog_tag_marriage: 'विवाह',
    blog_tag_career: 'करियर',
    blog_tag_daily_astrology: 'दैनिक ज्योतिष',
    hero_eyebrow: 'ज्योतिष · धर्म · ग्रह · नक्षत्र',
    hero_scroll_hint: 'देखने के लिए स्क्रॉल करें',
    cta_explore_reports: 'रिपोर्ट्स देखें',
    cta_explore_horoscopes: 'राशिफल देखें',
    cta_explore_tools: 'सभी टूल्स देखें',
    cta_explore_courses: 'सभी कोर्स देखें',
    badge_most_popular: 'सबसे लोकप्रिय',
    lbl_pages: 'पेज',
    lbl_sections: 'खंड',
    bundles_title: 'अपना अनुभव चुनें',
    bundles_subtitle: 'हर रिपोर्ट को विशेषज्ञ परामर्श के साथ और बेहतर बनाया जा सकता है',
    btn_choose_this: 'यह चुनें',
    label_recommended: 'अनुशंसित',
    bundle_1_title: 'केवल रिपोर्ट',
    bundle_1_desc: '48 घंटों में डिलीवर की गई पूरी लिखित रिपोर्ट',
    bundle_1_feature1: 'गहन विश्लेषण',
    bundle_1_feature2: 'PDF प्रारूप',
    bundle_1_feature3: '40+ पेज',
    bundle_2_title: 'रिपोर्ट + विशेषज्ञ प्रश्नोत्तर',
    bundle_2_desc: 'रिपोर्ट के साथ ज्योतिषी से 2 लिखित प्रश्न',
    bundle_2_feature1: 'पूरी रिपोर्ट',
    bundle_2_feature2: '2 विशेषज्ञ प्रश्न',
    bundle_2_feature3: '48 घंटे में उत्तर',
    bundle_3_title: 'रिपोर्ट + परामर्श',
    bundle_3_desc: 'पूरी रिपोर्ट के साथ 20 मिनट का लाइव परामर्श',
    bundle_3_feature1: 'पूरी रिपोर्ट',
    bundle_3_feature2: '20 मिनट की वीडियो कॉल',
    bundle_3_feature3: 'रिकॉर्डेड सत्र',
    btn_explore_all_products: 'सभी उत्पाद देखें',
    store_external_note: 'यहाँ केवल झलक दिखाई गई है — हर खरीदारी tredevastore.com पर पूरी होती है।',
    btn_shop_now: 'अभी खरीदें',
    nav_pooja: 'पूजा',
    footer_join_astrologer: 'ज्योतिषी/पंडित के रूप में जुड़ें',
    footer_safety: 'सुरक्षा',
    about_eyebrow: 'हमारी परंपरा',
    about_title: 'TredevaAstro के बारे में',
    about_para1: 'TredevaAstro की स्थापना प्राचीन वैदिक ज्ञान को आधुनिक डिजिटल स्पष्टता से जोड़ने के लिए की गई थी। सामान्य व्यावसायिक भविष्यवाणियाँ बनाने के बजाय, हमारा मंच शास्त्रीय भारतीय खगोलीय अवलोकनों (ज्योतिष शास्त्र) पर आधारित है।',
    about_para2: 'सभी गणनाएँ लाहिड़ी अयनांश का पालन करती हैं, जो ग्रहों की स्थिति को नक्षत्रों की सटीक डिग्री से मिलाती हैं। हम प्रामाणिक परंपराओं में दीक्षित सम्मानित आचार्यों के साथ साझेदारी करते हैं ताकि सभी परामर्श और पूजाएँ सटीक शास्त्रीय विधियों का पालन करें।',
    about_para3: 'अपनी जन्म कुंडली का अन्वेषण करें, ऊर्जावान उपायों से ऊर्जा संतुलित करें, और संरेखण, उद्देश्य व धर्म के साथ अपना मार्ग तय करें।',
    section_testimonials_eyebrow: 'हमारे उपयोगकर्ता क्या कहते हैं',
    section_testimonials_title: 'अनुभवों की कहानियाँ',
    section_testimonials_demo_note: 'ये उदाहरण स्वरूप डेमो testimonials हैं।',
    section_why_eyebrow: 'हमारा वादा',
    section_why_title: 'TredevaAstro क्यों',
    why_pillar1_title: 'सत्यापित विशेषज्ञ',
    why_pillar1_desc: 'TredevaAstro पर हर ज्योतिषी को मैन्युअल रूप से उनके ज्ञान, सटीकता और दृष्टिकोण के लिए जाँचा, परखा और सत्यापित किया जाता है।',
    why_pillar2_title: 'निजी और सुरक्षित',
    why_pillar2_desc: 'आपका जन्म डेटा, परामर्श और रिपोर्ट निजी हैं। हम आपकी व्यक्तिगत जानकारी कभी साझा, नहीं बेचते या उजागर नहीं करते।',
    why_pillar3_title: 'व्यक्तिगत ज्योतिष',
    why_pillar3_desc: 'एक जन्म प्रोफ़ाइल आपके पूरे अनुभव को शक्ति देती है — कुंडली, राशिफल, AI अंतर्दृष्टि, सुझाव और भी बहुत कुछ।',
    why_pillar4_title: 'पारंपरिक ज्ञान, आधुनिक अनुभव',
    why_pillar4_desc: 'शास्त्रीय वैदिक ज्योतिष में निहित, एक सोच-समझकर डिज़ाइन किए गए आधुनिक मंच के माध्यम से प्रस्तुत।',
    section_blog_eyebrow: 'जर्नल',
    section_blog_title: 'TredevaAstro जर्नल से',
    btn_read_article: 'लेख पढ़ें →',
    btn_read_more: 'पढ़ें →',
    nav_prev: 'पिछला',
    nav_next: 'अगला',
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

    banner_0_category: 'वैदिक ज्योतिष',
    banner_0_title: 'वह नक्शा खोजें\nजो आपके जन्म पर लिखा गया।',
    banner_0_desc: 'एक प्रामाणिक वैदिक कुंडली के माध्यम से अपनी राशियों, ग्रहों और नक्षत्रों को जानें — मुफ़्त, तुरंत।',
    banner_0_cta: 'मुफ़्त कुंडली बनाएं',
    banner_1_category: 'ज्योतिषी परामर्श',
    banner_1_title: 'एक ज्योतिषी से बात करें\nजो आपको समझे।',
    banner_1_desc: 'अपने जीवन के सबसे महत्वपूर्ण प्रश्नों पर व्यक्तिगत मार्गदर्शन के लिए सत्यापित वैदिक ज्योतिषियों से जुड़ें।',
    banner_1_cta: 'ज्योतिषी से परामर्श करें',
    banner_2_category: 'ज्योतिष रिपोर्ट्स',
    banner_2_title: 'अपने ग्रहों के पैटर्न में\nऔर गहराई से जाएं।',
    banner_2_desc: 'पारंपरिक वैदिक विधियों द्वारा करियर, विवाह, स्वास्थ्य और भाग्य पर विस्तृत ज्योतिष विश्लेषण।',
    banner_2_cta: 'रिपोर्ट्स देखें',
    banner_3_category: 'ट्रेडेवास्टोर',
    banner_3_title: 'आपकी यात्रा के लिए\nचुनी गई पवित्र वस्तुएं।',
    banner_3_desc: 'प्रामाणिक रत्न, रुद्राक्ष, यंत्र और पवित्र वस्तुएं — आपकी कुंडली के लिए ऊर्जावान।',
    banner_3_cta: 'ट्रेडेवास्टोर देखें',
    banner_4_category: 'ट्रेडेवाएस्ट्रो गुरुकुल',
    banner_4_title: 'ज्योतिष की भाषा\nसीखें।',
    banner_4_desc: 'विशेषज्ञ आचार्यों द्वारा संरचित पाठ्यक्रमों के माध्यम से आधार से लेकर निपुणता तक वैदिक ज्योतिष का अध्ययन करें।',
    banner_4_cta: 'गुरुकुल देखें',

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
    tools_nakshatra_title: 'नक्षत्र खोजक',
    tools_nakshatra_desc: 'अपना जन्म नक्षत्र और उसका स्वामी ग्रह जानें।',
    tools_sade_sati_title: 'साढ़े साती',
    tools_numerology_title: 'अंक ज्योतिष',
    tools_numerology_desc: 'जीवन पथ अंक पूर्वानुमान।',

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
    cat_vastu: 'वास्तु शास्त्र',
    cat_family: 'परिवार व विरासत',
    cat_pooja: 'पूजा व अनुष्ठान',
    cat_all_astrologers: 'सभी ज्योतिषी',

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
    auth_tab_register: 'खाता बनाएं',
    auth_tab_login: 'सदस्य साइन इन',
    auth_subtitle_register: 'प्राचीन वैदिक पत्र · अपनी यात्रा शुरू करें',
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
    auth_success_message: 'प्रणाम {name}! आपका खाता पवित्र वैदिक पांडुलिपि संग्रह में सफलतापूर्वक अंकित कर दिया गया है।',
    auth_btn_continue: '✦ आकाशीय द्वार में प्रवेश करें ✦',
    auth_footer_stamp: 'एन्क्रिप्टेड प्राचीन वैदिक संग्रह',

    // Admin Console
    admin_console_name: 'त्रिदेव ज्योतिष एडमिन',
    admin_console_caption: 'प्रशासन कंसोल',
    admin_console_name_staff: 'त्रिदेव ज्योतिष स्टाफ',
    admin_console_caption_staff: 'स्टाफ कंसोल',
    admin_search_placeholder: 'खोजें...',
    admin_notifications: 'सूचनाएं',
    admin_profile: 'एडमिन प्रोफ़ाइल',
    admin_profile_staff: 'स्टाफ प्रोफ़ाइल',
    admin_profile_edit: 'प्रोफ़ाइल संपादित करें',
    admin_profile_edit_title: 'प्रोफ़ाइल संपादित करें',
    admin_profile_field_name: 'नाम',
    admin_profile_field_current_password: 'वर्तमान पासवर्ड',
    admin_profile_field_new_password: 'नया पासवर्ड (खाली छोड़ें यदि बदलना नहीं है)',
    admin_logout: 'लॉगआउट',
    admin_sidebar_overview: 'अवलोकन',
    admin_sidebar_applications: 'आवेदन',
    admin_sidebar_astrologers: 'आचार्यगण',
    admin_sidebar_users: 'उपयोगकर्ता',
    admin_sidebar_consultations: 'परामर्श',
    admin_sidebar_reports: 'रिपोर्ट्स',
    admin_sidebar_orders: 'ऑर्डर',
    admin_sidebar_pricing: 'मूल्य निर्धारण',
    admin_sidebar_content: 'सामग्री',
    admin_sidebar_blog: 'ब्लॉग',
    admin_sidebar_shlok: 'दैनिक श्लोक',
    admin_sidebar_notifications: 'सूचनाएं',
    admin_sidebar_audit: 'ऑडिट लॉग',
    admin_sidebar_tokens: 'टोकन मीटर',
    admin_sidebar_evaluation: 'AI मूल्यांकन',
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
    admin_astro_col_live_status: 'लाइव स्थिति',
    admin_astro_status_online_available: 'अभी उपलब्ध',
    admin_astro_status_online_busy: 'सत्र में व्यस्त',
    admin_astro_status_away: 'दूर',
    admin_astro_status_offline: 'ऑफ़लाइन',
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
    admin_astro_tab_audit: 'ऑडिट',
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
    nav_astrology: 'राशीफल',
    nav_kundli: 'मुफ़्त कुंडली',
    nav_calculators: 'कॅल्क्युलेटर',
    nav_reports: 'अहवाल',
    nav_premium_report: 'प्रीमियम अहवाल',
    nav_panchang: 'पंचांग',
    nav_academy: 'गुरुकुल',
    nav_store: 'स्टोअर',
    nav_free_kundli: 'मोफत कुंडली',
    nav_consult: 'सल्ला',
    nav_login: 'लॉगिन',

    section_reports_title: 'ज्योतिषशास्त्रासह सखोल जा',
    section_reports_desc: 'अचूक आणि सखोल कुंडली वाचन जे ग्रहस्थितीला योग्य दिशा दाखवते.',
    premium_banner_eyebrow: 'नवीन · प्रीमियम',
    premium_banner_title: 'तुमचे संपूर्ण जन्म-कुंडली वाचन',
    premium_banner_text: 'एक संपूर्ण, वैयक्तिक अहवाल — तुमची लग्न, चंद्र, प्रत्येक ग्रह, तुमच्या दशा आणि त्या प्रभावित करणारे जीवन क्षेत्र — शास्त्रीय स्त्रोतांमधून विभागवार लिहिलेला.',
    premium_banner_cta: 'माझा अहवाल तयार करा',
    section_tools_title: 'मोफत ज्योतिष साधने',
    section_tools_desc: 'विश्वासार्ह वैदिक ज्योतिष साधने — मोफत, अचूक आणि नेहमी उपलब्ध.',
    section_panchang_title: 'आजचे पंचांग',
    section_panchang_desc: 'शुभ काळ, ग्रहांचे गोचर आणि दैनिक ऊर्जा ग्रिडसाठी वैदिक दैनिक पंचांग.',
    section_horoscope_title: 'तुमचे दैनिक राशीफल',
    section_horoscope_desc: 'तुमच्या चंद्र राशीसाठी खरे, ताजे मोजलेले ग्रह गोचर — दररोज अद्ययावत.',
    horoscope_loading: 'आजच्या {rashi} साठी गोचर वाचत आहोत...',
    section_astrologers_title: 'आचार्यांचा सल्ला घ्या',
    section_astrologers_desc: 'प्रामाणिक वैदिक परंपरेतील अनुभवी ज्योतिष आचार्यांकडून मार्गदर्शन मिळवा.',
    section_store_title: 'त्रिदेव स्टोअर',
    section_store_desc: 'प्रामाणिक, ऊर्जेने भारित रत्ने, यंत्रे आणि आध्यात्मिक साधने.',
    cat_astrology: 'ज्योतिष',
    cta_explore_gurukul: 'गुरुकुल पहा',
    lbl_free: 'मोफत',
    btn_view_course: 'कोर्स पहा',
    roadmap_title: 'गुरुकुल शिक्षण मार्ग',
    roadmap_step1: 'शास्त्री आधार',
    roadmap_step2: 'कुंडली विश्लेषण',
    roadmap_step3: 'ग्रह व राशी',
    roadmap_step4: 'भाव व भावेश',
    roadmap_step5: 'विंशोत्तरी दशा',
    roadmap_step6: 'गोचर संक्रमण',
    roadmap_step7: 'फलदीपिका',
    cta_explore_acharyas: 'सर्व आचार्य पहा',
    astrologers_load_error: 'सध्या ज्योतिषी लोड होऊ शकले नाहीत. कृपया काही वेळाने पुन्हा प्रयत्न करा.',
    kundli_context_label: 'तुमचा कुंडली संदर्भ',
    kundli_context_empty: 'तुमची मोफत चॅट सुरू करण्यासाठी जन्म तपशील भरा — तुमचा D1 चार्ट येथे दिसेल.',
    badge_first_free_chat: 'पहिली मोफत चॅट',
    ai_disclaimer: 'पारंपरिक वैदिक तत्त्वांवर आधारित. व्यावसायिक सल्ला नाही.',
    lbl_example_questions: 'उदाहरण प्रश्न:',
    ai_example_q1: 'माझ्या महादशेचा अर्थ काय आहे?',
    ai_example_q2: 'विवाहासाठी चांगला काळ कधी आहे?',
    ai_example_q3: 'माझ्या सातव्या भावात राहू काय दर्शवतो?',
    ai_form_title: 'तुमचे जन्म तपशील सांगा',
    ai_form_desc: 'यामुळे तुमचा खरा D1 चार्ट तयार होतो — तुमच्या मोफत चॅटची उत्तरे यावरच आधारित असतील, सर्वसाधारण वाचनावर नाही.',
    ai_form_submit: 'माझी मोफत चॅट सुरू करा',
    ai_session_over: 'तुमची मोफत चॅट संपली आहे.',
    ai_continue_chat: 'चॅट सुरू ठेवा — ₹49/सत्र',
    ai_input_placeholder: 'तुमच्या कुंडलीबद्दल विचारा...',
    ai_suggestion1: 'या वर्षी माझा करिअर बदलेल का?',
    ai_suggestion2: 'विवाहासाठी चांगला काळ कधी आहे?',
    ai_suggestion3: 'माझा सध्याचा गोचर काय दर्शवतो?',
    blog_tag_nakshatra: 'नक्षत्र',
    blog_tag_saturn: 'शनि',
    blog_tag_marriage: 'विवाह',
    blog_tag_career: 'करिअर',
    blog_tag_daily_astrology: 'दैनिक ज्योतिष',
    hero_eyebrow: 'ज्योतिष · धर्म · ग्रह · नक्षत्रे',
    hero_scroll_hint: 'पाहण्यासाठी स्क्रोल करा',
    cta_explore_reports: 'अहवाल पहा',
    cta_explore_horoscopes: 'राशीभविष्य पहा',
    cta_explore_tools: 'सर्व टूल्स पहा',
    cta_explore_courses: 'सर्व कोर्स पहा',
    badge_most_popular: 'सर्वाधिक लोकप्रिय',
    lbl_pages: 'पाने',
    lbl_sections: 'विभाग',
    bundles_title: 'तुमचा अनुभव निवडा',
    bundles_subtitle: 'प्रत्येक अहवाल तज्ञ सल्ल्यासह अधिक चांगला करता येतो',
    btn_choose_this: 'हे निवडा',
    label_recommended: 'शिफारस केलेले',
    bundle_1_title: 'फक्त अहवाल',
    bundle_1_desc: '48 तासांत दिला जाणारा संपूर्ण लिखित अहवाल',
    bundle_1_feature1: 'सखोल विश्लेषण',
    bundle_1_feature2: 'PDF स्वरूप',
    bundle_1_feature3: '40+ पाने',
    bundle_2_title: 'अहवाल + तज्ञ प्रश्नोत्तर',
    bundle_2_desc: 'अहवालासह ज्योतिषाला विचारण्यासाठी 2 लिखित प्रश्न',
    bundle_2_feature1: 'संपूर्ण अहवाल',
    bundle_2_feature2: '2 तज्ञ प्रश्न',
    bundle_2_feature3: '48 तासांत उत्तर',
    bundle_3_title: 'अहवाल + सल्ला',
    bundle_3_desc: 'संपूर्ण अहवालासह 20 मिनिटांचा थेट सल्ला',
    bundle_3_feature1: 'संपूर्ण अहवाल',
    bundle_3_feature2: '20 मिनिटांचा व्हिडिओ कॉल',
    bundle_3_feature3: 'रेकॉर्ड केलेले सत्र',
    btn_explore_all_products: 'सर्व उत्पादने पहा',
    store_external_note: 'येथे फक्त झलक दाखवली आहे — प्रत्येक खरेदी tredevastore.com वर पूर्ण होते.',
    btn_shop_now: 'आता खरेदी करा',
    nav_pooja: 'पूजा',
    footer_join_astrologer: 'ज्योतिषी/पंडित म्हणून सामील व्हा',
    footer_safety: 'सुरक्षा',
    about_eyebrow: 'आमची परंपरा',
    about_title: 'TredevaAstro विषयी',
    about_para1: 'TredevaAstro ची स्थापना प्राचीन वैदिक ज्ञानाला आधुनिक डिजिटल स्पष्टतेशी जोडण्यासाठी करण्यात आली. सर्वसामान्य व्यावसायिक भाकिते देण्याऐवजी, आमचे व्यासपीठ शास्त्रीय भारतीय खगोलशास्त्रीय निरीक्षणांवर (ज्योतिष शास्त्र) आधारित आहे.',
    about_para2: 'सर्व गणना लाहिरी अयनांशानुसार केली जाते, जी ग्रहांच्या स्थितीला नक्षत्रांच्या अचूक अंशांशी जुळवते. सर्व सल्लामसलत आणि पूजा अचूक शास्त्रोक्त पद्धतीने व्हाव्यात यासाठी आम्ही प्रामाणिक परंपरेत दीक्षित आचार्यांसोबत भागीदारी करतो.',
    about_para3: 'तुमच्या जन्म कुंडलीचा शोध घ्या, ऊर्जावान उपायांनी ऊर्जा संतुलित करा आणि संरेखन, उद्देश व धर्मासह तुमचा मार्ग चाला.',
    section_testimonials_eyebrow: 'आमचे वापरकर्ते काय म्हणतात',
    section_testimonials_title: 'अनुभवांच्या कथा',
    section_testimonials_demo_note: 'खालील उदाहरणादाखल डेमो testimonials आहेत.',
    section_why_eyebrow: 'आमचे वचन',
    section_why_title: 'TredevaAstro का',
    why_pillar1_title: 'पडताळणी केलेले तज्ञ',
    why_pillar1_desc: 'TredevaAstro वरील प्रत्येक ज्योतिषी त्यांच्या ज्ञान, अचूकता आणि दृष्टिकोनासाठी स्वतः तपासला, मूल्यांकन केला आणि पडताळला जातो.',
    why_pillar2_title: 'खाजगी आणि सुरक्षित',
    why_pillar2_desc: 'तुमचा जन्म डेटा, सल्लामसलत आणि अहवाल खाजगी आहेत. आम्ही तुमची वैयक्तिक माहिती कधीही शेअर, विकत किंवा उघड करत नाही.',
    why_pillar3_title: 'वैयक्तिकृत ज्योतिष',
    why_pillar3_desc: 'एक जन्म प्रोफाइल तुमच्या संपूर्ण अनुभवाला शक्ती देते — कुंडली, राशीभविष्य, AI अंतर्दृष्टी, शिफारसी आणि बरेच काही.',
    why_pillar4_title: 'पारंपरिक ज्ञान, आधुनिक अनुभव',
    why_pillar4_desc: 'शास्त्रीय वैदिक ज्योतिषात रुजलेले, काळजीपूर्वक डिझाइन केलेल्या आधुनिक प्लॅटफॉर्मद्वारे सादर.',
    section_blog_eyebrow: 'जर्नल',
    section_blog_title: 'TredevaAstro जर्नलमधून',
    btn_read_article: 'लेख वाचा →',
    btn_read_more: 'वाचा →',
    nav_prev: 'मागील',
    nav_next: 'पुढील',
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

    banner_0_category: 'वैदिक ज्योतिष',
    banner_0_title: 'तो नकाशा शोधा\nजो तुमच्या जन्मावेळी लिहिला गेला.',
    banner_0_desc: 'अस्सल वैदिक कुंडलीद्वारे तुमच्या राशी, ग्रह आणि नक्षत्रे जाणून घ्या — मोफत, त्वरित.',
    banner_0_cta: 'मोफत कुंडली तयार करा',
    banner_1_category: 'ज्योतिषी सल्लामसलत',
    banner_1_title: 'अशा ज्योतिषीशी बोला\nजो तुम्हाला समजतो.',
    banner_1_desc: 'तुमच्या आयुष्यातील सर्वात महत्त्वाच्या प्रश्नांसाठी वैयक्तिक मार्गदर्शनासाठी सत्यापित वैदिक ज्योतिषींशी संपर्क साधा.',
    banner_1_cta: 'ज्योतिषीशी सल्लामसलत करा',
    banner_2_category: 'ज्योतिष अहवाल',
    banner_2_title: 'तुमच्या ग्रहस्थितींमध्ये\nअधिक खोलवर जा.',
    banner_2_desc: 'पारंपरिक वैदिक पद्धतींद्वारे करिअर, विवाह, आरोग्य आणि नशिबाचे सविस्तर ज्योतिष विश्लेषण.',
    banner_2_cta: 'अहवाल पहा',
    banner_3_category: 'ट्रेडेवास्टोअर',
    banner_3_title: 'तुमच्या प्रवासासाठी\nनिवडलेल्या पवित्र वस्तू.',
    banner_3_desc: 'अस्सल रत्ने, रुद्राक्ष, यंत्रे आणि पवित्र वस्तू — तुमच्या कुंडलीसाठी ऊर्जान्वित.',
    banner_3_cta: 'ट्रेडेवास्टोअर पहा',
    banner_4_category: 'ट्रेडेवाअॅस्ट्रो गुरुकुल',
    banner_4_title: 'ज्योतिषाची भाषा\nशिका.',
    banner_4_desc: 'तज्ञ आचार्यांनी शिकवलेल्या संरचित अभ्यासक्रमांद्वारे पायाभूत ते प्रावीण्यापर्यंत वैदिक ज्योतिषाचा अभ्यास करा.',
    banner_4_cta: 'गुरुकुल पहा',

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
    tools_nakshatra_title: 'नक्षत्र शोधक',
    tools_nakshatra_desc: 'तुमचे जन्म नक्षत्र आणि त्याचा स्वामी ग्रह जाणून घ्या.',
    tools_sade_sati_title: 'साडेसाती',
    tools_numerology_title: 'अंकशास्त्र',
    tools_numerology_desc: 'जीवन मार्ग क्रमांक अंदाज.',

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
    auth_tab_register: 'खाते तयार करा',
    auth_tab_login: 'सदस्य साइन इन',
    auth_subtitle_register: 'प्राचीन वैदिक पत्र · तुमचा प्रवास सुरू करा',
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
    auth_success_message: 'नमस्कार {name}! तुमचे खाते पवित्र वैदिक हस्तलिखित संग्रहात यशस्वीरित्या नोंदवले गेले आहे.',
    auth_btn_continue: '✦ खगोलीय द्वारातून प्रवेश करा ✦',
    auth_footer_stamp: 'एन्क्रिप्टेड प्राचीन वैदिक संग्रह',

    // Admin Console
    admin_console_name: 'त्रिदेव ज्योतिष अ‍ॅडमिन',
    admin_console_caption: 'प्रशासन कन्सोल',
    admin_console_name_staff: 'त्रिदेव ज्योतिष स्टाफ',
    admin_console_caption_staff: 'स्टाफ कन्सोल',
    admin_search_placeholder: 'शोधा...',
    admin_notifications: 'सूचना',
    admin_profile: 'अ‍ॅडमिन प्रोफाइल',
    admin_profile_staff: 'स्टाफ प्रोफाइल',
    admin_profile_edit: 'प्रोफाइल संपादित करा',
    admin_profile_edit_title: 'प्रोफाइल संपादित करा',
    admin_profile_field_name: 'नाव',
    admin_profile_field_current_password: 'सध्याचा पासवर्ड',
    admin_profile_field_new_password: 'नवीन पासवर्ड (बदलायचा नसल्यास रिकामे ठेवा)',
    admin_logout: 'लॉगआउट',
    admin_sidebar_overview: 'अवलोकन',
    admin_sidebar_applications: 'अर्ज',
    admin_sidebar_astrologers: 'आचार्य',
    admin_sidebar_users: 'वापरकर्ते',
    admin_sidebar_consultations: 'सल्लामसलत',
    admin_sidebar_reports: 'अहवाल',
    admin_sidebar_orders: 'ऑर्डर',
    admin_sidebar_pricing: 'किंमत निश्चिती',
    admin_sidebar_content: 'मजकूर',
    admin_sidebar_blog: 'ब्लॉग',
    admin_sidebar_shlok: 'दैनिक श्लोक',
    admin_sidebar_notifications: 'सूचना',
    admin_sidebar_audit: 'ऑडिट लॉग',
    admin_sidebar_tokens: 'टोकन मीटर',
    admin_sidebar_evaluation: 'AI मूल्यांकन',
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
    admin_astro_col_live_status: 'लाइव्ह स्थिती',
    admin_astro_status_online_available: 'सध्या उपलब्ध',
    admin_astro_status_online_busy: 'सत्रात व्यस्त',
    admin_astro_status_away: 'दूर',
    admin_astro_status_offline: 'ऑफलाइन',
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
    admin_astro_tab_audit: 'ऑडिट',
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
    nav_premium_report: 'প্রিমিয়াম রিপোর্ট',
    nav_panchang: 'পঞ্জিকা',
    nav_academy: 'গুরুকুল',
    nav_store: 'স্টোর',
    nav_free_kundli: 'ফ্রি কোষ্ঠী',
    nav_consult: 'পরামর্শ',
    nav_login: 'লগইন',

    section_reports_title: 'জ্যোতিষের সাথে গভীরে যান',
    section_reports_desc: 'বিস্তারিত কোষ্ঠী বিচার যা আপনার গ্রহের অবস্থানকে জীবনের সঠিক দিশায় রূপান্তর করে।',
    premium_banner_eyebrow: 'নতুন · প্রিমিয়াম',
    premium_banner_title: 'আপনার সম্পূর্ণ জন্ম-কোষ্ঠী বিচার',
    premium_banner_text: 'একটি সম্পূর্ণ, ব্যক্তিগতকৃত রিপোর্ট — আপনার লগ্ন, চন্দ্র, প্রতিটি গ্রহ, আপনার দশা এবং যে জীবন ক্ষেত্রগুলি তারা প্রভাবিত করে — ধ্রুপদী উৎস থেকে অংশ অনুযায়ী লেখা।',
    premium_banner_cta: 'আমার রিপোর্ট তৈরি করুন',
    section_tools_title: 'ফ্রি জ্যোতিষ সরঞ্জাম',
    section_tools_desc: 'নির্ভরযোগ্য বৈদিক জ্যোতিষ সরঞ্জাম — সম্পূর্ণ ফ্রি ও নির্ভুল।',
    section_panchang_title: 'আজকের পঞ্জিকা',
    section_panchang_desc: 'শুভ সময়, গ্রহের গোচর এবং দৈনন্দিন শক্তির গ্রিডের বৈদিক বিবরণ।',
    section_astrologers_title: 'আচার্যের পরামর্শ নিন',
    section_astrologers_desc: 'বৈদিক বংশের প্রামাণিক জ্যোতিষাচার্যদের কাছ থেকে সঠিক মার্গদর্শন লাভ করুন।',
    section_store_title: 'ত্রিদেব স্টোর',
    section_store_desc: 'বিশুদ্ধ, মন্ত্রপুত রত্ন পাথর, যন্ত্র এবং আধ্যাত্মিক সরঞ্জাম।',
    cat_astrology: 'জ্যোতিষ',
    cta_explore_gurukul: 'গুরুকুল দেখুন',
    lbl_free: 'বিনামূল্যে',
    btn_view_course: 'কোর্স দেখুন',
    roadmap_title: 'গুরুকুল শেখার পথ',
    roadmap_step1: 'শাস্ত্রী মূল বিষয়',
    roadmap_step2: 'কোষ্ঠী বিশ্লেষণ',
    roadmap_step3: 'গ্রহ ও রাশি',
    roadmap_step4: 'ভাব ও ভাবেশ',
    roadmap_step5: 'বিংশোত্তরী দশা',
    roadmap_step6: 'গোচর পারগমন',
    roadmap_step7: 'ফলদীপিকা',
    cta_explore_acharyas: 'সব আচার্য দেখুন',
    astrologers_load_error: 'এখন জ্যোতিষীদের লোড করা যায়নি। অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।',
    kundli_context_label: 'আপনার কোষ্ঠী প্রসঙ্গ',
    kundli_context_empty: 'আপনার ফ্রি চ্যাট শুরু করতে জন্ম বিবরণ পূরণ করুন — আপনার D1 চার্ট এখানে দেখা যাবে।',
    badge_first_free_chat: 'প্রথম ফ্রি চ্যাট',
    ai_disclaimer: 'ঐতিহ্যবাহী বৈদিক নীতির উপর ভিত্তি করে। পেশাদার পরামর্শ নয়।',
    lbl_example_questions: 'উদাহরণ প্রশ্ন:',
    ai_example_q1: 'আমার মহাদশার অর্থ কী?',
    ai_example_q2: 'বিবাহের জন্য ভালো সময় কখন?',
    ai_example_q3: 'আমার সপ্তম ভাবে রাহু কী নির্দেশ করে?',
    ai_form_title: 'আপনার জন্ম বিবরণ জানান',
    ai_form_desc: 'এটি আপনার আসল D1 চার্ট তৈরি করে — আপনার ফ্রি চ্যাটের উত্তর এর উপর ভিত্তি করেই হবে, সাধারণ পাঠের উপর নয়।',
    ai_form_submit: 'আমার ফ্রি চ্যাট শুরু করুন',
    ai_session_over: 'আপনার ফ্রি চ্যাট শেষ হয়ে গেছে।',
    ai_continue_chat: 'চ্যাট চালিয়ে যান — ₹৪৯/সেশন',
    ai_input_placeholder: 'আপনার কোষ্ঠী সম্পর্কে জিজ্ঞাসা করুন...',
    ai_suggestion1: 'এই বছর কি আমার কর্মজীবন বদলাবে?',
    ai_suggestion2: 'বিবাহের জন্য ভালো সময় কখন?',
    ai_suggestion3: 'আমার বর্তমান গোচর কী নির্দেশ করে?',
    blog_tag_nakshatra: 'নক্ষত্র',
    blog_tag_saturn: 'শনি',
    blog_tag_marriage: 'বিবাহ',
    blog_tag_career: 'কর্মজীবন',
    blog_tag_daily_astrology: 'দৈনিক জ্যোতিষ',
    hero_eyebrow: 'জ্যোতিষ · ধর্ম · গ্রহ · নক্ষত্র',
    hero_scroll_hint: 'দেখতে স্ক্রোল করুন',
    cta_explore_reports: 'রিপোর্ট দেখুন',
    cta_explore_horoscopes: 'রাশিফল দেখুন',
    cta_explore_tools: 'সব টুল দেখুন',
    cta_explore_courses: 'সব কোর্স দেখুন',
    badge_most_popular: 'সবচেয়ে জনপ্রিয়',
    lbl_pages: 'পৃষ্ঠা',
    lbl_sections: 'বিভাগ',
    bundles_title: 'আপনার অভিজ্ঞতা বেছে নিন',
    bundles_subtitle: 'প্রতিটি রিপোর্ট বিশেষজ্ঞ পরামর্শের মাধ্যমে আরও উন্নত করা যায়',
    btn_choose_this: 'এটি বেছে নিন',
    label_recommended: 'প্রস্তাবিত',
    bundle_1_title: 'শুধু রিপোর্ট',
    bundle_1_desc: '৪৮ ঘণ্টায় প্রদত্ত সম্পূর্ণ লিখিত রিপোর্ট',
    bundle_1_feature1: 'গভীর বিশ্লেষণ',
    bundle_1_feature2: 'PDF ফরম্যাট',
    bundle_1_feature3: '৪০+ পৃষ্ঠা',
    bundle_2_title: 'রিপোর্ট + বিশেষজ্ঞ প্রশ্নোত্তর',
    bundle_2_desc: 'রিপোর্টের সাথে জ্যোতিষীকে ২টি লিখিত প্রশ্ন',
    bundle_2_feature1: 'সম্পূর্ণ রিপোর্ট',
    bundle_2_feature2: '২টি বিশেষজ্ঞ প্রশ্ন',
    bundle_2_feature3: '৪৮ ঘণ্টায় উত্তর',
    bundle_3_title: 'রিপোর্ট + পরামর্শ',
    bundle_3_desc: 'সম্পূর্ণ রিপোর্টের সাথে ২০ মিনিটের লাইভ পরামর্শ',
    bundle_3_feature1: 'সম্পূর্ণ রিপোর্ট',
    bundle_3_feature2: '২০ মিনিটের ভিডিও কল',
    bundle_3_feature3: 'রেকর্ড করা সেশন',
    btn_explore_all_products: 'সব পণ্য দেখুন',
    store_external_note: 'এখানে শুধু প্রিভিউ দেখানো হয়েছে — প্রতিটি কেনাকাটা tredevastore.com-এ সম্পন্ন হয়।',
    btn_shop_now: 'এখনই কিনুন',
    nav_pooja: 'পূজা',
    footer_join_astrologer: 'জ্যোতিষী/পণ্ডিত হিসেবে যোগ দিন',
    footer_safety: 'নিরাপত্তা',
    about_eyebrow: 'আমাদের ঐতিহ্য',
    about_title: 'TredevaAstro সম্পর্কে',
    about_para1: 'TredevaAstro প্রাচীন বৈদিক জ্ঞানকে আধুনিক ডিজিটাল স্বচ্ছতার সাথে যুক্ত করার লক্ষ্যে প্রতিষ্ঠিত হয়েছিল। সাধারণ বাণিজ্যিক ভবিষ্যদ্বাণীর পরিবর্তে, আমাদের প্ল্যাটফর্ম শাস্ত্রীয় ভারতীয় জ্যোতির্বৈজ্ঞানিক পর্যবেক্ষণের (জ্যোতিষ শাস্ত্র) উপর ভিত্তি করে তৈরি।',
    about_para2: 'সকল গণনা লাহিড়ি অয়নাংশ অনুসরণ করে, যা গ্রহের অবস্থানকে নক্ষত্রের সঠিক ডিগ্রির সাথে মিলিয়ে দেয়। আমরা সম্মানিত আচার্যদের সাথে অংশীদারিত্ব করি যারা প্রকৃত পরম্পরায় দীক্ষিত, যাতে সমস্ত পরামর্শ ও পূজা সঠিক শাস্ত্রীয় বিধি অনুসরণ করে।',
    about_para3: 'আপনার জন্ম কোষ্ঠী অন্বেষণ করুন, শক্তিপ্রাপ্ত প্রতিকারের মাধ্যমে শক্তির ভারসাম্য আনুন, এবং সারিবদ্ধতা, উদ্দেশ্য ও ধর্মের সাথে আপনার পথ চলুন।',
    section_testimonials_eyebrow: 'আমাদের ব্যবহারকারীরা যা বলেন',
    section_testimonials_title: 'অভিজ্ঞতার গল্প',
    section_testimonials_demo_note: 'নিচেরগুলো উদাহরণস্বরূপ ডেমো testimonials।',
    section_why_eyebrow: 'আমাদের প্রতিশ্রুতি',
    section_why_title: 'কেন TredevaAstro',
    why_pillar1_title: 'যাচাইকৃত বিশেষজ্ঞ',
    why_pillar1_desc: 'TredevaAstro-র প্রতিটি জ্যোতিষীকে তাঁদের জ্ঞান, নির্ভুলতা ও পদ্ধতির জন্য ম্যানুয়ালি পর্যালোচনা, মূল্যায়ন ও যাচাই করা হয়।',
    why_pillar2_title: 'ব্যক্তিগত ও নিরাপদ',
    why_pillar2_desc: 'আপনার জন্ম তথ্য, পরামর্শ ও রিপোর্ট সম্পূর্ণ ব্যক্তিগত। আমরা কখনো আপনার তথ্য শেয়ার, বিক্রি বা প্রকাশ করি না।',
    why_pillar3_title: 'ব্যক্তিগতকৃত জ্যোতিষ',
    why_pillar3_desc: 'একটি জন্ম প্রোফাইল আপনার সম্পূর্ণ অভিজ্ঞতাকে শক্তি জোগায় — কোষ্ঠী, রাশিফল, AI অন্তর্দৃষ্টি, সুপারিশ এবং আরও অনেক কিছু।',
    why_pillar4_title: 'ঐতিহ্যবাহী জ্ঞান, আধুনিক অভিজ্ঞতা',
    why_pillar4_desc: 'শাস্ত্রীয় বৈদিক জ্যোতিষে নিহিত, যত্নসহকারে ডিজাইন করা আধুনিক প্ল্যাটফর্মের মাধ্যমে পরিবেশিত।',
    section_blog_eyebrow: 'জার্নাল',
    section_blog_title: 'TredevaAstro জার্নাল থেকে',
    btn_read_article: 'নিবন্ধ পড়ুন →',
    btn_read_more: 'পড়ুন →',
    nav_prev: 'আগের',
    nav_next: 'পরের',
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

    banner_0_category: 'বৈদিক জ্যোতিষ',
    banner_0_title: 'সেই মানচিত্র আবিষ্কার করুন\nযা আপনার জন্মের সময় লেখা হয়েছিল।',
    banner_0_desc: 'একটি সত্যিকারের বৈদিক কুণ্ডলীর মাধ্যমে আপনার রাশি, গ্রহ এবং নক্ষত্র সম্পর্কে জানুন — বিনামূল্যে, তাৎক্ষণিকভাবে।',
    banner_0_cta: 'বিনামূল্যে কুণ্ডলী তৈরি করুন',
    banner_1_category: 'জ্যোতিষী পরামর্শ',
    banner_1_title: 'এমন একজন জ্যোতিষীর সাথে কথা বলুন\nযিনি আপনাকে বোঝেন।',
    banner_1_desc: 'আপনার জীবনের সবচেয়ে গুরুত্বপূর্ণ প্রশ্নগুলির জন্য ব্যক্তিগত নির্দেশনার জন্য যাচাইকৃত বৈদিক জ্যোতিষীদের সাথে সংযুক্ত হন।',
    banner_1_cta: 'জ্যোতিষীর সাথে পরামর্শ করুন',
    banner_2_category: 'জ্যোতিষ প্রতিবেদন',
    banner_2_title: 'আপনার গ্রহের অবস্থান সম্পর্কে\nআরও গভীরে যান।',
    banner_2_desc: 'ক্লাসিক্যাল বৈদিক পদ্ধতিতে কর্মজীবন, বিবাহ, স্বাস্থ্য এবং ভাগ্য জুড়ে বিস্তারিত জ্যোতিষ বিশ্লেষণ।',
    banner_2_cta: 'প্রতিবেদন দেখুন',
    banner_3_category: 'ট্রেডেভাস্টোর',
    banner_3_title: 'আপনার যাত্রার জন্য\nনির্বাচিত পবিত্র বস্তু।',
    banner_3_desc: 'প্রকৃত রত্ন, রুদ্রাক্ষ, যন্ত্র এবং পবিত্র বস্তু — আপনার কুণ্ডলীর জন্য শক্তিসম্পন্ন।',
    banner_3_cta: 'ট্রেডেভাস্টোর দেখুন',
    banner_4_category: 'ট্রেডেভাঅ্যাস্ট্রো গুরুকুল',
    banner_4_title: 'জ্যোতিষের ভাষা\nশিখুন।',
    banner_4_desc: 'বিশেষজ্ঞ আচার্যদের দ্বারা পরিচালিত কাঠামোবদ্ধ কোর্সের মাধ্যমে ভিত্তি থেকে দক্ষতা পর্যন্ত বৈদিক জ্যোতিষ অধ্যয়ন করুন।',
    banner_4_cta: 'গুরুকুল দেখুন',

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
    tools_kundli_milan_cta: 'সামঞ্জস্য পরীক্ষা করুন →',
    tools_nakshatra_cta: 'নক্ষত্র অন্বেষণ করুন →',
    tools_nakshatra_title: 'নক্ষত্র সন্ধানকারী',
    tools_nakshatra_desc: 'আপনার জন্ম নক্ষত্র এবং এর অধিপতি গ্রহ আবিষ্কার করুন।',
    tools_sade_sati_title: 'সাড়ে সাতী',
    tools_numerology_title: 'সংখ্যাতত্ত্ব',
    tools_numerology_desc: 'জীবন পথ সংখ্যা পূর্বাভাস।',

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
    nav_premium_report: 'பிரீமியம் அறிக்கை',
    nav_panchang: 'பஞ்சாங்கம்',
    nav_academy: 'குருகுலம்',
    nav_store: 'கடை',
    nav_free_kundli: 'இலவச ஜாதகம்',
    nav_consult: 'ஆலோசனை',
    nav_login: 'உள்நுழை',

    section_reports_title: 'ஜோதிடத்தின் ஆழம் அறியுங்கள்',
    section_reports_desc: 'உங்கள் கிரக அமைப்புகளை வாழ்வின் நேரடி வழிகாட்டியாக மாற்றும் விரிவான ஜாதக வாசிப்பு.',
    premium_banner_eyebrow: 'புதியது · பிரீமியம்',
    premium_banner_title: 'உங்கள் முழுமையான ஜாதக வாசிப்பு',
    premium_banner_text: 'ஒரு முழுமையான, தனிப்பயன் அறிக்கை — உங்கள் லக்னம், சந்திரன், ஒவ்வொரு கிரகமும், உங்கள் தசைகள் மற்றும் அவை பாதிக்கும் வாழ்க்கைத் துறைகள் — பாரம்பரிய ஆதாரங்களிலிருந்து பிரிவு வாரியாக எழுதப்பட்டது.',
    premium_banner_cta: 'எனது அறிக்கையை உருவாக்கு',
    section_tools_title: 'இலவச ஜோதிட கருவிகள்',
    section_tools_desc: 'நம்பகமான வேத ஜோதிட கருவிகள் — இலவசம், துல்லியமானது, எப்போதும் கிடைக்கும்.',
    section_panchang_title: 'இன்றைய பஞ்சாங்கம்',
    section_panchang_desc: 'நல்ல நேரம், கிரக பெயர்ச்சி மற்றும் தினசரி ஆற்றலை அறியும் பஞ்சாங்கம்.',
    section_astrologers_title: 'ஆச்சார்யாவை அணுகுங்கள்',
    section_astrologers_desc: 'பாரம்பரிய வேத ஜோதிட வழியில் வந்த சான்றளிக்கப்பட்ட ஆச்சார்யாக்களிடம் ஆலோசனை பெறுக.',
    section_store_title: 'திரிதேவ் ஸ்டோர்',
    section_store_desc: 'தூய, ஆற்றல் ஊட்டப்பட்ட நவரத்தினங்கள், யந்திரங்கள் மற்றும் ஆன்மீக பொருட்கள்.',
    cat_astrology: 'ஜோதிடம்',
    cta_explore_gurukul: 'குருகுலத்தைப் பார்க்க',
    lbl_free: 'இலவசம்',
    btn_view_course: 'படிப்பைப் பார்க்க',
    roadmap_title: 'குருகுல கற்றல் பாதை',
    roadmap_step1: 'சாஸ்திரி அடிப்படைகள்',
    roadmap_step2: 'ஜாதக பகுப்பாய்வு',
    roadmap_step3: 'கிரகங்களும் ராசிகளும்',
    roadmap_step4: 'பாவங்களும் அதிபதிகளும்',
    roadmap_step5: 'விம்சோத்தரி தசை',
    roadmap_step6: 'கோசார கிரக சஞ்சாரம்',
    roadmap_step7: 'பலதீபிகா',
    cta_explore_acharyas: 'அனைத்து ஆச்சாரியர்களையும் பார்க்க',
    astrologers_load_error: 'இப்போது ஜோதிடர்களை ஏற்ற முடியவில்லை. சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.',
    kundli_context_label: 'உங்கள் ஜாதக சூழல்',
    kundli_context_empty: 'உங்கள் இலவச அரட்டையைத் தொடங்க பிறப்பு விவரங்களை நிரப்பவும் — உங்கள் D1 சார்ட் இங்கே தோன்றும்.',
    badge_first_free_chat: 'முதல் இலவச அரட்டை',
    ai_disclaimer: 'பாரம்பரிய வேத கொள்கைகளை அடிப்படையாகக் கொண்டது. தொழில்முறை ஆலோசனை அல்ல.',
    lbl_example_questions: 'எடுத்துக்காட்டு கேள்விகள்:',
    ai_example_q1: 'எனது மஹாதசா எதைக் குறிக்கிறது?',
    ai_example_q2: 'திருமணத்திற்கு நல்ல நேரம் எப்போது?',
    ai_example_q3: 'எனது 7வது வீட்டில் ராகு என்ன குறிக்கிறது?',
    ai_form_title: 'உங்கள் பிறப்பு விவரங்களைக் கூறுங்கள்',
    ai_form_desc: 'இது உங்கள் உண்மையான D1 சார்ட்டை உருவாக்குகிறது — உங்கள் இலவச அரட்டையின் பதில்கள் இதன் அடிப்படையிலேயே இருக்கும், பொதுவான வாசிப்பில் அல்ல.',
    ai_form_submit: 'எனது இலவச அரட்டையைத் தொடங்கு',
    ai_session_over: 'உங்கள் இலவச அரட்டை முடிந்துவிட்டது.',
    ai_continue_chat: 'அரட்டையைத் தொடரவும் — ₹49/அமர்வு',
    ai_input_placeholder: 'உங்கள் ஜாதகத்தைப் பற்றி கேளுங்கள்...',
    ai_suggestion1: 'இந்த ஆண்டு எனது தொழில் மாறுமா?',
    ai_suggestion2: 'திருமணத்திற்கு நல்ல நேரம் எப்போது?',
    ai_suggestion3: 'எனது தற்போதைய கிரக பெயர்ச்சி என்ன குறிக்கிறது?',
    blog_tag_nakshatra: 'நட்சத்திரம்',
    blog_tag_saturn: 'சனி',
    blog_tag_marriage: 'திருமணம்',
    blog_tag_career: 'தொழில்',
    blog_tag_daily_astrology: 'தினசரி ஜோதிடம்',
    hero_eyebrow: 'ஜோதிடம் · தர்மம் · கிரகங்கள் · நட்சத்திரங்கள்',
    hero_scroll_hint: 'மேலும் பார்க்க கீழே உருட்டவும்',
    cta_explore_reports: 'அறிக்கைகளைப் பார்க்க',
    cta_explore_horoscopes: 'ராசிபலன்களைப் பார்க்க',
    cta_explore_tools: 'அனைத்து கருவிகளையும் பார்க்க',
    cta_explore_courses: 'அனைத்து படிப்புகளையும் பார்க்க',
    badge_most_popular: 'மிகவும் பிரபலமானது',
    lbl_pages: 'பக்கங்கள்',
    lbl_sections: 'பிரிவுகள்',
    bundles_title: 'உங்கள் அனுபவத்தைத் தேர்ந்தெடுக்கவும்',
    bundles_subtitle: 'ஒவ்வொரு அறிக்கையையும் நிபுணர் ஆலோசனையுடன் மேம்படுத்தலாம்',
    btn_choose_this: 'இதைத் தேர்ந்தெடு',
    label_recommended: 'பரிந்துரைக்கப்பட்டது',
    bundle_1_title: 'அறிக்கை மட்டும்',
    bundle_1_desc: '48 மணி நேரத்தில் வழங்கப்படும் முழு எழுதப்பட்ட அறிக்கை',
    bundle_1_feature1: 'ஆழமான பகுப்பாய்வு',
    bundle_1_feature2: 'PDF வடிவம்',
    bundle_1_feature3: '40+ பக்கங்கள்',
    bundle_2_title: 'அறிக்கை + நிபுணர் கேள்வி பதில்',
    bundle_2_desc: 'அறிக்கையுடன் ஜோதிடருக்கு 2 எழுதப்பட்ட கேள்விகள்',
    bundle_2_feature1: 'முழு அறிக்கை',
    bundle_2_feature2: '2 நிபுணர் கேள்விகள்',
    bundle_2_feature3: '48 மணி நேர பதில்',
    bundle_3_title: 'அறிக்கை + ஆலோசனை',
    bundle_3_desc: 'முழு அறிக்கையுடன் 20 நிமிட நேரடி ஆலோசனை',
    bundle_3_feature1: 'முழு அறிக்கை',
    bundle_3_feature2: '20 நிமிட வீடியோ அழைப்பு',
    bundle_3_feature3: 'பதிவு செய்யப்பட்ட அமர்வு',
    btn_explore_all_products: 'அனைத்து பொருட்களையும் பார்க்க',
    store_external_note: 'இங்கே முன்னோட்டமாக மட்டும் காட்டப்படுகிறது — ஒவ்வொரு கொள்முதலும் tredevastore.com-இல் முடிக்கப்படுகிறது.',
    btn_shop_now: 'இப்போது வாங்கவும்',
    nav_pooja: 'பூஜை',
    footer_join_astrologer: 'ஜோதிடர்/பண்டிதராக சேரவும்',
    footer_safety: 'பாதுகாப்பு',
    about_eyebrow: 'எங்கள் பாரம்பரியம்',
    about_title: 'TredevaAstro பற்றி',
    about_para1: 'பண்டைய வேத ஞானத்தை நவீன டிஜிட்டல் தெளிவுடன் இணைக்க TredevaAstro நிறுவப்பட்டது. பொதுவான வணிக கணிப்புகளை உருவாக்குவதற்குப் பதிலாக, எங்கள் தளம் பாரம்பரிய இந்திய வானியல் அவதானிப்புகளை (ஜோதிட சாஸ்திரம்) அடிப்படையாகக் கொண்டது.',
    about_para2: 'அனைத்து கணக்கீடுகளும் லாஹிரி அயனாம்சத்தைப் பின்பற்றுகின்றன, இது கிரக நிலைகளை நட்சத்திரங்களின் துல்லியமான டிகிரிகளுடன் பொருத்துகிறது. அனைத்து ஆலோசனைகளும் பூஜைகளும் துல்லியமான சாஸ்திர முறைகளைப் பின்பற்ற, உண்மையான பாரம்பரியங்களில் தீட்சை பெற்ற மதிப்பிற்குரிய ஆச்சாரியர்களுடன் நாங்கள் இணைந்து செயல்படுகிறோம்.',
    about_para3: 'உங்கள் பிறப்பு ஜாதகத்தை ஆராயுங்கள், ஆற்றல் நிறைந்த பரிகாரங்கள் மூலம் ஆற்றல்களை சமநிலைப்படுத்துங்கள், மற்றும் சீரமைப்பு, நோக்கம் மற்றும் தர்மத்துடன் உங்கள் பாதையில் நடையுங்கள்.',
    section_testimonials_eyebrow: 'எங்கள் பயனர்கள் என்ன கூறுகிறார்கள்',
    section_testimonials_title: 'அனுபவக் கதைகள்',
    section_testimonials_demo_note: 'கீழே உள்ளவை எடுத்துக்காட்டு டெமோ testimonials ஆகும்.',
    section_why_eyebrow: 'எங்கள் உறுதிமொழி',
    section_why_title: 'ஏன் TredevaAstro',
    why_pillar1_title: 'சரிபார்க்கப்பட்ட நிபுணர்கள்',
    why_pillar1_desc: 'TredevaAstro-வில் உள்ள ஒவ்வொரு ஜோதிடரும் அவர்களின் அறிவு, துல்லியம் மற்றும் அணுகுமுறைக்காக கைமுறையாக மதிப்பாய்வு செய்யப்பட்டு சரிபார்க்கப்படுகிறார்கள்.',
    why_pillar2_title: 'தனிப்பட்ட மற்றும் பாதுகாப்பானது',
    why_pillar2_desc: 'உங்கள் பிறப்பு தரவு, ஆலோசனைகள் மற்றும் அறிக்கைகள் தனிப்பட்டவை. உங்கள் தனிப்பட்ட தகவலை நாங்கள் ஒருபோதும் பகிரவோ, விற்கவோ, வெளிப்படுத்தவோ மாட்டோம்.',
    why_pillar3_title: 'தனிப்பயனாக்கப்பட்ட ஜோதிடம்',
    why_pillar3_desc: 'ஒரு பிறப்பு சுயவிவரம் உங்கள் முழு அனுபவத்தையும் இயக்குகிறது — ஜாதகம், ராசிபலன், AI நுண்ணறிவு, பரிந்துரைகள் மற்றும் பலவும்.',
    why_pillar4_title: 'பாரம்பரிய ஞானம், நவீன அனுபவம்',
    why_pillar4_desc: 'பாரம்பரிய வேத ஜோதிடத்தில் வேரூன்றி, கவனமாக வடிவமைக்கப்பட்ட நவீன தளத்தின் மூலம் வழங்கப்படுகிறது.',
    section_blog_eyebrow: 'பத்திரிகை',
    section_blog_title: 'TredevaAstro பத்திரிகையிலிருந்து',
    btn_read_article: 'கட்டுரையைப் படிக்க →',
    btn_read_more: 'படிக்க →',
    nav_prev: 'முந்தைய',
    nav_next: 'அடுத்த',
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

    banner_0_category: 'வேத ஜோதிடம்',
    banner_0_title: 'உங்கள் பிறப்பில் எழுதப்பட்ட\nவரைபடத்தைக் கண்டறியுங்கள்.',
    banner_0_desc: 'உண்மையான வேத ஜாதகத்தின் மூலம் உங்கள் ராசிகள், கிரகங்கள் மற்றும் நட்சத்திரங்களை ஆராயுங்கள் — இலவசமாக, உடனடியாக.',
    banner_0_cta: 'இலவச ஜாதகம் உருவாக்கவும்',
    banner_1_category: 'ஜோதிடர் ஆலோசனை',
    banner_1_title: 'உங்களைப் புரிந்துகொள்ளும்\nஜோதிடருடன் பேசுங்கள்.',
    banner_1_desc: 'உங்கள் வாழ்க்கையின் மிக முக்கியமான கேள்விகளுக்கு தனிப்பயனாக்கப்பட்ட வழிகாட்டுதலுக்காக சரிபார்க்கப்பட்ட வேத ஜோதிடர்களுடன் இணையுங்கள்.',
    banner_1_cta: 'ஜோதிடரிடம் ஆலோசிக்கவும்',
    banner_2_category: 'ஜோதிட அறிக்கைகள்',
    banner_2_title: 'உங்கள் கிரக அமைப்புகளில்\nஆழமாகச் செல்லுங்கள்.',
    banner_2_desc: 'பாரம்பரிய வேத முறைகள் மூலம் தொழில், திருமணம், ஆரோக்கியம் மற்றும் தலைவிதி குறித்த விரிவான ஜோதிட பகுப்பாய்வு.',
    banner_2_cta: 'அறிக்கைகளை ஆராயுங்கள்',
    banner_3_category: 'ட்ரெடேவாஸ்டோர்',
    banner_3_title: 'உங்கள் பயணத்திற்காகத்\nதேர்ந்தெடுக்கப்பட்ட புனித பொருட்கள்.',
    banner_3_desc: 'உண்மையான ரத்தினங்கள், உருத்திராட்சம், யந்திரங்கள் மற்றும் புனித பொருட்கள் — உங்கள் ஜாதகத்திற்காக சக்தியூட்டப்பட்டவை.',
    banner_3_cta: 'ட்ரெடேவாஸ்டோரை ஆராயுங்கள்',
    banner_4_category: 'ட்ரெடேவாஜோதிடம் குருகுலம்',
    banner_4_title: 'ஜோதிடத்தின் மொழியைக்\nகற்றுக்கொள்ளுங்கள்.',
    banner_4_desc: 'நிபுணர் ஆசார்யர்களால் கற்பிக்கப்படும் கட்டமைக்கப்பட்ட பாடநெறிகள் மூலம் அடிப்படையிலிருந்து தேர்ச்சி வரை வேத ஜோதிடத்தைப் படியுங்கள்.',
    banner_4_cta: 'குருகுலத்தை ஆராயுங்கள்',

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
    tools_kundli_milan_cta: 'பொருத்தத்தை சரிபார்க்கவும் →',
    tools_nakshatra_cta: 'நட்சத்திரத்தை ஆராயுங்கள் →',
    tools_nakshatra_title: 'நட்சத்திரம் கண்டறிதல்',
    tools_nakshatra_desc: 'உங்கள் பிறப்பு நட்சத்திரத்தையும் அதன் ஆளும் கிரகத்தையும் கண்டறியவும்.',
    tools_sade_sati_title: 'சாடே சாதி',
    tools_numerology_title: 'எண் ஜோதிடம்',
    tools_numerology_desc: 'வாழ்க்கைப் பாதை எண் முன்னறிவிப்பு.',

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
    nav_premium_report: 'ప్రీమియం నివేదిక',
    nav_panchang: 'పంచాంగం',
    nav_academy: 'గురుకులం',
    nav_store: 'స్టోర్',
    nav_free_kundli: 'ఉచిత జాతకం',
    nav_consult: 'సలహా',
    nav_login: 'లాగిన్',

    section_reports_title: 'జ్యోతిష్యం తో లోతుగా తెలుసుకోండి',
    section_reports_desc: 'గ్రహాల గమనాన్ని జీవిత మార్గదర్శకంగా మార్చే వివరణాత్మక జాతక నివేదిక.',
    premium_banner_eyebrow: 'కొత్తది · ప్రీమియం',
    premium_banner_title: 'మీ పూర్తి జన్మ-కుండలి పఠనం',
    premium_banner_text: 'ఒక సంపూర్ణ, వ్యక్తిగతీకరించిన నివేదిక — మీ లగ్నం, చంద్రుడు, ప్రతి గ్రహం, మీ దశలు మరియు అవి ప్రభావితం చేసే జీవిత రంగాలు — సాంప్రదాయ మూలాల నుండి విభాగాల వారీగా రాయబడింది.',
    premium_banner_cta: 'నా నివేదికను సృష్టించండి',
    section_tools_title: 'ఉచిత జ్యోతిష్య సాధనాలు',
    section_tools_desc: 'ఖచ్చితమైన మరియు విశ్వసనీయమైన ఉచిత వైదిక జ్యోతిష్య సాధనాలు.',
    section_panchang_title: 'నేటి పంచాంగం',
    section_panchang_desc: 'శుభ సమయాలు, గ్రహాల మార్పులు మరియు రోజువారీ ఫలితాల పంచాంగం.',
    section_astrologers_title: 'ఆచార్యులను సంప్రదించండి',
    section_astrologers_desc: 'వైదిక సంప్రదాయ నిపుణులైన జ్యోతిష్య శాస్త్ర ఆచార్యుల నుండి మార్గదర్శకత్వం.',
    section_store_title: 'త్రిదేవ్ స్టోర్',
    section_store_desc: 'పరిశుద్ధమైన మరియు శక్తివంతమైన రత్నాలు, యంత్రాలు మరియు ఆధ్యాత్మిక వస్తువులు.',
    cat_astrology: 'జ్యోతిష్యం',
    cta_explore_gurukul: 'గురుకులం చూడండి',
    lbl_free: 'ఉచితం',
    btn_view_course: 'కోర్సు చూడండి',
    roadmap_title: 'గురుకుల అభ్యాస మార్గం',
    roadmap_step1: 'శాస్త్రి ప్రాథమికాలు',
    roadmap_step2: 'జాతక విశ్లేషణ',
    roadmap_step3: 'గ్రహాలు & రాశులు',
    roadmap_step4: 'భావాలు & భావాధిపతులు',
    roadmap_step5: 'వింశోత్తరి దశ',
    roadmap_step6: 'గోచార సంచారాలు',
    roadmap_step7: 'ఫలదీపిక',
    cta_explore_acharyas: 'అన్ని ఆచార్యులను చూడండి',
    astrologers_load_error: 'ఇప్పుడు జ్యోతిష్కులను లోడ్ చేయలేకపోయాము. దయచేసి కొద్దిసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.',
    kundli_context_label: 'మీ జాతక సందర్భం',
    kundli_context_empty: 'మీ ఉచిత చాట్‌ను ప్రారంభించడానికి మీ జన్మ వివరాలను పూరించండి — మీ D1 చార్ట్ ఇక్కడ కనిపిస్తుంది.',
    badge_first_free_chat: 'మొదటి ఉచిత చాట్',
    ai_disclaimer: 'సాంప్రదాయ వైదిక సూత్రాల ఆధారంగా. వృత్తిపరమైన సలహా కాదు.',
    lbl_example_questions: 'ఉదాహరణ ప్రశ్నలు:',
    ai_example_q1: 'నా మహాదశ అంటే ఏమిటి?',
    ai_example_q2: 'వివాహానికి మంచి సమయం ఎప్పుడు?',
    ai_example_q3: 'నా 7వ ఇంట్లో రాహువు ఏమి సూచిస్తుంది?',
    ai_form_title: 'మీ జన్మ వివరాలు చెప్పండి',
    ai_form_desc: 'ఇది మీ నిజమైన D1 చార్ట్‌ను రూపొందిస్తుంది — మీ ఉచిత చాట్ సమాధానాలు దీని ఆధారంగానే ఉంటాయి, సాధారణ పఠనంపై కాదు.',
    ai_form_submit: 'నా ఉచిత చాట్‌ను ప్రారంభించండి',
    ai_session_over: 'మీ ఉచిత చాట్ ముగిసింది.',
    ai_continue_chat: 'చాట్ కొనసాగించండి — ₹49/సెషన్',
    ai_input_placeholder: 'మీ జాతకం గురించి అడగండి...',
    ai_suggestion1: 'ఈ సంవత్సరం నా కెరీర్ మారుతుందా?',
    ai_suggestion2: 'వివాహానికి మంచి సమయం ఎప్పుడు?',
    ai_suggestion3: 'నా ప్రస్తుత గోచారం ఏమి సూచిస్తుంది?',
    blog_tag_nakshatra: 'నక్షత్రం',
    blog_tag_saturn: 'శని',
    blog_tag_marriage: 'వివాహం',
    blog_tag_career: 'కెరీర్',
    blog_tag_daily_astrology: 'దైనందిన జ్యోతిష్యం',
    hero_eyebrow: 'జ్యోతిష్యం · ధర్మం · గ్రహాలు · నక్షత్రాలు',
    hero_scroll_hint: 'చూడటానికి స్క్రోల్ చేయండి',
    cta_explore_reports: 'నివేదికలను చూడండి',
    cta_explore_horoscopes: 'రాశిఫలాలను చూడండి',
    cta_explore_tools: 'అన్ని టూల్స్ చూడండి',
    cta_explore_courses: 'అన్ని కోర్సులు చూడండి',
    badge_most_popular: 'అత్యంత ప్రజాదరణ పొందినది',
    lbl_pages: 'పేజీలు',
    lbl_sections: 'విభాగాలు',
    bundles_title: 'మీ అనుభవాన్ని ఎంచుకోండి',
    bundles_subtitle: 'ప్రతి నివేదికను నిపుణుల సలహాతో మరింత మెరుగుపరచవచ్చు',
    btn_choose_this: 'దీన్ని ఎంచుకోండి',
    label_recommended: 'సిఫార్సు చేయబడింది',
    bundle_1_title: 'నివేదిక మాత్రమే',
    bundle_1_desc: '48 గంటల్లో అందించే పూర్తి వ్రాతపూర్వక నివేదిక',
    bundle_1_feature1: 'లోతైన విశ్లేషణ',
    bundle_1_feature2: 'PDF ఫార్మాట్',
    bundle_1_feature3: '40+ పేజీలు',
    bundle_2_title: 'నివేదిక + నిపుణుల ప్రశ్నోత్తరాలు',
    bundle_2_desc: 'నివేదికతో పాటు జ్యోతిష్కుడికి 2 వ్రాతపూర్వక ప్రశ్నలు',
    bundle_2_feature1: 'పూర్తి నివేదిక',
    bundle_2_feature2: '2 నిపుణుల ప్రశ్నలు',
    bundle_2_feature3: '48 గంటల్లో సమాధానం',
    bundle_3_title: 'నివేదిక + సంప్రదింపు',
    bundle_3_desc: 'పూర్తి నివేదికతో పాటు 20 నిమిషాల ప్రత్యక్ష సంప్రదింపు',
    bundle_3_feature1: 'పూర్తి నివేదిక',
    bundle_3_feature2: '20 నిమిషాల వీడియో కాల్',
    bundle_3_feature3: 'రికార్డ్ చేసిన సెషన్',
    btn_explore_all_products: 'అన్ని ఉత్పత్తులను చూడండి',
    store_external_note: 'ఇక్కడ కేవలం ప్రివ్యూ మాత్రమే చూపబడింది — ప్రతి కొనుగోలు tredevastore.com లో పూర్తవుతుంది.',
    btn_shop_now: 'ఇప్పుడు కొనండి',
    nav_pooja: 'పూజ',
    footer_join_astrologer: 'జ్యోతిష్కుడు/పండితుడిగా చేరండి',
    footer_safety: 'భద్రత',
    about_eyebrow: 'మా వారసత్వం',
    about_title: 'TredevaAstro గురించి',
    about_para1: 'పురాతన వైదిక జ్ఞానాన్ని ఆధునిక డిజిటల్ స్పష్టతతో కలపడానికి TredevaAstro స్థాపించబడింది. సాధారణ వాణిజ్య జోస్యాలను రూపొందించే బదులు, మా వేదిక శాస్త్రీయ భారతీయ ఖగోళ పరిశీలనల (జ్యోతిష శాస్త్రం) పై ఆధారపడి నిర్మించబడింది.',
    about_para2: 'అన్ని లెక్కలు లాహిరి అయనాంశాన్ని అనుసరిస్తాయి, ఇది గ్రహాల స్థానాలను నక్షత్రాల ఖచ్చితమైన డిగ్రీలతో సరిపోల్చుతుంది. అన్ని సంప్రదింపులు మరియు పూజలు ఖచ్చితమైన శాస్త్రీయ పద్ధతులను అనుసరించేలా చూసేందుకు మేము ప్రామాణిక పరంపరలలో దీక్షితులైన గౌరవనీయ ఆచార్యులతో భాగస్వామ్యం చేస్తాము.',
    about_para3: 'మీ జన్మ జాతకాన్ని అన్వేషించండి, శక్తివంతమైన పరిహారాల ద్వారా శక్తులను సమతుల్యం చేసుకోండి, మరియు అమరిక, లక్ష్యం మరియు ధర్మంతో మీ మార్గంలో నడవండి.',
    section_testimonials_eyebrow: 'మా వినియోగదారులు ఏమంటున్నారు',
    section_testimonials_title: 'అనుభవాల కథనాలు',
    section_testimonials_demo_note: 'ఇవి ఉదాహరణ డెమో testimonials మాత్రమే.',
    section_why_eyebrow: 'మా వాగ్దానం',
    section_why_title: 'TredevaAstro ఎందుకు',
    why_pillar1_title: 'ధృవీకరించబడిన నిపుణులు',
    why_pillar1_desc: 'TredevaAstro లోని ప్రతి జ్యోతిష్కుడు వారి జ్ఞానం, ఖచ్చితత్వం మరియు విధానం కోసం మాన్యువల్‌గా సమీక్షించి, మదింపు చేసి ధృవీకరించబడతారు.',
    why_pillar2_title: 'గోప్యమైనది & సురక్షితమైనది',
    why_pillar2_desc: 'మీ జన్మ వివరాలు, సంప్రదింపులు మరియు నివేదికలు గోప్యంగా ఉంటాయి. మేము మీ వ్యక్తిగత సమాచారాన్ని ఎప్పుడూ పంచుకోం, అమ్మం లేదా బహిర్గతం చేయం.',
    why_pillar3_title: 'వ్యక్తిగతీకరించిన జ్యోతిష్యం',
    why_pillar3_desc: 'ఒక జన్మ ప్రొఫైల్ మీ మొత్తం అనుభవానికి శక్తినిస్తుంది — జాతకం, రాశిఫలం, AI అంతర్దృష్టులు, సిఫార్సులు మరియు మరిన్ని.',
    why_pillar4_title: 'సాంప్రదాయ జ్ఞానం, ఆధునిక అనుభవం',
    why_pillar4_desc: 'శాస్త్రీయ వైదిక జ్యోతిష్యంలో పాతుకుపోయి, జాగ్రత్తగా రూపొందించిన ఆధునిక వేదిక ద్వారా అందించబడింది.',
    section_blog_eyebrow: 'జర్నల్',
    section_blog_title: 'TredevaAstro జర్నల్ నుండి',
    btn_read_article: 'వ్యాసం చదవండి →',
    btn_read_more: 'చదవండి →',
    nav_prev: 'మునుపటి',
    nav_next: 'తదుపరి',
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

    banner_0_category: 'వైదిక జ్యోతిష్యం',
    banner_0_title: 'మీ జననం వద్ద వ్రాయబడిన\nపటాన్ని కనుగొనండి.',
    banner_0_desc: 'ప్రామాణికమైన వేద జాతకం ద్వారా మీ రాశులు, గ్రహాలు మరియు నక్షత్రాలను అన్వేషించండి — ఉచితంగా, తక్షణమే.',
    banner_0_cta: 'ఉచిత జాతకం సృష్టించండి',
    banner_1_category: 'జ్యోతిష్కుడి సంప్రదింపు',
    banner_1_title: 'మిమ్మల్ని అర్థం చేసుకునే\nజ్యోతిష్కుడితో మాట్లాడండి.',
    banner_1_desc: 'మీ జీవితంలోని అతి ముఖ్యమైన ప్రశ్నలపై వ్యక్తిగత మార్గదర్శకత్వం కోసం ధృవీకరించబడిన వేద జ్యోతిష్కులతో కనెక్ట్ అవ్వండి.',
    banner_1_cta: 'జ్యోతిష్కుడిని సంప్రదించండి',
    banner_2_category: 'జ్యోతిష్య నివేదికలు',
    banner_2_title: 'మీ గ్రహ నమూనాలలో\nమరింత లోతుగా వెళ్ళండి.',
    banner_2_desc: 'సాంప్రదాయ వేద పద్ధతుల ద్వారా వృత్తి, వివాహం, ఆరోగ్యం మరియు విధి గురించి వివరణాత్మక జ్యోతిష్య విశ్లేషణ.',
    banner_2_cta: 'నివేదికలను అన్వేషించండి',
    banner_3_category: 'ట్రెడేవాస్టోర్',
    banner_3_title: 'మీ ప్రయాణం కోసం\nఎంచుకున్న పవిత్ర వస్తువులు.',
    banner_3_desc: 'ప్రామాణికమైన రత్నాలు, రుద్రాక్షలు, యంత్రాలు మరియు పవిత్ర వస్తువులు — మీ జాతకం కోసం శక్తివంతం చేయబడ్డాయి.',
    banner_3_cta: 'ట్రెడేవాస్టోర్‌ను అన్వేషించండి',
    banner_4_category: 'ట్రెడేవాఆస్ట్రో గురుకులం',
    banner_4_title: 'జ్యోతిష్య భాషను\nనేర్చుకోండి.',
    banner_4_desc: 'నిపుణులైన ఆచార్యులు బోధించే నిర్మాణాత్మక కోర్సుల ద్వారా పునాది నుండి నైపుణ్యం వరకు వేద జ్యోతిష్యాన్ని అధ్యయనం చేయండి.',
    banner_4_cta: 'గురుకులాన్ని అన్వేషించండి',

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
    tools_kundli_milan_cta: 'అనుకూలతను తనిఖీ చేయండి →',
    tools_nakshatra_cta: 'నక్షత్రాన్ని అన్వేషించండి →',
    tools_nakshatra_title: 'నక్షత్ర శోధకం',
    tools_nakshatra_desc: 'మీ జన్మ నక్షత్రాన్ని మరియు దాని అధిపతి గ్రహాన్ని కనుగొనండి.',
    tools_sade_sati_title: 'సాడే సాతీ',
    tools_numerology_title: 'అంకెల జ్యోతిష్యం',
    tools_numerology_desc: 'జీవిత మార్గం సంఖ్య అంచనా.',

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
  // Every other "page" here is pure in-memory state with no real URL (see
  // the pushState/replaceState calls below, which pass '' for every page
  // except this one) — this app has no router. Giving every page a real URL
  // would be a much bigger, riskier change to this shared mechanism, so this
  // is deliberately narrow: just the one page staff specifically asked for
  // a real, shareable/bookmarkable link for. wrangler.jsonc's
  // `not_found_handling: "single-page-application"` already makes a fresh
  // load of this path work (serves index.html instead of a 404).
  const APPLY_ASTROLOGER_PATH = '/apply-astrologer';
  const [page, setPageState] = useState(() => {
    if (window.history.state && window.history.state.page) return window.history.state.page;
    if (window.location.pathname === APPLY_ASTROLOGER_PATH) return 'apply-astrologer';
    return 'home';
  });
  const [selectedId, setSelectedIdState] = useState<number | string | null>(() => {
    return (window.history.state && window.history.state.selectedId) || null;
  });
  const [paymentResult, setPaymentResult] = useState<PaymentResultInfo | null>(null);
  // Was plain in-memory state — any reload silently wiped whatever someone
  // was building, with no explanation. Every other cross-reload state here
  // already persists this same way.
  const [cart, setCart] = useState<CartItem[]>(() => loadLS('cart', [] as CartItem[]));

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
  // Read synchronously inside the (mount-only) popstate handler below, which
  // otherwise can't see a fresh `currentUser` — kept in sync by an effect
  // right after currentUser is declared further down.
  const currentUserRoleRef = React.useRef<Role | undefined>(undefined);

  React.useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      isPopStateRef.current = true;
      let nextPage = (state && typeof state.page === 'string') ? state.page : 'home';
      let nextSelectedId = state?.selectedId ?? null;
      let nextConcern = state?.concern ?? null;
      // A workspace-role user (ADMIN/STAFF/ASTROLOGIST) must never see the
      // public site — correct here, before the state ever commits, so a
      // browser back/forward press can't paint the homepage even for a
      // single frame (a corrective useEffect elsewhere would run after paint).
      if (isWorkspaceRole(currentUserRoleRef.current) && !WORKSPACE_PAGES.includes(nextPage)) {
        nextPage = 'profile';
        nextSelectedId = null;
        nextConcern = null;
      }
      setPageState(nextPage);
      setSelectedIdState(nextSelectedId);
      setConcernState(nextConcern);
      setTimeout(() => {
        isPopStateRef.current = false;
      }, 0);
    };

    window.addEventListener('popstate', handlePopState);

    if (!window.history.state) {
      window.history.replaceState({ page, selectedId, concern }, '', page === 'apply-astrologer' ? APPLY_ASTROLOGER_PATH : '/');
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

    window.history.pushState({ page, selectedId, concern }, '', page === 'apply-astrologer' ? APPLY_ASTROLOGER_PATH : '/');
  }, [page, selectedId, concern]);

  // Theme State — DEFAULT IS LIGHT
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  // Auth state — sign-in/up/out and session identity are backed by the real
  // backend (backend/app/api/auth.routes.ts). Admin data (accounts,
  // applications, audit log) is backed by backend/app/api/admin.routes.ts —
  // real JWT+ADMIN-role-protected, fetched on demand via refreshAdminData().
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isLoggedIn = !!currentUser;

  // The wallet-based consultation billing model's balance — deliberately NOT
  // part of AuthUser (that's a login-time snapshot; this changes mid-session
  // on every recharge and every consultation that ends) so it's refreshed on
  // its own schedule: on login, after a WALLET_RECHARGE payment succeeds
  // (see the payment-status effect below), and after a consultation ends
  // (RealtimeContext calls refreshWalletBalance via useAppContext).
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const refreshWalletBalance = React.useCallback(async () => {
    if (!localStorage.getItem('auth_access_token')) { setWalletBalance(null); return; }
    try {
      const { balance } = await paymentService.getWalletBalance();
      setWalletBalance(balance);
    } catch {
      // Best-effort — the header just keeps showing whatever it last had.
    }
  }, []);

  React.useEffect(() => {
    currentUserRoleRef.current = currentUser?.role;
    if (currentUser) refreshWalletBalance();
    else setWalletBalance(null);
  }, [currentUser, refreshWalletBalance]);

  // Defense in depth: the popstate handler above already prevents a
  // workspace-role user (ADMIN/STAFF/ASTROLOGIST) from ever landing on a
  // public page via browser back/forward. This catches every other way
  // `page` could change relative to `currentUser` (any other setPage call,
  // or currentUser changing while `page` stays put) without a visible flash
  // being the primary concern — those paths don't originate from a raw
  // history event, so a same-tick correction is sufficient here.
  React.useEffect(() => {
    if (isWorkspaceRole(currentUser?.role) && !WORKSPACE_PAGES.includes(page)) {
      setPage('profile');
    }
  }, [currentUser, page]);

  const persistTokens = (accessToken: string, refreshToken: string) => {
    localStorage.setItem('auth_access_token', accessToken);
    localStorage.setItem('auth_refresh_token', refreshToken);
  };
  const clearTokens = () => {
    localStorage.removeItem('auth_access_token');
    localStorage.removeItem('auth_refresh_token');
  };
  const toAuthUser = (u: ApiUser): AuthUser => ({
    id: u.id, name: u.name, email: u.email, role: u.role, status: u.status,
    birthDate: u.birth_date, birthTime: u.birth_time, birthPlace: u.birth_place,
    birthLatitude: u.birth_latitude, birthLongitude: u.birth_longitude, birthTimezoneOffsetMinutes: u.birth_timezone_offset_minutes,
    phoneNumber: u.phone_number, phoneVerified: u.phone_verified,
    freeAiChatSeconds: u.free_ai_chat_seconds,
  });

  // Restore session on load: an access token is short-lived (15 min), so a
  // returning visitor almost always needs a refresh before /me will succeed.
  React.useEffect(() => {
    const refreshToken = localStorage.getItem('auth_refresh_token');
    if (!refreshToken) { setAuthLoading(false); return; }
    (async () => {
      try {
        const tokens = await authService.refresh(refreshToken);
        persistTokens(tokens.accessToken, tokens.refreshToken);
        const user = await authService.me(tokens.accessToken);
        setCurrentUser(toAuthUser(user));
        // The workspace-role invariant effect (above) redirects away from
        // any non-workspace page as soon as currentUser is set — covers a
        // session restored on page load the same way it covers login.
      } catch (e) {
        // Only sign the user out when the server explicitly rejected the
        // refresh token (it's genuinely invalid/expired/revoked) — a network
        // blip or a transient 500 (e.g. the hosted DB's connection pool
        // waking up from idle) must NOT wipe a perfectly good session; the
        // tokens stay put so the next reload can succeed normally.
        if (e instanceof ApiRequestError && e.code === 'AUTH_ERROR') {
          clearTokens();
        }
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);
  const [accounts, setAccounts] = useState<AuthUser[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<NotificationEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem('notifications') || '[]'); } catch { return []; }
  });
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const refreshAdminData = async () => {
    try {
      const users = await adminService.listUsers();
      setAccounts(users.map(u => ({
        id: u.id, name: u.name, email: u.email, role: u.role, status: u.status,
        birthDate: u.birth_date, phoneNumber: u.phone_number, freeAiChatSeconds: u.free_ai_chat_seconds,
      })));
    } catch (e) {
      console.error('Failed to load admin data', e);
    }
    // Audit log access is now a per-STAFF-member toggle (see
    // staff_permissions) rather than hardcoded ADMIN-only — fetched
    // separately so a 403 here (a STAFF session without that section) can
    // never block the users load above, which every admin/staff session
    // needs regardless.
    try {
      const logs = await adminService.listAuditLog();
      setAuditLog(logs.map(l => ({ id: l.id, action: l.action, actor: l.actor_label, target: l.target, at: new Date(Number(l.created_at)).toISOString() })));
    } catch {
      // Expected for a STAFF session without the Audit section — not an error.
    }
  };

  // Admin data is only meaningful (and only authorized) for an ADMIN/STAFF
  // session — fetch it once whenever one starts, rather than on every render.
  React.useEffect(() => {
    if (currentUser?.role === 'ADMIN' || currentUser?.role === 'STAFF') refreshAdminData();
  }, [currentUser?.role]);

  const login = async (email: string, password: string): Promise<AuthUser | null> => {
    try {
      const { user, accessToken, refreshToken } = await authService.login(email, password);
      persistTokens(accessToken, refreshToken);
      const authUser = toAuthUser(user);
      setCurrentUser(authUser);
      return authUser;
    } catch {
      return null;
    }
  };

  // Throws (rather than swallowing into a null return) so callers can show
  // the real backend error — e.g. "use a Gmail/Outlook/Yahoo address" for
  // the email-provider allowlist, not just a generic failure message.
  const register = async (name: string, email: string, password: string, phoneNumber: string, birthDetails?: RegisterBirthDetails): Promise<{ user: AuthUser }> => {
    const { user, accessToken, refreshToken } = await authService.register(name, email, password, phoneNumber, birthDetails);
    persistTokens(accessToken, refreshToken);
    const authUser = toAuthUser(user);
    setCurrentUser(authUser);
    return { user: authUser };
  };

  // Google Sign-In / Phone Auth — caller already ran the Firebase client-side
  // popup/OTP flow and has a verified ID token; this just exchanges it for
  // this app's own session (see backend/app/services/authService.ts's
  // loginWithFirebase, which creates the account on first sign-in).
  // `isNewUser` lets AuthPage decide whether to prompt for a name — Google's
  // token already carries one, Phone Auth's doesn't (see saveMyName below).
  const loginWithFirebase = async (idToken: string): Promise<{ user: AuthUser; isNewUser: boolean } | null> => {
    try {
      const { user, isNewUser, accessToken, refreshToken } = await authService.firebaseLogin(idToken);
      persistTokens(accessToken, refreshToken);
      const authUser = toAuthUser(user);
      setCurrentUser(authUser);
      return { user: authUser, isNewUser };
    } catch {
      return null;
    }
  };

  // Post-registration "verify your phone" step — see authService.ts's
  // linkFirebasePhone. Throws (rather than returning null) so AuthPage can
  // show the real error message instead of a generic one.
  const verifyPhoneWithFirebase = async (idToken: string): Promise<void> => {
    const accessToken = localStorage.getItem('auth_access_token');
    if (!accessToken) throw new ApiRequestError('AUTH_ERROR', 'Session expired — please log in again.');
    const user = await authService.linkFirebasePhone(accessToken, idToken);
    setCurrentUser(toAuthUser(user));
  };

  const saveBirthDetails = async (details: Required<RegisterBirthDetails>): Promise<boolean> => {
    const accessToken = localStorage.getItem('auth_access_token');
    if (!accessToken) return false;
    try {
      const user = await authService.updateBirthDetails(accessToken, details);
      setCurrentUser(toAuthUser(user));
      return true;
    } catch {
      return false;
    }
  };

  // One-time "what's your name?" step right after a brand-new phone-only
  // signup (see authService.ts's updateName and auth.routes.ts's comment —
  // Phone Auth's token has no name claim, unlike Google's).
  const saveMyName = async (name: string): Promise<boolean> => {
    const accessToken = localStorage.getItem('auth_access_token');
    if (!accessToken) return false;
    try {
      const user = await authService.updateName(accessToken, name);
      setCurrentUser(toAuthUser(user));
      return true;
    } catch {
      return false;
    }
  };

  const logout = () => {
    const refreshToken = localStorage.getItem('auth_refresh_token');
    if (refreshToken) authService.logout(refreshToken).catch(() => { }); // best-effort server-side revoke
    clearTokens();
    setCurrentUser(null);
  };

  const suspendAccount = async (email: string) => {
    const acc = accounts.find(a => normalizeEmail(a.email) === normalizeEmail(email));
    if (!acc) return;
    await adminService.updateUserStatus(acc.id, 'SUSPENDED');
    await refreshAdminData();
  };

  const restoreAccount = async (email: string) => {
    const acc = accounts.find(a => normalizeEmail(a.email) === normalizeEmail(email));
    if (!acc) return;
    await adminService.updateUserStatus(acc.id, 'ACTIVE');
    await refreshAdminData();
  };

  const updateAccountRole = async (email: string, role: Role) => {
    const acc = accounts.find(a => normalizeEmail(a.email) === normalizeEmail(email));
    if (!acc) return;
    await adminService.updateUserRole(acc.id, role);
    await refreshAdminData();
  };

  const updateMyProfile = async (patch: { name?: string; currentPassword?: string; newPassword?: string }) => {
    const updated = await adminService.updateMe(patch);
    setCurrentUser(prev => prev ? { ...prev, name: updated.name } : prev);
  };

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
  const [allAstrologerReports, setAllAstrologerReports] = useState<AstrologerReport[]>(() => loadLS<AstrologerReport[]>('astro_reports', []));
  const [clientNotesMap, setClientNotesMap] = useState<Record<string, string>>(() => loadLS<Record<string, string>>('astro_client_notes', {}));

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
  const persistAstrologerReports = (next: AstrologerReport[]) => {
    setAllAstrologerReports(next);
    localStorage.setItem('astro_reports', JSON.stringify(next));
  };
  const persistClientNotesMap = (next: Record<string, string>) => {
    setClientNotesMap(next);
    localStorage.setItem('astro_client_notes', JSON.stringify(next));
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
  const astrologerReports = allAstrologerReports.filter(r => r.astrologerEmail === astrologerEmail);

  const clientNoteKey = (clientEmail: string) => `${astrologerEmail}::${clientEmail}`;
  const getClientNote = (clientEmail: string) => clientNotesMap[clientNoteKey(clientEmail)] || '';
  const saveClientNote = (clientEmail: string, note: string) => {
    if (!astrologerEmail) return;
    persistClientNotesMap({ ...clientNotesMap, [clientNoteKey(clientEmail)]: note });
  };

  const saveReportDraft = (report: Omit<AstrologerReport, 'id' | 'astrologerEmail' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }) => {
    if (!astrologerEmail) return;
    const now = new Date().toISOString();
    if (report.id) {
      persistAstrologerReports(allAstrologerReports.map(r => r.id === report.id ? { ...r, ...report, updatedAt: now } : r));
    } else {
      const entry: AstrologerReport = { ...report, id: `rpt-${Date.now()}`, astrologerEmail, status: 'DRAFT', createdAt: now, updatedAt: now };
      persistAstrologerReports([entry, ...allAstrologerReports]);
    }
  };
  const updateReportStatus = (id: string, status: ReportStatus) => {
    persistAstrologerReports(allAstrologerReports.map(r => r.id === id ? { ...r, status, updatedAt: new Date().toISOString() } : r));
  };

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

  // Language selector state — drives real translation again (see t() below)
  // for the ~680 keyed strings this dictionary covers. Coverage past that is
  // partial by design: hi/mr are close to complete, bn/ta/te cover a smaller
  // subset (see TRANSLATIONS), and any hardcoded page text with no key at
  // all stays English regardless of this setting — there's no page-wide
  // machine translation layer any more (the previous embedded Google
  // Translate widget was removed for being inconsistent device-to-device).
  const [language, setLanguageState] = useState<'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te'>(() => {
    const saved = localStorage.getItem('language');
    return (saved as any) || 'en';
  });

  const setLanguage = (l: 'en' | 'hi' | 'mr' | 'bn' | 'ta' | 'te') => {
    setLanguageState(l);
    localStorage.setItem('language', l);
  };

  // Falls back to English per-key (not just when the whole language is
  // missing) since bn/ta/te only cover a subset of keys — a selected
  // language with a gap should show that one string in English, not the
  // bare untranslated key.
  const t = (key: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || key;
  };

  const tOr = (key: string, fallbackKey: string): string => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS['en']?.[key] || t(fallbackKey);
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

  const persistCart = (next: CartItem[]) => {
    setCart(next);
    try { localStorage.setItem('cart', JSON.stringify(next)); } catch { /* best-effort */ }
  };

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const exists = prev.find(i => i.id === item.id);
      const next = exists ? prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, item];
      try { localStorage.setItem('cart', JSON.stringify(next)); } catch { /* best-effort */ }
      return next;
    });
  };

  const removeFromCart = (id: number) => {
    setCart(prev => {
      const next = prev.filter(i => i.id !== id);
      try { localStorage.setItem('cart', JSON.stringify(next)); } catch { /* best-effort */ }
      return next;
    });
  };

  const clearCart = () => persistCart([]);

  // Picks up after a gateway's hosted payment page (see paymentService.pay's
  // redirect) redirects the browser back to `/?payment_id=...`
  // (payments.routes.ts sets that as the return_url) — this is a fresh page
  // load, not a client-side navigation, so it's the only place that can see
  // the returning query param. Runs once on mount, confirms the real outcome
  // with the backend (never trusts the redirect alone), scrubs the query
  // param so a refresh doesn't re-fire, and sets paymentResult so
  // PaymentResultModal (rendered globally in App.tsx) can show it.
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentId = params.get('payment_id');
    if (!paymentId) return;

    // A full browser round-trip to the gateway and back resets every bit of
    // React state (this is a brand-new page load, not a SPA navigation) —
    // `page` would otherwise fall back to 'home'. paymentService.pay()
    // stashes where the user actually was, in localStorage (survives a full
    // reload, unlike React state), right before redirecting away.
    let restoredPage: string | undefined;
    let restoredSelectedId: number | string | null = null;
    try {
      const raw = localStorage.getItem('pending_payment_return');
      if (raw) {
        const parsed = JSON.parse(raw);
        restoredPage = parsed.page;
        restoredSelectedId = parsed.selectedId ?? null;
      }
    } catch {
      // Malformed/missing — just falls through to whatever page loaded.
    }
    localStorage.removeItem('pending_payment_return');
    if (restoredPage) {
      setPage(restoredPage);
      setSelectedId(restoredSelectedId);
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('payment_id');
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);

    // The gateway can take a few seconds to actually mark the payment PAID
    // after redirecting back (webhook/settlement lag) — a single immediate
    // check can catch it still 'CREATED' and wrongly look declined. Poll a
    // few times before concluding either way.
    const POLL_ATTEMPTS = 6;
    const POLL_DELAY_MS = 1500;
    (async () => {
      for (let attempt = 0; attempt < POLL_ATTEMPTS; attempt++) {
        try {
          const { status, purpose, amount } = await paymentService.getStatus(paymentId);
          if (status === 'PAID') {
            if (purpose === 'STORE_ORDER') clearCart();
            // Credited server-side already (fulfillment.ts) — this just
            // syncs the header's displayed balance with that real outcome,
            // same best-effort pattern refreshWalletBalance already uses.
            if (purpose === 'WALLET_RECHARGE') refreshWalletBalance();
            // A consultation is booked server-side only once the payment
            // clears (see fulfillment.ts's CONSULTATION case) — the waiting
            // page itself (driven by the realtime socket's userSync) is the
            // real confirmation, so skip the generic success popup and go
            // straight there instead of showing it over the booking page.
            // A top-up (CONSULTATION_EXTEND) already stashed 'consultation-waiting'
            // as the page to restore to (that's where the top-up button lives),
            // so there's nothing extra to navigate — just skip the generic
            // popup so it doesn't cover the resumed chat/call.
            if (purpose === 'CONSULTATION' || purpose === 'CONSULTATION_EXTEND') { setPage('consultation-waiting'); return; }
            setPaymentResult({ status: 'success', purpose, amount });
            return;
          }
          if (status === 'FAILED') {
            setPaymentResult({ status: 'failed', purpose, amount, message: 'Your payment could not be completed.' });
            return;
          }
          // status === 'CREATED' — still pending, wait and retry.
          if (attempt < POLL_ATTEMPTS - 1) await new Promise(r => setTimeout(r, POLL_DELAY_MS));
          else setPaymentResult({ status: 'failed', purpose, amount, message: 'Still confirming your payment — check My Orders / My Reports in a few minutes.' });
        } catch {
          if (attempt === POLL_ATTEMPTS - 1) {
            setPaymentResult({ status: 'failed', purpose: 'STORE_ORDER', amount: 0, message: 'Could not confirm your payment status. Check My Orders / My Reports shortly.' });
          } else {
            await new Promise(r => setTimeout(r, POLL_DELAY_MS));
          }
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppContext.Provider value={{
      birthProfile, setBirthProfile,
      concern, setConcern,
      kundliGenerated, setKundliGenerated,
      astrologerFilter, setAstrologerFilter,
      page, setPage,
      selectedId, setSelectedId,
      paymentResult, setPaymentResult,
      cart, addToCart, removeFromCart, clearCart,
      theme, toggleTheme,
      isLoggedIn, currentUser, authLoading, login, register, loginWithFirebase, verifyPhoneWithFirebase, saveBirthDetails, saveMyName, logout,
      walletBalance, refreshWalletBalance,
      pendingAction, setPendingAction,
      showLoginModal, setShowLoginModal,
      accounts, refreshAdminData,
      auditLog, notifications,
      logAdminAction: (action: string, target: string) => { adminService.logNote(action, target).then(refreshAdminData); },
      suspendAccount, restoreAccount, updateAccountRole, updateMyProfile,
      consultationRequests, consultations,
      acceptConsultationRequest, declineConsultationRequest, completeConsultation, cancelConsultation, saveConsultationNotes,
      blockedSlots, addBlockedSlot, removeBlockedSlot,
      availability, setAvailabilityStatus, updateAvailability,
      profileOverride, updateProfileOverride,
      astrologerNotifications, markNotificationRead, markAllNotificationsRead,
      astrologerReviews,
      astrologerReports, saveReportDraft, updateReportStatus,
      getClientNote, saveClientNote,
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

