export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AstrologerApplicationRow {
  id: string;
  user_id: string;
  expertise: string;
  experience: string;
  status: ApplicationStatus;
  submitted_at: number;
  decided_at: number | null;
  full_name: string | null;
  phone_number: string | null;
  email: string | null;
  languages: string | null;
  bio: string | null;
  resume_data: string | null;
  drive_link: string | null;
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
  fullName: string | null;
  phoneNumber: string | null;
  email: string | null;
  languages: string | null;
  bio: string | null;
  resumeData: string | null;
  driveLink: string | null;
}
