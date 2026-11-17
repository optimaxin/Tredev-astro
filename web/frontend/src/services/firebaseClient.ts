// Firebase client SDK — Google Sign-In popup + Phone Auth (OTP). Config
// comes from VITE_FIREBASE_* env vars (public values, safe in frontend code
// — the actual secret is the backend's service account, never here). See
// backend/app/core/firebaseAdmin.ts for the server-side verification half.
import { initializeApp, type FirebaseApp } from 'firebase/app';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber,
  type ConfirmationResult, type UserCredential,
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
// second send attempt (a retry after an error, or "Resend code") needs a
// genuinely fresh widget. `verifier.clear()` alone isn't reliable enough
// here — Google's own grecaptcha.js keeps its widget registry keyed by the
// actual DOM node, and in practice still reports "reCAPTCHA has already
// been rendered in this element" for the next render even right after
// `.clear()` (a real-world Firebase JS SDK + React timing gap, not
// something this app's code controls). Swapping in a brand-new DOM node
// with the same id sidesteps that entirely — grecaptcha has never seen
// this exact node before, so there's nothing for it to conflict with.
let recaptchaVerifier: RecaptchaVerifier | null = null;

function getFreshRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  recaptchaVerifier?.clear();
  recaptchaVerifier = null;
  const oldContainer = document.getElementById(containerId);
  if (oldContainer?.parentNode) {
    const freshContainer = document.createElement('div');
    freshContainer.id = containerId;
    oldContainer.parentNode.replaceChild(freshContainer, oldContainer);
  }
  recaptchaVerifier = new RecaptchaVerifier(getAuthClient(), containerId, { size: 'invisible' });
  return recaptchaVerifier;
}

// Sends the OTP via Firebase's own SMS delivery — no backend call at all
// for this step. `phoneNumberE164` must include the country code (e.g.
// "+919876543210"). Returns a ConfirmationResult; call `.confirm(code)` on
// it with the 6-digit code the user enters to complete verification.
export async function sendFirebasePhoneOtp(phoneNumberE164: string, containerId: string): Promise<ConfirmationResult> {
  if (MOCK_OTP_ENABLED) return mockConfirmation(phoneNumberE164);
  return signInWithPhoneNumber(getAuthClient(), phoneNumberE164, getFreshRecaptchaVerifier(containerId));
}

// ── Dev-only login bypass ────────────────────────────────────────────────
// Without VITE_FIREBASE_* there is no Firebase project to send an SMS
// through, so local dev couldn't log in at all. In a dev build with no
// config, skip the SMS entirely: any number is accepted with the fixed code
// below, and `confirm()` hands back a `mock:<phone>` token in place of a
// Firebase ID token — the backend accepts that shape only outside
// production (see decodeMockToken in backend/app/services/authService.ts).
// Production builds (import.meta.env.DEV === false) never take this path,
// and neither does a dev build once VITE_FIREBASE_API_KEY is set.
export const MOCK_OTP = '123456';
export const MOCK_OTP_ENABLED = import.meta.env.DEV && !firebaseConfig.apiKey;

function mockConfirmation(phoneNumberE164: string): ConfirmationResult {
  return {
    verificationId: 'mock-verification',
    confirm: async (code: string) => {
      if (code.trim() !== MOCK_OTP) {
        // Same `.code` Firebase itself sets, so AuthPage's existing error
        // mapping produces the same message it would for a real wrong OTP.
        throw Object.assign(new Error('Invalid verification code'), { code: 'auth/invalid-verification-code' });
      }
      return { user: { getIdToken: async () => `mock:${phoneNumberE164}` } } as unknown as UserCredential;
    },
  };
}

// Combines the user's selected country dial code with whatever they typed
// in the phone field — AuthPage.tsx's country dropdown (see
// data/countryCodes.ts) is what picks `dialCode`, auto-selected from IP
// geolocation but always user-overridable. If they typed a full number with
// its own '+' already, that's trusted as-is over the dropdown, since it's
// unambiguous either way.
export function toE164(raw: string, dialCode: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('+')) return trimmed;
  const digits = trimmed.replace(/\D/g, '');
  return `+${dialCode}${digits}`;
}
