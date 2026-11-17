import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';
import { runMigrations } from './core/db.ts';
import { seedDemoAccounts } from './core/seedDemoAccounts.ts';
import { seedContent } from './core/seedContent.ts';
import { router } from './api/routes.ts';
import { authRouter } from './api/auth.routes.ts';
import { astrologersCatalogRouter } from './api/astrologers.routes.ts';
import { chatRouter } from './api/chat.routes.ts';
import { calculatorsRouter } from './api/calculators.routes.ts';
// kundliPdfRouter (Chromium/Playwright PDF generation) is paused — not even
// imported, so the playwright module never loads into this process. See
// docs/chromium-pdf-pause.md to re-enable.
import { favoritesRouter } from './api/favorites.routes.ts';
import { kundliHistoryRouter } from './api/kundliHistory.routes.ts';
import { premiumReportsRouter } from './api/premiumReports.routes.ts';
import { ordersRouter } from './api/orders.routes.ts';
import { adminRouter } from './api/admin.routes.ts';
import { campaignAnalyticsRouter } from './api/campaignAnalytics.routes.ts';
import { contentRouter } from './api/content.routes.ts';
import { paymentsRouter } from './api/payments.routes.ts';
import { turnRouter } from './api/turn.routes.ts';
import { config } from './core/config.ts';
import { attachSockets } from './websocket/sockets.ts';
import { rescheduleActiveConsultationTimers, runMaintenanceTick, seedRealtimeStore } from './services/realtimeStore.ts';
import { deleteExpiredCallRecordings } from './repositories/callRecordingRepository.ts';
import { deleteExpiredBanners } from './repositories/bannerRepository.ts';

const PORT = Number(process.env.PORT) || 4000;
// Comma-separated so the main site and the separately-deployed Ganesh
// Chaturthi campaign app (its own domain) can both be allowlisted, e.g.
// CLIENT_ORIGIN="https://tredevaastro.com,https://ganesh.tredevaastro.com".
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || '').split(',').map(o => o.trim()).filter(Boolean);
// Vite bumps to the next free port (5174, 5175, 5176...) whenever a stale
// dev-server process is still holding an earlier one, which kept breaking
// CORS every time that happened — the old allowlist only covered exactly
// 5173/5174. In local dev (no CLIENT_ORIGIN configured), allow any
// localhost/127.0.0.1 origin regardless of port instead of hardcoding one.
// Once CLIENT_ORIGIN IS set (Render), origin stays locked to that allowlist.
const corsOrigin: cors.CorsOptions['origin'] = CLIENT_ORIGINS.length
  ? (origin, callback) => callback(null, !origin || CLIENT_ORIGINS.includes(origin))
  : (origin, callback) => callback(null, !origin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));

// Order matters: tables must exist before anything seeds into them, and the
// catalog must be seeded before the realtime store reads it.
await runMigrations();
// Dev/demo only (see seedDemoAccounts.ts) — a production database should
// only ever have real accounts, created through the real signup/apply flow.
if (config.nodeEnv !== 'production') await seedDemoAccounts();
await seedContent();
await seedRealtimeStore();
await rescheduleActiveConsultationTimers();

