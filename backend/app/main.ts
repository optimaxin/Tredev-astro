import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { runMigrations } from './core/db.ts';
import { seedDemoAccounts } from './core/seedDemoAccounts.ts';
import { seedAstrologerCatalog } from './core/seedAstrologerCatalog.ts';
import { seedContent } from './core/seedContent.ts';
import { router } from './api/routes.ts';
import { authRouter } from './api/auth.routes.ts';
import { astrologersCatalogRouter } from './api/astrologers.routes.ts';
import { chatRouter } from './api/chat.routes.ts';
import { calculatorsRouter } from './api/calculators.routes.ts';
import { favoritesRouter } from './api/favorites.routes.ts';
import { kundliHistoryRouter } from './api/kundliHistory.routes.ts';
import { ordersRouter } from './api/orders.routes.ts';
import { adminRouter } from './api/admin.routes.ts';
import { contentRouter } from './api/content.routes.ts';
import { attachSockets } from './websocket/sockets.ts';
import { rescheduleActiveConsultationTimers, runMaintenanceTick, seedRealtimeStore } from './services/realtimeStore.ts';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN;
// Vite bumps to the next free port (5174, 5175, 5176...) whenever a stale
// dev-server process is still holding an earlier one, which kept breaking
// CORS every time that happened — the old allowlist only covered exactly
// 5173/5174. In local dev (no CLIENT_ORIGIN configured), allow any
// localhost/127.0.0.1 origin regardless of port instead of hardcoding one.
// Once CLIENT_ORIGIN IS set (Render), origin stays locked to that exact one.
const corsOrigin: cors.CorsOptions['origin'] = CLIENT_ORIGIN
  ? CLIENT_ORIGIN
  : (origin, callback) => callback(null, !origin || /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));

// Order matters: tables must exist before anything seeds into them, and the
// catalog must be seeded before the realtime store reads it.
await runMigrations();
await seedDemoAccounts();
await seedAstrologerCatalog();
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
app.use(cors({ origin: corsOrigin }));
// Default 100kb is fine for everything except chat's IMAGE/AUDIO messages,
// which arrive as a base64 data URL (see chat.routes.ts's sendMessageSchema
// for the actual per-message size cap this just needs to fit under).
app.use(express.json({ limit: '8mb' }));
app.use('/api/auth', authRouter);
app.use('/api/astrologers', astrologersCatalogRouter);
app.use('/api/consultations', chatRouter);
app.use('/api/calculators', calculatorsRouter);
app.use('/api/favorites', favoritesRouter);
app.use('/api/kundli-history', kundliHistoryRouter);
app.use('/api/orders', ordersRouter);
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

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: corsOrigin } });
attachSockets(io);

// Auto-away + queue-timeout scan. This is the one place a naive setInterval
// polling loop is actually correct — it's server-side maintenance ticking
// against in-memory state, not a client polling the network. Push to
// clients still happens exclusively through the event bus → WebSocket path.
setInterval(() => { runMaintenanceTick().catch(console.error); }, 20_000);

httpServer.listen(PORT, () => {
  console.log(`[tredevastro-realtime] listening on http://localhost:${PORT}`);
});
