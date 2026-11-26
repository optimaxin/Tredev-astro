// Thin client for the real admin API (backend/app/api/admin.routes.ts).
// Every call requires a real ADMIN-role JWT — the backend verifies this
// server-side, this file just attaches whatever token is currently stored.

import { API_URL } from './apiUrl';
import { getAccessToken } from './tokenRefresh';

export class AdminApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Proactively refreshes a token about to expire (see tokenRefresh.ts) —
// without this, an admin left on one console page past the 15min access-
// token TTL got a raw "Invalid or expired access token" on every single
// panel until they manually reloaded the page.
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/admin${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new AdminApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new AdminApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export interface ApiAstrologerProfile {
  id: number;
  name: string;
  title: string;
  bio: string;
  avatar: string;
  languages: string[];
  categories: string[];
  expertise: string[];
  consultationTypes: string[];
  chatPrice: number;
  callPrice: number;
  videoPrice: number;
  rating: number;
  reviewCount: number;
  experienceYears: number;
  consultationCount: number;
  commissionPercent: number;
  // Staff-selectable payout model — see AstrologerProfilePatch's own comment.
  payoutModel: 'COMMISSION' | 'SALARY';
  monthlySalary: number;
  // Percentage discount currently active for this astrologer (0 = none).
  // The backend's astrologer model returns it; AstrologersPage reads it.
  activeOfferPercent: number;
  // Staff-curated card review — see ApiAstrologerStatus's own comment.
  featuredReview: { text: string; rating: number; authorName: string } | null;
}

export interface ApiAstrologerRevenue {
  astrologerId: number;
  astrologerName: string;
  chatCount: number;
  chatRevenue: number;
  voiceCount: number;
  voiceRevenue: number;
  videoCount: number;
  videoRevenue: number;
  totalRevenue: number;
  // Boost-adjusted split — astrologerPayout equals totalRevenue when none of
  // this astrologer's completed sessions were ever Boost-attributed (see
  // backend/app/repositories/boostRepository.ts).
  astrologerPayout: number;
  platformShare: number;
}

export interface AstrologerProfilePatch {
  title: string;
  bio: string;
  avatar: string;
  languages: string[];
  categories: string[];
  expertise: string[];
  consultationTypes: string[];
  chatPrice: number;
  callPrice: number;
  videoPrice: number;
  experienceYears: number;
  // What % of the per-minute price this astrologer actually earns — the rest
  // is the platform's cut. Optional so an older caller that doesn't set it
  // leaves the astrologer's existing commission untouched.
  commissionPercent?: number;
  // Staff-selectable payout model — see ApiAstrologerStatus's own comment.
  payoutModel?: 'COMMISSION' | 'SALARY';
  monthlySalary?: number;
}

export interface NewAstrologer extends AstrologerProfilePatch {
  name: string;
  email: string;
  password: string;
}

export interface ApiUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
  birth_date: string | null;
  phone_number: string | null;
  free_ai_chat_seconds: number;
  wallet_balance: number;
}

// Mirrors ADMIN_SECTIONS in backend/app/repositories/staffPermissionRepository.ts
// — was missing 'applications' (hence no "Hiring" toggle here), 'tokens',
// and 'evaluation' entirely; a STAFF account could never be granted those
// sections even though the backend has always supported it.
export const ADMIN_SECTIONS = [
  'overview', 'applications', 'astrologers', 'users', 'consultations', 'reports', 'orders', 'pricing', 'blog', 'shlok', 'notifications', 'audit', 'tokens', 'evaluation', 'settings', 'call-recordings', 'banners', 'pooja', 'emails', 'leads', 'content',
] as const;
export type AdminSectionKey = typeof ADMIN_SECTIONS[number];

export interface ApiFeaturedAstrologer {
  astrologerId: number | null;
  astrologerName: string | null;
}

export interface ApiAuditEntry {
  id: string;
  actor_user_id: string | null;
  actor_label: string;
  action: string;
  target: string;
  created_at: string;
}

export interface ApiConsultation {
  id: string;
  astrologerId: number;
  userEmail: string;
  userName: string;
  category: string;
  type: 'chat' | 'voice' | 'video';
  status: 'ASSIGNED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'DECLINED' | 'CANCELLED' | 'EXPIRED';
  createdAt: number;
  acceptedAt?: number;
  startedAt?: number;
  endedAt?: number;
}

export interface ApiReportPurchase {
  id: string;
  userName: string;
  userEmail: string;
  reportTitle: string;
  bundle: string;
  amount: number;
  purchasedAt: number;
}

