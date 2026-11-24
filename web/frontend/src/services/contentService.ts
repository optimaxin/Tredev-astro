// Thin client for the public content API (backend/app/api/content.routes.ts):
// journal posts, testimonials, and the paid-report catalog. Same fetch
// pattern as calculatorService.ts.

import { API_URL } from './apiUrl';

export class ContentApiError extends Error {
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
    res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
    });
  } catch {
    throw new ContentApiError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new ContentApiError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export interface BlogPost {
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

export interface Testimonial {
  id: number;
  name: string;
  location: string;
  service: string;
  rating: number;
  text: string;
  avatar: string;
}

export interface AstrologyReport {
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
  coverColor: string | null;
  coverPattern: string | null;
  coverImage: string | null;
}

export interface Broadcast {
  id: number;
  message: string;
  createdAt: number;
  active: boolean;
}

export type ReportBundle = 'report-only' | 'report-qa' | 'report-consult';

export interface ReportPurchase {
  id: string;
  reportId: number;
  reportTitle: string;
  bundle: ReportBundle;
  amount: number;
  purchasedAt: number;
}

/** The Panchang card's footer line for one day, or null if staff haven't set one. */
export interface DailyShlok {
  date: string;
  textEn: string;
  textHi: string;
}

export const contentService = {
  getDailyShlok: (date: string) => request<DailyShlok | null>(`/api/daily-shlok?date=${encodeURIComponent(date)}`),
  listBlogPosts: () => request<BlogPost[]>('/api/blog'),
  getBlogPost: (id: number) => request<BlogPost>(`/api/blog/${id}`),
  listTestimonials: () => request<Testimonial[]>('/api/testimonials'),
  listReports: () => request<AstrologyReport[]>('/api/reports'),
  getReport: (id: number) => request<AstrologyReport>(`/api/reports/${id}`),
  listActiveBroadcasts: () => request<Broadcast[]>('/api/broadcasts/active'),
  // Purchasing moved to paymentService.pay({ purpose: 'REPORT_PURCHASE', ... })
  // — a real Cashfree payment now gates it (see payments.routes.ts).
  listMyReportPurchases: () => request<ReportPurchase[]>('/api/reports/mine'),
  // Staff/admin-edited site text + image overrides — merged over every
  // hardcoded default in AppContext's t() at bootstrap (see admin's Content page).
  getContentOverrides: () => request<Record<string, string>>('/api/content/overrides'),
};
