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
  // CLIENT_ORIGIN can be a comma-separated list (see main.ts's CORS setup,
  // which parses it the same way) — e.g. the main site plus the separately-
  // deployed Ganesh Chaturthi campaign site each need to be allowlisted.
  // clientOrigins[0] is used as the payment gateway callback/return URL
  // (see payments.routes.ts), so it must be exactly ONE clean origin, not
  // the raw unsplit env var — sending Razorpay a comma-joined value as its
  // callback_url gets rejected outright ("URL should be sent in
  // callback_url field").
  clientOrigins: process.env.CLIENT_ORIGIN
    ? process.env.CLIENT_ORIGIN.split(',').map(o => o.trim()).filter(Boolean)
    : ['http://localhost:5173', 'http://localhost:5174'],
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
  // dashboard page — deliberately a single shared username+password, not
  // full user/JWT auth, since this is a small internal "how many people
  // clicked what" view for the campaign, not an account-scoped admin feature.
  campaignAnalyticsUsername: required('CAMPAIGN_ANALYTICS_USERNAME', 'ganesh-admin'),
  campaignAnalyticsPassword: required('CAMPAIGN_ANALYTICS_PASSWORD', 'ganesh-analytics-2026'),
  cloudflareTurn: {
    // Optional, like cashfree/aws above — CallWindow.tsx's TURN-credentials
    // route falls back to STUN-only when these aren't set (fine for
    // same-network dev testing, not for real cross-network calls). Create a
    // Turn Key at the Cloudflare dashboard → Realtime → TURN Service.
    keyId: process.env.CLOUDFLARE_TURN_KEY_ID,
    apiToken: process.env.CLOUDFLARE_TURN_API_TOKEN,
  },
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
