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
  'overview', 'astrologers', 'users', 'consultations', 'reports', 'orders', 'blog', 'notifications', 'audit', 'settings',
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

export interface ApiUserActivity {
  reports: number;
  consultations: number;
  orders: number;
}

export interface ApiDashboardStats {
  consultationsInProgress: number;
  revenue: number;
  reportsGenerated: number;
  storeOrders: number;
  recentConsultations: { id: string; userName: string; astrologerName: string; createdAt: number }[];
  recentPurchases: { id: string; userName: string; reportTitle: string; purchasedAt: number }[];
  recentDeliveredOrders: { id: string; createdAt: number }[];
}

export interface ApiStaffMember extends ApiUserRecord {
  sections: AdminSectionKey[];
}

export const adminService = {
  listUsers: () => request<ApiUserRecord[]>('/users'),
  updateUserStatus: (id: string, status: 'ACTIVE' | 'SUSPENDED') =>
    request<{ ok: boolean }>(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  updateUserRole: (id: string, role: 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN') =>
    request<{ ok: boolean }>(`/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  addAstrologer: (name: string, email: string, password: string) =>
    request<ApiUserRecord>('/astrologers', { method: 'POST', body: JSON.stringify({ name, email, password }) }),

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

  getDashboardStats: () => request<ApiDashboardStats>('/dashboard-stats'),

  listStaff: () => request<ApiStaffMember[]>('/staff'),
  addStaffMember: (name: string, email: string, password: string, role: 'STAFF' | 'ADMIN') =>
    request<ApiUserRecord>('/staff', { method: 'POST', body: JSON.stringify({ name, email, password, role }) }),
  updateStaffPermissions: (id: string, sections: AdminSectionKey[]) =>
    request<{ sections: AdminSectionKey[] }>(`/staff/${id}/permissions`, { method: 'PATCH', body: JSON.stringify({ sections }) }),
  getMyPermissions: () => request<{ sections: AdminSectionKey[] }>('/my-permissions'),
};