// The editable report-catalog row (admin.routes.ts's /reports CRUD) — not
// to be confused with ApiReportPurchase above (that's a purchase receipt,
// this is the product listing itself).
export interface ApiAstrologyReport {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  pages: number;
  sections: number;
  price: number;
  originalPrice: number | null;
  popular: boolean;
  color: string;
  icon: string;
  category: string;
  displayOrder: number;
  coverColor: string | null;
  coverPattern: string | null;
  coverImage: string | null;
}

export type AstrologyReportInput = Omit<ApiAstrologyReport, 'id'>;

// What a STAFF create/update/delete call gets back instead of the applied
// row — it's now sitting in report_change_requests waiting for an ADMIN.
export interface ApiPendingResult {
  pending: true;
}

export interface ApiReportChangeRequest {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  reportId: number | null;
  payload: AstrologyReportInput | null;
  requestedBy: string;
  createdAt: number;
  currentReport?: ApiAstrologyReport;
}

export interface ApiBlogPost {
  id: number;
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
  content: string;
  tag: string;
  featured: boolean;
  date: string;
}

export interface NewBlogPost {
  title: string;
  category: string;
  readTime: string;
  excerpt: string;
  content: string;
  tag: string;
  featured: boolean;
}

// The Panchang card's footer line for one calendar day — `date` is the
// primary key, so saving an existing date edits it rather than adding a
// second row.
export interface ApiDailyShlok {
  date: string;
  textEn: string;
  textHi: string;
}

// The three sendable audiences — ADMIN is never staff-pickable (always
// added server-side, see admin.routes.ts's POST /broadcasts), same as
// 'staff' being omitted from ADMIN_SECTIONS: an admin always sees every
// broadcast they've sent, regardless of who else it targets.
export type BroadcastAudience = 'USER' | 'STAFF' | 'ASTROLOGIST';

export interface ApiBroadcast {
  id: number;
  message: string;
  createdAt: number;
  active: boolean;
  audiences: (BroadcastAudience | 'ADMIN')[];
}

export interface ApiOrder {
  id: string;
  customerName: string;
  customerEmail: string;
  items: { productId: number; name: string; price: number; quantity: number }[];
  amount: number;
  shipping: { name: string; address: string; city: string; zip: string };
  deliveryStatus: 'PROCESSING' | 'SHIPPED' | 'DELIVERED';
  createdAt: number;
}

// A chat-audit entry for the Users/Astrologers drawer — one recent
// consultation with its full transcript, so a Staff/Admin reviewer can see
// who a user or astrologer was talking to and what was said, no money
// figures anywhere in here.
export interface ApiChatAudit {
  consultationId: string;
  partnerName: string;
  type: 'chat' | 'voice' | 'video';
  status: string;
  startedAt?: number;
  endedAt?: number;
  messages: { senderRole: 'USER' | 'ASTROLOGIST'; messageType: string; content: string; createdAt: number }[];
}

export interface ApiLastAction {
  action: string;
  at: number;
}

export interface ApiPageView {
  path: string;
  at: number;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
}

export interface ApiUserActivity {
  reports: number;
  consultations: number;
  orders: number;
  recentChats: ApiChatAudit[];
  lastAction: ApiLastAction | null;
  recentPageViews: ApiPageView[];
}

// Site-wide traffic feed (Overview page) — same fingerprint fields as
// ApiPageView, plus who it was (null name/email for an anonymous visit).
// Registered and anonymous come back as two separate lists (see
// listRecentRegisteredPageViews's comment) rather than one combined feed.
export interface ApiTrafficEntry extends ApiPageView {
  userName: string | null;
  userEmail: string | null;
}

export interface ApiTraffic {
  registered: ApiTrafficEntry[];
  anonymous: ApiTrafficEntry[];
}

// One row per distinct visitor (registered or anonymous), not one row per
// page view — the "footprint" id staff/admin can recognize across repeat
// visits. userId is null for an anonymous lead; `id` is then the sticky
// device id instead, so the row stays the same lead on a later visit.
export interface ApiLead {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  leadPhone: string | null;
  visitCount: number;
  firstSeen: number;
  lastSeen: number;
  lastPath: string;
  ip: string | null;
  userAgent: string | null;
  country: string | null;
}

// A staff/admin-edited override of one site text string or image, keyed by
// the same translation key the frontend's t() uses (see AppContext.tsx).
export interface ApiContentOverride {
  key: string;
  value: string;
  updatedBy: string | null;
  updatedAt: number;
}

export interface ApiAstrologerActivity {
  consultations: number;
  recentChats: ApiChatAudit[];
  lastAction: ApiLastAction | null;
}

