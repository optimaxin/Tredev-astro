export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AstrologerApplicationRow {
  id: string;
  user_id: string;
  expertise: string;
  experience: string;
  status: ApplicationStatus;
  submitted_at: number;
  decided_at: number | null;
}

export interface PublicAstrologerApplication {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  expertise: string;
  experience: string;
  status: ApplicationStatus;
  submittedAt: number;
  decidedAt: number | null;
}
