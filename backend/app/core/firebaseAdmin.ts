// Shared Firebase Admin SDK app instance — used by both firestore.ts (DB
// migration, see the migration plan) and authService.ts's loginWithFirebase
// (Google Sign-In / Phone Auth verification). One app, one credential.
//
// Initialization is lazy (only on first actual use) rather than at import
// time, so a server that hasn't been given FIREBASE_SERVICE_ACCOUNT_JSON yet
// doesn't crash on boot — it just fails the specific request that needed
// it, same "undefined check, clear error" pattern as cashfreeClient.ts/
// razorpayClient.ts.
import { config } from './config.ts';

let app: import('firebase-admin/app').App | undefined;

export async function getFirebaseApp() {
  if (app) return app;
  if (!config.firebase.serviceAccountJson) {
    throw new Error('Firebase is not configured (missing FIREBASE_SERVICE_ACCOUNT_JSON)');
  }
  const { initializeApp, cert } = await import('firebase-admin/app');
  let serviceAccount: object;
  try {
    serviceAccount = JSON.parse(config.firebase.serviceAccountJson);
  } catch {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON');
  }
  app = initializeApp({ credential: cert(serviceAccount as any) });
  return app;
}

export async function getFirebaseAuth() {
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(await getFirebaseApp());
}