export interface ApiDashboardStats {
  consultationsInProgress: number;
  revenue?: number;
  reportsGenerated: number;
  storeOrders: number;
  recentConsultations: { id: string; userName: string; astrologerName: string; createdAt: number }[];
  recentPurchases: { id: string; userName: string; reportTitle: string; purchasedAt: number }[];
  recentDeliveredOrders: { id: string; createdAt: number }[];
}

export interface ApiStaffMember extends ApiUserRecord {
  sections: AdminSectionKey[];
}

export interface ApiApplication {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  expertise: string;
  experience: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: number;
  decidedAt: number | null;
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  languages: string | null;
  bio: string | null;
  resumeData: string | null;
  driveLink: string | null;
}

export interface ApiEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  created_at: number;
  updated_at: number;
}

export interface ApiEmailLogEntry {
  id: string;
  to_email: string;
  to_name: string | null;
  subject: string;
  template_id: string | null;
  event_key: string | null;
  status: 'SENT' | 'FAILED';
  error: string | null;
  sent_by: string | null;
  sent_at: number;
}

// Live availability from the realtime server, not account status — see
// backend/app/services/realtimeStore.ts. A normal (bookable) row only ever
// carries the fields declared directly below — the inherited profile fields
// (name/title/bio/pricing/etc, same shape as ApiAstrologerProfile) are
// `undefined` for those. A Removed astrologer has no live-status row at all,
// so the backend appends one with no status/activeCount/etc but the full
// profile instead (see the route's own comment) — that's the one case these
// inherited fields are actually populated, which is why they're optional.
export interface ApiAstrologerStatus extends Partial<Omit<ApiAstrologerProfile, 'id'>> {
  id: number;
  status: 'ONLINE_AVAILABLE' | 'ONLINE_BUSY' | 'AWAY' | 'OFFLINE';
  activeCount: number;
  maxConcurrent: number;
  queueLength: number;
  // Whether this astrologer currently has an active Boost (visibility
  // feature) — see backend/app/repositories/boostRepository.ts.
  activeBoost: boolean;
  // Staff-set per-astrologer override of the global Boost payout share —
  // null means "using the platform default" (see SettingsPage's Boost
  // Payout Share card). effective* is override ?? platform default.
  boostPayoutOverridePercent: number | null;
  effectiveBoostPayoutSharePercent: number;
  // What % of the per-minute price this astrologer actually earns.
  commissionPercent: number;
  // Staff-selectable: 'COMMISSION' (the per-consultation % above applies) or
  // 'SALARY' (monthlySalary is a flat amount instead, informational only —
  // there's no automated payroll run anywhere in this app).
  payoutModel: 'COMMISSION' | 'SALARY';
  monthlySalary: number;
  // Which of this astrologer's real reviews (if any) is currently featured
  // on their public card — see the Edit drawer's own Featured Review picker.
  featuredReviewId: string | null;
  // Whether this astrologer is live in the bookable catalog — false means
  // staff has "Removed" them (see the Remove/Restore button); their past
  // consultation/review history is untouched either way.
  isActive: boolean;
}

export interface ApiPricingRegion {
  id: number;
  name: string;
  countryCodes: string[];
  priceMultiplier: number;
  createdAt: number;
  updatedAt: number;
}

export interface PricingRegionPatch {
  name: string;
  countryCodes: string[];
  priceMultiplier: number;
}

// A staff-set exact price for one astrologer in one region — takes full
// precedence over that region's plain multiplier (backend/app/services/
// pricingEngine.ts's computePriceWithOverride).
export interface ApiAstrologerRegionPrice {
  astrologerId: number;
  astrologerName: string;
  regionId: number;
  regionName: string;
  chatPrice: number;
  callPrice: number;
  videoPrice: number;
  updatedAt: number;
}


// ── AI Token Meter types ──────────────────────────────────────────────
// Mirrors backend/app/repositories/aiUsageRepository.ts. Costs are INR
// unless the field name says Usd — the backend converts before returning,
// so no rate lives in the frontend.

export type AiUsageGranularity = 'day' | 'week' | 'month';

export interface AiUsageQuery {
  from?: string;
  to?: string;
  userId?: string;
  model?: string;
  provider?: string;
  status?: 'success' | 'failed';
  conversationId?: string;
  // Defaults to real users server-side; 'internal' = evaluation/profiling/probe runs.
  traffic?: 'user' | 'internal' | 'unknown' | 'all';
}

export interface AiUsageOverview {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  estimatedCostInr: number;
  // Null when the provider reports no actual charge (Gemini's free tier).
  // The UI must keep saying "Estimated" while this is null.
  actualCostUsd: number | null;
  avgCostPerRequestInr: number;
  avgTokensPerRequest: number;
  activeUsers: number;
  avgLatencyMs: number;
}