const app = express();
// Needed for req.ip to reflect the real visitor IP (via X-Forwarded-For)
// when this runs behind a reverse proxy/load balancer, rather than always
// resolving to the proxy's own address — geoLocation.ts's region-pricing
// lookup depends on this being accurate. `1` trusts exactly one hop, the
// typical single-proxy deployment shape; adjust if this ever sits behind
// more than one proxy layer.
app.set('trust proxy', 1);
// Security headers (HSTS, nosniff, frame-deny, a strict CSP, ...). This
// server returns JSON everywhere except the one campaign-analytics page,
// which gets its own relaxed CSP below.
// CORP relaxed: the frontend lives on another origin and embeds some
// responses directly (e.g. call-recording audio), which same-origin would block.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: corsOrigin }));
// Default 100kb is fine for everything except chat's IMAGE/AUDIO messages,
// admin banner uploads, and the astrologer/pandit application's resume
// upload, which all arrive as a base64 data URL (see chat.routes.ts's
// sendMessageSchema / admin banners / astrologers.routes.ts's applicationSchema
// for the real per-item caps this just needs to fit under) — only those
// prefixes get 8mb. body-parser skips a body that's already been parsed, so
// the path-scoped parsers win and the global one below covers everything else.
// `verify` stashes the exact raw bytes on req.rawBody — payments.routes.ts's
// webhook needs those (not the re-serialized req.body) to check Cashfree's
// HMAC signature, since JSON.stringify(parsed) is not guaranteed byte-for-byte
// identical to what Cashfree actually sent and signed.
const keepRawBody = (req: express.Request, _res: unknown, buf: Buffer) => { (req as express.Request & { rawBody?: Buffer }).rawBody = buf; };
app.use(['/api/consultations', '/api/admin', '/api/astrologers/applications'], express.json({ limit: '8mb', verify: keepRawBody }));
app.use(express.json({ limit: '100kb', verify: keepRawBody }));
app.use('/api/auth', authRouter);
app.use('/api/astrologers', astrologersCatalogRouter);
app.use('/api/consultations', chatRouter);
app.use('/api/calculators', calculatorsRouter);
// app.use('/api/kundli-pdf', kundliPdfRouter); — paused, see docs/chromium-pdf-pause.md
app.use('/api/favorites', favoritesRouter);
app.use('/api/kundli-history', kundliHistoryRouter);
app.use('/api/premium-reports', premiumReportsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/turn', turnRouter);
app.use('/api/campaign-analytics', campaignAnalyticsRouter);
// The dashboard itself — a single static page (see public/campaign-analytics.html)
// rather than a whole separate app, since it's just a password-gated view
// over the /api/campaign-analytics/summary endpoint above.
app.get('/campaign-analytics', (_req, res) => {
  // The page is a single file with an inline <script>/<style>.
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'");
  res.sendFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'campaign-analytics.html'));
});
app.use('/api', contentRouter);
// `router` (legacy mock-trust realtime routes, including the unauthenticated
// /admin/config and /admin/astrologers/:id/max-concurrent) MUST be mounted
// before `adminRouter` — both live under /api/admin, and adminRouter applies
// blanket requireAuth+requireRole('ADMIN') that would otherwise reject those
// legacy calls (which send no bearer token) before they ever reach their
// real handler. Express tries routers in registration order and only falls
// through to the next one when nothing in the current router matches.
app.use('/api', router);
app.use('/api/admin', adminRouter);
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Last-resort error handler: full detail to the server log only, a generic
// message to the client — never a stack trace, SQL error or file path.
// Keeps 4xx statuses body-parser sets (e.g. 413 payload too large).
app.use((err: Error & { status?: number }, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const status = err.status && err.status >= 400 && err.status < 500 ? err.status : 500;
  if (status === 500) console.error('[ERROR]', { message: err.message, stack: err.stack, url: req.originalUrl });
  if (res.headersSent) return;
  res.status(status).json({ success: false, error: { code: status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST', message: status === 500 ? 'Something went wrong. Please try again.' : 'Invalid request' } });
});

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: corsOrigin } });
attachSockets(io);

// Auto-away + queue-timeout scan. This is the one place a naive setInterval
// polling loop is actually correct — it's server-side maintenance ticking
// against in-memory state, not a client polling the network. Push to
// clients still happens exclusively through the event bus → WebSocket path.
setInterval(() => { runMaintenanceTick().catch(console.error); }, 20_000);

// Enforces call-recordings' 10-day retention (see callRecordingRepository.ts)
// by actually deleting expired rows. Hourly is plenty for a day-granularity
// retention window — no need for the 20s cadence above.
setInterval(() => { deleteExpiredCallRecordings(Date.now()).catch(console.error); }, 60 * 60_000);

// Enforces a banner's expiry timer (see bannerRepository.ts) — a NULL
// expires_at ("never") is never touched here, only rows past a real date.
setInterval(() => { deleteExpiredBanners(Date.now()).catch(console.error); }, 60 * 60_000);

httpServer.listen(PORT, () => {
  console.log(`[tredevastro-realtime] listening on http://localhost:${PORT}`);
  // Loud, non-fatal — Cashfree is only used lazily (first checkout attempt),
  // so a missing key would otherwise surface as a confusing 502 minutes later
  // instead of right here at boot. `tsx watch` restarts on source-file
  // changes but does NOT re-read backend/.env on its own — editing .env
  // requires a manual restart of `npm run dev` for a new key to take effect.
  if (!config.cashfree.appId || !config.cashfree.secretKey) {
    console.warn('[payments] CASHFREE_APP_ID/CASHFREE_SECRET_KEY not set — checkout will fail until backend/.env has both and the server is restarted.');
  }
});
