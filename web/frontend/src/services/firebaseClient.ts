// Firebase client SDK — Google Sign-In popup + Phone Auth (OTP). Config
// comes from VITE_FIREBASE_* env vars (public values, safe in frontend code
// — the actual secret is the backend's service account, never here). See
// backend/app/core/firebaseAdmin.ts for the server-side verification half.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
};

let app: FirebaseApp | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!app) {
    if (!firebaseConfig.apiKey) {
      throw new Error('Firebase is not configured on the frontend (missing VITE_FIREBASE_* env vars)');
    }
    app = initializeApp(firebaseConfig);
  }
  return app;
}

function getAuthClient() {
  return getAuth(getFirebaseApp());
}

// Google Sign-In — opens the popup, returns the ID token our backend
// verifies (see authService.ts's firebaseLogin / /api/auth/firebase).
export async function signInWithGooglePopup(): Promise<string> {
  const result = await signInWithPopup(getAuthClient(), new GoogleAuthProvider());
  return result.user.getIdToken();
}

// Phone Auth needs an invisible reCAPTCHA bound to a real DOM node —
// `containerId` must already be mounted (see AuthPage.tsx's
// `<div id="firebase-recaptcha-container" />`).
//
// NOT reused across calls: an invisible reCAPTCHA widget is single-use —
// once `signInWithPhoneNumber` has consumed it (successfully or not), a
// second send attempt (an initial retry after an error, or the "Resend
// code" button) with the SAME verifier instance fails outright with
// "reCAPTCHA client element has been removed". Clearing and re-rendering a
// fresh widget on every call is the fix Firebase's own docs use for
// exactly this resend scenario.
let recaptchaVerifier: RecaptchaVerifier | null = null;

function getFreshRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  recaptchaVerifier?.clear();
  recaptchaVerifier = new RecaptchaVerifier(getAuthClient(), containerId, { size: 'invisible' });
  return recaptchaVerifier;
}

// Sends the OTP via Firebase's own SMS delivery — no backend call at all
// for this step. `phoneNumberE164` must include the country code (e.g.
// "+919876543210"). Returns a ConfirmationResult; call `.confirm(code)` on
// it with the 6-digit code the user enters to complete verification.
export async function sendFirebasePhoneOtp(phoneNumberE164: string, containerId: string): Promise<ConfirmationResult> {
  return signInWithPhoneNumber(getAuthClient(), phoneNumberE164, getFreshRecaptchaVerifier(containerId));
}

// India-only helper — this app's registration form collects a plain local
// number (no country code field), so assume +91 unless one was already
// given. Good enough for this app's actual userbase; a number that's
// neither shape just gets rejected by Firebase with a clear error.
export function toE164IndianNumber(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return `+91${digits}`;
}
