export interface Announcement {
  id: string;
  title: string;
  message: string;
  audience: 'ALL_USERS' | 'ALL_ASTROLOGERS' | 'SPECIFIC_USER';
  targetEmail?: string;
  scheduledAt: string | null;
  sentAt: string;
}

export type AdminSection =
  | 'overview'
  | 'applications'
  | 'astrologers'
  | 'users'
  | 'staff'
  | 'featured-astrologer'
  | 'consultations'
  | 'reports'
  | 'orders'
  | 'pricing'
  | 'blog'
  | 'shlok'
  | 'notifications'
  | 'audit'
  | 'tokens'
  | 'evaluation'
  | 'settings'
  | 'call-recordings'
  | 'banners'
  | 'pooja'
  | 'emails'
  | 'leads'
  | 'content';
