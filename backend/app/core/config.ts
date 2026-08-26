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
    // Genuinely optional (unlike jwt's secrets above) — geocoding.ts falls
    // back to the free Nominatim provider when this isn't set, so local dev
    // never needs an AWS account. Set both in backend/.env (local) and in
    // Render's dashboard env vars (production) — never commit real values.
    locationApiKey: process.env.AWS_LOCATION_API_KEY,
    locationRegion: process.env.AWS_LOCATION_REGION || 'us-east-1',
  },
};
