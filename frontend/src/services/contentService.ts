// Thin client for the public content API (backend/app/api/content.routes.ts):
// journal posts, testimonials, and the paid-report catalog. Same fetch
// pattern as calculatorService.ts.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export class ContentApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`);
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
}

export interface Broadcast {
  id: number;
  message: string;
  createdAt: number;
  active: boolean;
}

export const contentService = {
  listBlogPosts: () => request<BlogPost[]>('/api/blog'),
  getBlogPost: (id: number) => request<BlogPost>(`/api/blog/${id}`),
  listTestimonials: () => request<Testimonial[]>('/api/testimonials'),
  listReports: () => request<AstrologyReport[]>('/api/reports'),
  getReport: (id: number) => request<AstrologyReport>(`/api/reports/${id}`),
  listActiveBroadcasts: () => request<Broadcast[]>('/api/broadcasts/active'),
};
