// Thin client for the real backend auth API (backend/app/api/auth.routes.ts).
// Nothing else in the frontend should call fetch() against /api/auth directly —
// this is the one place that knows the request/response shape.

import { API_URL } from './apiUrl';

export type Role = 'USER' | 'ASTROLOGIST' | 'STAFF' | 'ADMIN';

export interface ApiUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: 'ACTIVE' | 'SUSPENDED';
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string | null;
  birth_latitude: number | null;
  birth_longitude: number | null;
  birth_timezone_offset_minutes: number | null;
  phone_number: string | null;
  phone_verified: boolean;
  free_ai_chat_seconds: number;
}

export interface RegisterBirthDetails {
  birthDate?: string;
  birthTime?: string;
  birthPlace?: string;
  birthLatitude?: number;
  birthLongitude?: number;
  birthTimezoneOffsetMinutes?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiRequestError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new ApiRequestError('NETWORK_ERROR', 'Could not reach the server. Please check your connection.');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) {
    throw new ApiRequestError(body?.error?.code || 'UNKNOWN', body?.error?.message || 'Something went wrong.');
  }
  return body.data as T;
}

export const authService = {
  register: (name: string, email: string, password: string, phoneNumber: string, birthDetails?: RegisterBirthDetails) =>
    request<{ user: ApiUser } & AuthTokens>('/register', { method: 'POST', body: JSON.stringify({ name, email, password, phoneNumber, ...birthDetails }) }),

  login: (email: string, password: string) =>
    request<{ user: ApiUser } & AuthTokens>('/login', { method: 'POST', body: JSON.stringify({ email, password }) }),

  refresh: (refreshToken: string) =>
    request<AuthTokens>('/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  logout: (refreshToken: string) =>
    request<{ ok: boolean }>('/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),

  me: (accessToken: string) =>
    request<ApiUser>('/me', { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } }),

  updateBirthDetails: (accessToken: string, details: Required<RegisterBirthDetails>) =>
    request<ApiUser>('/me/birth-details', { method: 'PATCH', body: JSON.stringify(details), headers: { Authorization: `Bearer ${accessToken}` } }),

  // Fills in a real name right after a brand-new phone-only signup (Phone
  // Auth carries no name claim, unlike Google — see auth.routes.ts's comment).
  updateName: (accessToken: string, name: string) =>
    request<ApiUser>('/me/name', { method: 'PATCH', body: JSON.stringify({ name }), headers: { Authorization: `Bearer ${accessToken}` } }),

  forgotPassword: (email: string) =>
    request<{ message: string; devResetToken?: string }>('/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),

  resetPassword: (token: string, newPassword: string) =>
    request<{ ok: boolean }>('/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) }),

  // Google Sign-In / Phone Auth — frontend runs the actual Firebase popup/OTP
  // flow and hands the resulting ID token here; replaced the old custom
  // OTP-over-SMS verifyOtp/resendOtp (see backend/app/services/authService.ts).
  firebaseLogin: (idToken: string) =>
    request<{ user: ApiUser; isNewUser: boolean } & AuthTokens>('/firebase', { method: 'POST', body: JSON.stringify({ idToken }) }),

  // Post-registration "verify your phone" step — attaches + verifies a
  // phone number on the CURRENT (already logged-in) account.
  linkFirebasePhone: (accessToken: string, idToken: string) =>
    request<ApiUser>('/me/link-firebase-phone', { method: 'POST', body: JSON.stringify({ idToken }), headers: { Authorization: `Bearer ${accessToken}` } }),
};
