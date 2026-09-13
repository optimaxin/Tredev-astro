// Central place for environment configuration. Nothing else in the backend
// should read `process.env` directly — that keeps every required variable
// discoverable in one file and makes `.env.example` easy to keep in sync.

function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

export const config = {
  port: Number(process.env.PORT) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientOrigins: [process.env.CLIENT_ORIGIN || 'http://localhost:5173', 'http://localhost:5174'],
  // No dev fallback here — there's no meaningful local default for a hosted
  // Postgres connection string. Set it in backend/.env (see .env.example).
  databaseUrl: (() => {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('Missing required environment variable: DATABASE_URL (see backend/.env.example)');
    return url;
  })(),
  jwt: {
    // Dev-only fallback secrets so the app runs out of the box locally.
    // Production MUST set real secrets — required() throws otherwise.
    accessSecret: required('JWT_SECRET', 'dev-insecure-access-secret-change-me'),
    refreshSecret: required('REFRESH_TOKEN_SECRET', 'dev-insecure-refresh-secret-change-me'),
    accessTtl: process.env.JWT_EXPIRATION || '15m',
    refreshTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS) || 7,
  },
  aws: {
    // Genuinely optional — geocoding.ts falls back to the free Nominatim
    // provider when this isn't set, so local dev never needs an AWS
    // account. Set in backend/.env (local) and Render's dashboard env vars
    // (production) — never commit real values. (SNS/phone-OTP-by-SMS used
    // to live here too — replaced by Firebase Phone Auth, see authService.ts.)
    locationApiKey: process.env.AWS_LOCATION_API_KEY,
    locationRegion: process.env.AWS_LOCATION_REGION || 'us-east-1',
  },
  cashfree: {
    // No dev fallback (like databaseUrl) — a payment intent genuinely cannot
    // be created without real sandbox/production keys. Routes that need
    // these check for undefined and fail with a clear error instead of
    // silently hitting Cashfree with empty credentials.
    appId: process.env.CASHFREE_APP_ID,
    secretKey: process.env.CASHFREE_SECRET_KEY,
    env: process.env.CASHFREE_ENV || 'sandbox', // 'sandbox' | 'production'
  },
  razorpay: {
    // Second gateway, selectable alongside Cashfree at checkout (see
    // PaymentGatewayPicker.tsx) — same "undefined check, clear error"
    // pattern as cashfree above, no dev fallback.
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
  // Gates GET /api/campaign-analytics/summary and the /campaign-analytics
  // dashboard page — deliberately a single shared password, not full
  // user/JWT auth, since this is a small internal "how many people clicked
  // what" view for the campaign, not an account-scoped admin feature.
  campaignAnalyticsPassword: required('CAMPAIGN_ANALYTICS_PASSWORD', 'ganesh-analytics-2026'),
  firebase: {
    // The whole service-account JSON (from Firebase Console → Project
    // Settings → Service Accounts → Generate new private key), pasted as
    // ONE env var — not a file path. Render (this backend's host) only
    // offers plain string env vars, no file uploads, same reasoning as
    // every other secret in this file. Used for Google/Phone sign-in
    // verification (authService.ts's loginWithFirebase, via
    // core/firebaseAdmin.ts) and, later, the Postgres→Firestore DB
    // migration (core/firestore.ts) — same project, one credential. Read
    // lazily (only when first actually used) so the rest of the app keeps
    // running on Postgres in the meantime if this isn't set yet.
    serviceAccountJson: process.env.FIREBASE_SERVICE_ACCOUNT_JSON,
  },
};
