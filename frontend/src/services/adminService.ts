// Thin client for the real admin API (backend/app/api/admin.routes.ts).
// Every call requires a real ADMIN-role JWT — the backend verifies this
// server-side, this file just attaches whatever token is currently stored.

import { API_URL } from './apiUrl';

export class AdminApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_access_token');
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
}

export interface ApiUserRecord {
  id: string;
  name: string;
  email: string;
  role: 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

// Mirrors ADMIN_SECTIONS in backend/app/repositories/staffPermissionRepository.ts
export const ADMIN_SECTIONS = [
  'overview', 'astrologers', 'users', 'consultations', 'reports', 'orders', 'pricing', 'blog', 'notifications', 'audit', 'settings',
] as const;
export type AdminSectionKey = typeof ADMIN_SECTIONS[number];

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

export interface ApiBroadcast {
  id: number;
  message: string;
  createdAt: number;
  active: boolean;
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

export interface ApiUserActivity {
  reports: number;
  consultations: number;
  orders: number;
  recentChats: ApiChatAudit[];
  lastAction: ApiLastAction | null;
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
  userId: string;
  userName: string;
  userEmail: string;
  expertise: string;
  experience: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: number;
  decidedAt: number | null;
}

// Live availability from the realtime server, not account status — see
// backend/app/services/realtimeStore.ts.
export interface ApiAstrologerStatus {
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

export const adminService = {
  listUsers: () => request<ApiUserRecord[]>('/users'),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<{ ok: boolean }>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateUserRole: (id: string, role: 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN') =>
    request<{ ok: boolean }>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  updateAstrologerProfile: (id: number, patch: AstrologerProfilePatch) =>
    request<ApiAstrologerProfile>(`/astrologers/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  getAstrologerRevenue: () => request<ApiAstrologerRevenue[]>('/astrologers/revenue'),

  listConsultations: (page = 1, limit = 100) => request<ApiConsultation[]>(`/consultations?page=${page}&limit=${limit}`),

  listAuditLog: (page = 1, limit = 100) => request<ApiAuditEntry[]>(`/audit-log?page=${page}&limit=${limit}`),
  logNote: (action: string, target: string) => request<{ ok: boolean }>('/audit-log', { method: 'POST', body: JSON.stringify({ action, target }) }),

  createBlogPost: (post: NewBlogPost) => request<ApiBlogPost>('/blog', { method: 'POST', body: JSON.stringify(post) }),
  deleteBlogPost: (id: number) => request<{ ok: boolean }>(`/blog/${id}`, { method: 'DELETE' }),

  listReportPurchases: (page = 1, limit = 100) => request<ApiReportPurchase[]>(`/report-purchases?page=${page}&limit=${limit}`),

  listBroadcasts: () => request<ApiBroadcast[]>('/broadcasts'),
  createBroadcast: (message: string) => request<ApiBroadcast>('/broadcasts', { method: 'POST', body: JSON.stringify({ message }) }),
  deleteBroadcast: (id: number) => request<{ ok: boolean }>(`/broadcasts/${id}`, { method: 'DELETE' }),

  listOrders: (page = 1, limit = 100) => request<ApiOrder[]>(`/orders?page=${page}&limit=${limit}`),
  // `id` here is the display id ("ORD-1042") the order comes back with —
  // the backend route wants the raw numeric primary key it was derived from.
  updateOrderDeliveryStatus: (id: string, deliveryStatus: 'PROCESSING' | 'SHIPPED' | 'DELIVERED') =>
    request<ApiOrder>(`/orders/${id.replace(/^ORD-/, '')}/delivery-status`, { method: 'PATCH', body: JSON.stringify({ deliveryStatus }) }),

  getUserActivity: (id: string) => request<ApiUserActivity>(`/users/${id}/activity`),
  getAstrologerActivity: (id: number) => request<ApiAstrologerActivity>(`/astrologers/${id}/activity`),

  getDashboardStats: () => request<ApiDashboardStats>('/dashboard-stats'),

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
};