export interface AiUsageTimePoint {
  bucket: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostInr: number;
}

export interface AiUsageModelRow {
  provider: string;
  model: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostInr: number;
  // Optional so an older backend without these fields still renders.
  avgLatencyMs?: number | null;
  p95LatencyMs?: number | null;
  errorRate?: number;
  fallbackRate?: number;
  callsWithoutTokens?: number;
  evaluationRequests?: number;
  evaluationTokens?: number;
}

export interface AiUsageUserRow {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCostInr: number;
  lastRequestAt: string | null;
}

export interface AiUsageRequestRow {
  id: string;
  requestId: string;
  createdAt: string;
  userId: string | null;
  conversationId: string | null;
  role: string;
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostInr: number;
  latencyMs: number | null;
  status: string;
  errorCode: string | null;
  fallbackUsed: boolean;
}

export interface AiUsageConversationRow {
  conversationId: string;
  requests: number;
  totalTokens: number;
  estimatedCostInr: number;
  firstRequestAt: string | null;
  lastRequestAt: string | null;
}

export interface AiUsageUserDetail {
  userId: string;
  overview: AiUsageOverview;
  models: AiUsageModelRow[];
  timeseries: AiUsageTimePoint[];
  recentRequests: AiUsageRequestRow[];
}

/** Drops empty values so an unset filter never becomes `?model=`. */
function toQuery(params: object): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// ── AI Evaluation types ───────────────────────────────────────────────
// Mirrors backend/app/repositories/aiEvaluationRepository.ts. Scores are
// 0..1. Nulls are meaningful: "not evaluated" and "scored zero" differ, and
// a null helpfulRate means nobody has voted yet rather than nobody liked it.

export interface AiQualityOverview {
  totalResponses: number;
  evaluatedResponses: number;
  judgedResponses: number;
  avgRewardScore: number | null;
  feedbackCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  helpfulRate: number | null;
  avgRating: number | null;
  responsesWithFailures: number;
}

export interface AiDimensionAverages {
  relevance: number | null;
  grounding: number | null;
  personalization: number | null;
  completeness: number | null;
  humanLikeness: number | null;
  hinglishQuality: number | null;
  whatsappStyle: number | null;
  clarity: number | null;
  conciseness: number | null;
  warmth: number | null;
  safety: number | null;
}

export interface AiFeedbackReason { reason: string; count: number }

export interface AiQualityTrendPoint {
  bucket: string;
  responses: number;
  avgRewardScore: number | null;
  helpfulRate: number | null;
  avgTotalTokens: number | null;
  avgCostInr: number | null;
}

export interface AiQualityVsCostRow {
  provider: string;
  model: string;
  responses: number;
  avgTotalTokens: number | null;
  avgCostInr: number | null;
  avgRewardScore: number | null;
  helpfulRate: number | null;
}

export interface AiEvaluatedResponse {
  requestId: string;
  createdAt: string;
  userId: string | null;
  conversationId: string | null;
  provider: string | null;
  model: string | null;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostInr: number | null;
  rewardScore: number | null;
  judgeUsed: boolean;
  deterministicFailures: string[];
  feedbackType: string | null;
  rating: number | null;
  feedbackReason: string | null;
}

export interface AiResponseDetail extends AiEvaluatedResponse {
  dimensions: AiDimensionAverages;
  feedbackComment: string | null;
  evaluatorProvider: string | null;
  evaluatorModel: string | null;
  evaluationVersion: string | null;
  latencyMs: number | null;
  status: string | null;
}

export interface AiEvaluationQuery {
  from?: string;
  to?: string;
  userId?: string;
  model?: string;
  feedbackType?: 'helpful' | 'not_helpful';
  minReward?: number;
  maxReward?: number;
}

