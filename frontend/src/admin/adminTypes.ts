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
  | 'astrologers'
  | 'users'
  | 'staff'
  | 'consultations'
  | 'reports'
  | 'orders'
  | 'blog'
  | 'notifications'
  | 'audit'
  | 'settings';
