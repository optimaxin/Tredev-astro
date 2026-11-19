// Central place for environment configuration. Nothing else in the backend
// should read `process.env` directly — that keeps every required variable
// discoverable in one file and makes `.env.example` easy to keep in sync.

// No dev fallbacks for secrets — a hardcoded fallback is a secret in source
// and silently becomes the real one on any host that forgets to set it.
function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name} (see backend/.env.example)`);
  return value;
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
  // Dev-only shortcuts (returning the password-reset token in the API
  // response — see authService.ts — plus geoLocation.ts's ?debugCountry=
  // pricing override). Must be
  // switched on explicitly; never inferred from NODE_ENV being unset.
  devShortcuts: process.env.DEV_SHORTCUTS === 'true' && process.env.NODE_ENV !== 'production',
  jwt: {
    accessSecret: required('JWT_SECRET'),
    refreshSecret: required('REFRESH_TOKEN_SECRET'),
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
    env: (process.env.CASHFREE_SECRET_KEY?.startsWith('cfsk_ma_prod_')
      ? 'production'
      : (process.env.CASHFREE_ENV || 'sandbox')) as 'sandbox' | 'production',
  },
  paymentGateway: (process.env.PAYMENT_GATEWAY || 'cashfree') as 'cashfree' | 'razorpay',
  razorpay: {
    // Secondary gateway, selectable or fallback — same "undefined check, clear error"
    // pattern as cashfree above, no dev fallback.
    keyId: process.env.RAZORPAY_KEY_ID,
    keySecret: process.env.RAZORPAY_KEY_SECRET,
  },
  // Gates GET /api/campaign-analytics/summary and the /campaign-analytics
  // dashboard page — deliberately a single shared username+password, not
  // full user/JWT auth, since this is a small internal "how many people
  // clicked what" view for the campaign, not an account-scoped admin feature.
  // Unset → the dashboard just rejects every login (see campaignAnalytics.routes.ts).
  campaignAnalyticsUsername: process.env.CAMPAIGN_ANALYTICS_USERNAME || '',
  campaignAnalyticsPassword: process.env.CAMPAIGN_ANALYTICS_PASSWORD || '',
  cloudflareTurn: {
    // Optional, like cashfree/aws above — CallWindow.tsx's TURN-credentials
    // route falls back to STUN-only when these aren't set (fine for
    // same-network dev testing, not for real cross-network calls). Create a
    // Turn Key at the Cloudflare dashboard → Realtime → TURN Service.
    keyId: process.env.CLOUDFLARE_TURN_KEY_ID,
    apiToken: process.env.CLOUDFLARE_TURN_API_TOKEN,
  },
  premiumReport: {
    // The Stage 6 Premium Report service (Tradeva Premium, kb_report/api.py).
    // This URL is SERVER-SIDE ONLY and must never reach the frontend: that
    // service has no authentication of its own, so anyone who can reach it
    // can read any report by id. Keep it bound to localhost or a private
    // network and let api/premiumReports.routes.ts be its only client.
    baseUrl: (process.env.PREMIUM_REPORT_API_URL || 'http://127.0.0.1:8100').replace(/\/+$/, ''),
    // Generation itself runs asynchronously upstream, so every call this
    // backend makes is a short one (submit, poll, fetch). A long timeout
    // here would only hold an Express connection open on a dead service.
    timeoutMs: Number(process.env.PREMIUM_REPORT_TIMEOUT_MS) || 30_000,
  },
  nvidia: {
    // NVIDIA NIM (OpenAI-compatible) — rewrites the template-generated Kundli
    // descriptions (kundliAnalysis.ts, dashaPredictions.ts, etc.) into natural
    // conversational Hindi/English. Optional, like cashfree/aws above:
    // kundliDescriptionRewriter.ts skips straight to the original template
    // text (no error, no delay) when this isn't set, so the Kundli feature
    // never depends on it being configured.
    apiKey: process.env.NVIDIA_API_KEY,
    baseUrl: (process.env.NVIDIA_BASE_URL || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, ''),
    primaryModel: process.env.NVIDIA_PRIMARY_MODEL || 'mistralai/mistral-large-4-1t-a52b',
    fallbackModel: process.env.NVIDIA_FALLBACK_MODEL || 'deepseek-ai/deepseek-v4.1-flash',
    temperature: Number(process.env.LLM_TEMPERATURE) || 0.3,
    timeoutMs: (Number(process.env.LLM_TIMEOUT) || 30) * 1000,
    maxRetries: Number(process.env.LLM_MAX_RETRIES) || 2,
  },
  zeptomail: {
    // Transactional email (password reset, etc.) — optional like cashfree/aws
    // above; emailService.ts no-ops with a console warning when unset so
    // local dev doesn't need a real account. Token format from ZeptoMail's
    // dashboard already includes the "Zoho-enczapikey " prefix — paste it
    // whole. Set in backend/.env (local) and Render's dashboard (production).
    apiKey: process.env.ZEPTOMAIL_API_KEY,
    fromAddress: process.env.ZEPTOMAIL_FROM_EMAIL || 'noreply@tredevaastro.com',
    fromName: process.env.ZEPTOMAIL_FROM_NAME || 'TredevaAstro',
    // Per-purpose "send as" identities (notificationService.ts, and the
    // Compose screen's "Send As" picker) — e.g. a hiring decision mails from
    // "TredevaAstro Hiring Team", not the generic noreply address. Each one
    // falls back to the single address/name above when its own env var isn't
    // set, so this works out of the box with zero extra config; set the
    // *_ADDRESS vars once real mailboxes/verified senders for them exist in
    // ZeptoMail (each sending address must be verified there before it can
    // actually send, same as the default one already is).
    identities: {
      support: {
        address: process.env.ZEPTOMAIL_SUPPORT_EMAIL || process.env.ZEPTOMAIL_FROM_EMAIL || 'noreply@tredevaastro.com',
        name: process.env.ZEPTOMAIL_SUPPORT_NAME || 'TredevaAstro Support',
      },
      hiring: {
        address: process.env.ZEPTOMAIL_HIRING_EMAIL || process.env.ZEPTOMAIL_FROM_EMAIL || 'noreply@tredevaastro.com',
        name: process.env.ZEPTOMAIL_HIRING_NAME || 'TredevaAstro Hiring Team',
      },
      notifications: {
        address: process.env.ZEPTOMAIL_NOTIFICATIONS_EMAIL || process.env.ZEPTOMAIL_FROM_EMAIL || 'noreply@tredevaastro.com',
        name: process.env.ZEPTOMAIL_NOTIFICATIONS_NAME || 'TredevaAstro Notifications',
      },
    },
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