export const adminService = {
  listUsers: () => request<ApiUserRecord[]>('/users'),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<{ ok: boolean }>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateUserRole: (id: string, role: 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN') =>
    request<{ ok: boolean }>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  setFreeAiChatSeconds: (id: string, seconds: number) =>
    request<{ seconds: number }>(`/users/${id}/free-ai-chat`, { method: 'PATCH', body: JSON.stringify({ seconds }) }),
  updateAstrologerProfile: (id: number, patch: AstrologerProfilePatch) =>
    request<ApiAstrologerProfile>(`/astrologers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  createAstrologer: (body: NewAstrologer) =>
    request<ApiAstrologerProfile>('/astrologers', { method: 'POST', body: JSON.stringify(body) }),
  getAstrologerRevenue: () => request<ApiAstrologerRevenue[]>('/astrologers/revenue'),
  // Staff-curated card review — null clears it (back to "no card review").
  setFeaturedReview: (id: number, reviewId: string | null) =>
    request<{ id: number; featuredReviewId: string | null }>(`/astrologers/${id}/featured-review`, { method: 'PATCH', body: JSON.stringify({ reviewId }) }),
  // "Remove" (active: false) / "Restore" (active: true) — a flag flip, not a
  // delete; see backend's setAstrologerActive for why.
  setAstrologerActive: (id: number, active: boolean) =>
    request<{ id: number; isActive: boolean }>(`/astrologers/${id}/active`, { method: 'PATCH', body: JSON.stringify({ active }) }),

  // Permanent delete — distinct from setAstrologerActive above. Rejects
  // (409, surfaced via AdminApiError.message) for any astrologer with real
  // consultation/review/booking history — only ever succeeds for one that's
  // never actually been used.
  deleteAstrologer: (id: number) =>
    request<{ id: number; deleted: boolean }>(`/astrologers/${id}`, { method: 'DELETE' }),

  // Raw fetch (text/csv attachment, not the {success, data} envelope) — same
  // pattern as downloadAstrologerRegionPriceCsv below.
  downloadAstrologersCsv: async (): Promise<Blob> => {
    const token = localStorage.getItem('auth_access_token');
    const res = await fetch(`${API_URL}/api/admin/astrologers/csv-export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new AdminApiError('DOWNLOAD_FAILED', 'Could not download the astrologers CSV.');
    return res.blob();
  },
  importAstrologersCsv: (csv: string) =>
    request<{ updated: number; errors: string[] }>('/astrologers/csv-import', { method: 'POST', body: JSON.stringify({ csv }) }),

  listConsultations: (page = 1, limit = 100) => request<ApiConsultation[]>(`/consultations?page=${page}&limit=${limit}`),

  listAuditLog: (page = 1, limit = 100) => request<ApiAuditEntry[]>(`/audit-log?page=${page}&limit=${limit}`),
  logNote: (action: string, target: string) => request<{ ok: boolean }>('/audit-log', { method: 'POST', body: JSON.stringify({ action, target }) }),

  createBlogPost: (post: NewBlogPost) => request<ApiBlogPost>('/blog', { method: 'POST', body: JSON.stringify(post) }),
  deleteBlogPost: (id: number) => request<{ ok: boolean }>(`/blog/${id}`, { method: 'DELETE' }),

  listDailyShloks: () => request<ApiDailyShlok[]>('/daily-shlok'),
  saveDailyShlok: (shlok: ApiDailyShlok) => request<ApiDailyShlok>('/daily-shlok', { method: 'PUT', body: JSON.stringify(shlok) }),
  deleteDailyShlok: (date: string) => request<{ ok: boolean }>(`/daily-shlok/${date}`, { method: 'DELETE' }),
  // Loads up to 31 at once — shuffled and spread one per day starting today
  // (see admin.routes.ts's POST /daily-shlok/bulk).
  bulkSaveDailyShloks: (shloks: { textEn: string; textHi: string }[]) =>
    request<ApiDailyShlok[]>('/daily-shlok/bulk', { method: 'POST', body: JSON.stringify({ shloks }) }),

  listReportPurchases: (page = 1, limit = 100) => request<ApiReportPurchase[]>(`/report-purchases?page=${page}&limit=${limit}`),

  listReportsCatalog: () => request<ApiAstrologyReport[]>('/reports'),
  // A STAFF caller gets { pending: true } back instead of the applied row —
  // see admin.routes.ts's own comment on why these three go through
  // report_change_requests for STAFF instead of writing astrology_reports
  // directly.
  createReportCatalogEntry: (input: AstrologyReportInput) =>
    request<ApiAstrologyReport | ApiPendingResult>('/reports', { method: 'POST', body: JSON.stringify(input) }),
  updateReportCatalogEntry: (id: number, input: AstrologyReportInput) =>
    request<ApiAstrologyReport | ApiPendingResult>(`/reports/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
  deleteReportCatalogEntry: (id: number) =>
    request<{ ok: boolean } | ApiPendingResult>(`/reports/${id}`, { method: 'DELETE' }),
  listReportChangeRequests: () => request<ApiReportChangeRequest[]>('/reports/change-requests'),
  decideReportChangeRequest: (id: string, approve: boolean) =>
    request<{ ok: boolean }>(`/reports/change-requests/${id}/decide`, { method: 'POST', body: JSON.stringify({ approve }) }),

  listBroadcasts: () => request<ApiBroadcast[]>('/broadcasts'),
  createBroadcast: (message: string, audiences: BroadcastAudience[]) =>
    request<ApiBroadcast>('/broadcasts', { method: 'POST', body: JSON.stringify({ message, audiences }) }),
  deleteBroadcast: (id: number) => request<{ ok: boolean }>(`/broadcasts/${id}`, { method: 'DELETE' }),

  listOrders: (page = 1, limit = 100) => request<ApiOrder[]>(`/orders?page=${page}&limit=${limit}`),
  // `id` here is the display id ("ORD-1042") the order comes back with —
  // the backend route wants the raw numeric primary key it was derived from.
  updateOrderDeliveryStatus: (id: string, deliveryStatus: 'PROCESSING' | 'SHIPPED' | 'DELIVERED') =>
    request<ApiOrder>(`/orders/${id.replace(/^ORD-/, '')}/delivery-status`, { method: 'PATCH', body: JSON.stringify({ deliveryStatus }) }),

  getUserActivity: (id: string) => request<ApiUserActivity>(`/users/${id}/activity`),
  getAstrologerActivity: (id: number) => request<ApiAstrologerActivity>(`/astrologers/${id}/activity`),

  getDashboardStats: () => request<ApiDashboardStats>('/dashboard-stats'),
  getTraffic: () => request<ApiTraffic>('/traffic'),
  getLeads: () => request<ApiLead[]>('/leads'),

  listContentOverrides: () => request<ApiContentOverride[]>('/content'),
  setContentOverride: (key: string, value: string) =>
    request<{ ok: boolean }>(`/content/${encodeURIComponent(key)}`, { method: 'PUT', body: JSON.stringify({ value }) }),
  resetContentOverride: (key: string) =>
    request<{ ok: boolean }>(`/content/${encodeURIComponent(key)}`, { method: 'DELETE' }),

  // ADMIN-only (see admin.routes.ts's adminOnly gate, not requireSection) —
  // never toggleable for STAFF, same precedent as the Staff section itself.
  getFeaturedAstrologer: () => request<ApiFeaturedAstrologer>('/featured-astrologer'),
  setFeaturedAstrologer: (astrologerId: number | null) =>
    request<ApiFeaturedAstrologer>('/featured-astrologer', { method: 'PATCH', body: JSON.stringify({ astrologerId }) }),

  listStaff: () => request<ApiStaffMember[]>('/staff'),
  addStaffMember: (name: string, email: string, password: string, role: 'STAFF' | 'ADMIN') =>
    request<ApiUserRecord>('/staff', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),
  updateStaffPermissions: (id: string, sections: AdminSectionKey[]) =>
    request<{ sections: AdminSectionKey[] }>(`/staff/${id}/permissions`, { method: 'PATCH', body: JSON.stringify({ sections }) }),
  getMyPermissions: () => request<{ sections: AdminSectionKey[] }>('/my-permissions'),

  listApplications: () => request<ApiApplication[]>('/applications'),
  decideApplication: (id: string, decision: 'APPROVED' | 'REJECTED') =>
    request<{ ok: boolean }>(`/applications/${id}/decide`, { method: 'POST', body: JSON.stringify({ decision }) }),

  getAstrologerStatuses: () => request<ApiAstrologerStatus[]>('/astrologers/status'),

  updateMe: (patch: { name?: string; currentPassword?: string; newPassword?: string }) =>
    request<ApiUserRecord>('/me', { method: 'PATCH', body: JSON.stringify(patch) }),

  getBoostPayoutShare: () => request<{ percent: number }>('/settings/boost-payout'),
  updateBoostPayoutShare: (percent: number) =>
    request<{ percent: number }>('/settings/boost-payout', { method: 'PATCH', body: JSON.stringify({ percent }) }),

  getNotifyEmails: () => request<{ adminEmail: string | null; headAstrologerEmail: string | null }>('/settings/notify-emails'),
  updateNotifyEmails: (input: { adminEmail: string | null; headAstrologerEmail: string | null }) =>
    request<{ adminEmail: string | null; headAstrologerEmail: string | null }>('/settings/notify-emails', { method: 'PATCH', body: JSON.stringify(input) }),

  listEmailTemplates: () => request<ApiEmailTemplate[]>('/emails/templates'),
  createEmailTemplate: (input: { name: string; subject: string; body: string }) =>
    request<ApiEmailTemplate>('/emails/templates', { method: 'POST', body: JSON.stringify(input) }),
  updateEmailTemplate: (id: string, input: { name: string; subject: string; body: string }) =>
    request<ApiEmailTemplate>(`/emails/templates/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  deleteEmailTemplate: (id: string) =>
    request<{ id: string; deleted: boolean }>(`/emails/templates/${id}`, { method: 'DELETE' }),
  composeEmail: (input: { toEmail: string; toName?: string; subject: string; body: string; templateId?: string; fromIdentity?: string }) =>
    request<{ ok: boolean }>('/emails/compose', { method: 'POST', body: JSON.stringify(input) }),
  listEmailIdentities: () => request<{ key: string; name: string }[]>('/emails/identities'),
  listEmailLog: () => request<ApiEmailLogEntry[]>('/emails/log'),

  // `percent: null` clears the override, falling back to the platform default.
  updateAstrologerBoostPayout: (id: number, percent: number | null) =>
    request<{ boostPayoutOverridePercent: number | null }>(`/astrologers/${id}/boost-payout`, { method: 'PATCH', body: JSON.stringify({ percent }) }),

  listPricingRegions: () => request<ApiPricingRegion[]>('/pricing-regions'),
  createPricingRegion: (patch: PricingRegionPatch) => request<ApiPricingRegion>('/pricing-regions', { method: 'POST', body: JSON.stringify(patch) }),
  updatePricingRegion: (id: number, patch: PricingRegionPatch) =>
    request<ApiPricingRegion>(`/pricing-regions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deletePricingRegion: (id: number) => request<{ ok: boolean }>(`/pricing-regions/${id}`, { method: 'DELETE' }),

  listAstrologerRegionPrices: () => request<ApiAstrologerRegionPrice[]>('/astrologer-region-prices'),
  setAstrologerRegionPrice: (astrologerId: number, regionId: number, chatPrice: number, callPrice: number, videoPrice: number) =>
    request<ApiAstrologerRegionPrice>('/astrologer-region-prices', { method: 'POST', body: JSON.stringify({ astrologerId, regionId, chatPrice, callPrice, videoPrice }) }),
  deleteAstrologerRegionPrice: (astrologerId: number, regionId: number) =>
    request<{ ok: boolean }>(`/astrologer-region-prices/${astrologerId}/${regionId}`, { method: 'DELETE' }),

  // Raw fetch, not the JSON `request()` helper — the server sends this as a
  // text/csv attachment, not a {success, data} envelope.
  downloadAstrologerRegionPriceCsv: async (): Promise<Blob> => {
    const token = localStorage.getItem('auth_access_token');
    const res = await fetch(`${API_URL}/api/admin/astrologer-region-prices/csv-template`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new AdminApiError('DOWNLOAD_FAILED', 'Could not download the pricing CSV template.');
    return res.blob();
  },
  importAstrologerRegionPriceCsv: (csv: string) =>
    request<{ updated: number; errors: string[] }>('/astrologer-region-prices/csv-import', { method: 'POST', body: JSON.stringify({ csv }) }),

  // ── AI Token Meter ──────────────────────────────────────────────────
  // Backed by ai_usage, which the Python ai-core service writes. All costs
  // come back already converted to INR by the backend, using the FX rate
  // snapshotted onto each row.
  aiUsageOverview: (q: AiUsageQuery = {}) =>
    request<AiUsageOverview>(`/ai-usage/overview${toQuery(q)}`),
  aiUsageTimeseries: (q: AiUsageQuery & { granularity?: AiUsageGranularity } = {}) =>
    request<AiUsageTimePoint[]>(`/ai-usage/timeseries${toQuery(q)}`),
  aiUsageModels: (q: AiUsageQuery = {}) =>
    request<AiUsageModelRow[]>(`/ai-usage/models${toQuery(q)}`),
  aiUsageUsers: (q: AiUsageQuery & { search?: string; sort?: string; limit?: number } = {}) =>
    request<AiUsageUserRow[]>(`/ai-usage/users${toQuery(q)}`),
  aiUsageRequests: (q: AiUsageQuery & { limit?: number; offset?: number } = {}) =>
    request<{ rows: AiUsageRequestRow[]; total: number }>(`/ai-usage/requests${toQuery(q)}`),
  aiUsageConversations: (q: AiUsageQuery = {}) =>
    request<AiUsageConversationRow[]>(`/ai-usage/conversations${toQuery(q)}`),
  aiUsageUserDetail: (userId: string, q: AiUsageQuery = {}) =>
    request<AiUsageUserDetail>(`/ai-usage/users/${encodeURIComponent(userId)}${toQuery(q)}`),
  aiUsageFilters: () => request<{ models: string[]; providers: string[] }>('/ai-usage/filters'),

  listCallRecordings: (page = 1, limit = 100) => request<ApiCallRecording[]>(`/call-recordings?page=${page}&limit=${limit}`),
  // Raw fetch, not the JSON `request()` helper — the server sends the actual
  // audio bytes, not a {success, data} envelope (see admin.routes.ts's
  // GET /call-recordings/:id/audio).
  fetchCallRecordingAudio: async (id: string): Promise<Blob> => {
    const token = localStorage.getItem('auth_access_token');
    const res = await fetch(`${API_URL}/api/admin/call-recordings/${id}/audio`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new AdminApiError('DOWNLOAD_FAILED', 'Could not load this recording (it may have expired).');
    return res.blob();
  },

  // ── AI Evaluation ───────────────────────────────────────────────────
  aiEvaluationOverview: (q: AiEvaluationQuery = {}) =>
    request<{
      overview: AiQualityOverview;
      dimensions: AiDimensionAverages;
      feedbackReasons: AiFeedbackReason[];
    }>(`/ai-evaluation/overview${toQuery(q)}`),
  aiEvaluationTrend: (q: AiEvaluationQuery & { granularity?: AiUsageGranularity } = {}) =>
    request<AiQualityTrendPoint[]>(`/ai-evaluation/trend${toQuery(q)}`),
  aiEvaluationQualityVsCost: (q: AiEvaluationQuery = {}) =>
    request<AiQualityVsCostRow[]>(`/ai-evaluation/quality-vs-cost${toQuery(q)}`),
  aiEvaluationResponses: (q: AiEvaluationQuery & { limit?: number; offset?: number } = {}) =>
    request<{ rows: AiEvaluatedResponse[]; total: number }>(`/ai-evaluation/responses${toQuery(q)}`),
  aiEvaluationResponseDetail: (requestId: string) =>
    request<AiResponseDetail>(`/ai-evaluation/responses/${encodeURIComponent(requestId)}`),

  // ── Homepage banners ─────────────────────────────────────────────────
  listBanners: () => request<ApiBanner[]>('/banners'),
  createBanner: (banner: { mediaType: 'image' | 'video'; mediaData: string; linkUrl: string | null; heading: string | null; ctaText: string | null; expiresAt: number | null }) =>
    request<ApiBanner>('/banners', { method: 'POST', body: JSON.stringify(banner) }),
  updateBanner: (id: string, patch: { linkUrl?: string | null; heading?: string | null; ctaText?: string | null; expiresAt?: number | null }) =>
    request<ApiBanner>(`/banners/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteBanner: (id: string) => request<{ ok: true }>(`/banners/${id}`, { method: 'DELETE' }),

  // ── Pooja hub (recorded videos, group sessions, aarti/book library) ───
  listPoojaVideos: () => request<ApiPoojaVideo[]>('/pooja/videos'),
  createPoojaVideo: (v: { title: string; category: string; videoUrl: string; thumbnailUrl: string | null }) =>
    request<ApiPoojaVideo>('/pooja/videos', { method: 'POST', body: JSON.stringify(v) }),
  deletePoojaVideo: (id: string) => request<{ ok: true }>(`/pooja/videos/${id}`, { method: 'DELETE' }),

  listPoojaSessions: () => request<ApiPoojaSession[]>('/pooja/sessions'),
  createPoojaSession: (s: { title: string; panditName: string; scheduledAt: number; meetingUrl: string | null; pricePaise: number | null; capacity: number | null }) =>
    request<ApiPoojaSession>('/pooja/sessions', { method: 'POST', body: JSON.stringify(s) }),
  deletePoojaSession: (id: string) => request<{ ok: true }>(`/pooja/sessions/${id}`, { method: 'DELETE' }),

  listPoojaBooks: () => request<ApiPoojaBook[]>('/pooja/books'),
  createPoojaBook: (b: { title: string; author: string | null; category: string; content: string | null; pdfUrl: string | null; coverImageUrl: string | null }) =>
    request<ApiPoojaBook>('/pooja/books', { method: 'POST', body: JSON.stringify(b) }),
  deletePoojaBook: (id: string) => request<{ ok: true }>(`/pooja/books/${id}`, { method: 'DELETE' }),
};

export interface ApiBanner {
  id: string;
  mediaType: 'image' | 'video';
  mediaData: string;
  linkUrl: string | null;
  heading: string | null;
  ctaText: string | null;
  createdAt: number;
  expiresAt: number | null;
}

export interface ApiPoojaVideo {
  id: string;
  title: string;
  category: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  createdAt: number;
}

export interface ApiPoojaSession {
  id: string;
  title: string;
  panditName: string;
  scheduledAt: number;
  meetingUrl: string | null;
  pricePaise: number | null;
  capacity: number | null;
  createdAt: number;
}

export interface ApiPoojaBook {
  id: string;
  title: string;
  author: string | null;
  category: string;
  content: string | null;
  pdfUrl: string | null;
  coverImageUrl: string | null;
  createdAt: number;
}

export interface ApiCallRecording {
  id: string;
  consultationId: string;
  astrologerName: string;
  userName: string;
  userEmail: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: number;
  expiresAt: number;
}
