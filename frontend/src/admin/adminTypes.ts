export type ConsultationStatus = 'UPCOMING' | 'LIVE' | 'COMPLETED' | 'CANCELLED';

export interface AdminConsultation {
  id: string;
  userName: string;
  astrologerName: string;
  date: string;
  time: string;
  type: 'Chat' | 'Voice' | 'Video';
  payment: number;
  status: ConsultationStatus;
}

export type ReportPurchaseStatus = 'PENDING' | 'COMPLETED';

export interface AdminReportPurchase {
  id: string;
  userName: string;
  reportTitle: string;
  price: number;
  status: ReportPurchaseStatus;
  date: string;
}

export type DeliveryStatus = 'PROCESSING' | 'SHIPPED' | 'DELIVERED';

export interface AdminOrder {
  id: string;
  customer: string;
  product: string;
  amount: number;
  payment: 'PAID' | 'UNPAID';
  delivery: DeliveryStatus;
}

export interface ContentModule {
  key: string;
  labelKey: string;
  heading: string;
  body: string;
  updatedAt: string;
}

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
  | 'consultations'
  | 'reports'
  | 'orders'
  | 'content'
  | 'blog'
  | 'notifications'
  | 'audit'
  | 'settings';
