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
import { adminRouter } from './api/admin.routes.ts';
import { contentRouter } from './api/content.routes.ts';
import { attachSockets } from './websocket/sockets.ts';
import { runMaintenanceTick, seedRealtimeStore } from './services/realtimeStore.ts';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

// Order matters: tables must exist before anything seeds into them, and the
// catalog must be seeded before the realtime store reads it.
await runMigrations();
await seedDemoAccounts();
await seedAstrologerCatalog();
await seedContent();
await seedRealtimeStore();

const app = express();
app.use(cors({ origin: [CLIENT_ORIGIN, 'http://localhost:5174'] }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/astrologers', astrologersCatalogRouter);
app.use('/api/consultations', chatRouter);
app.use('/api/calculators', calculatorsRouter);
app.use('/api/favorites', favoritesRouter);
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
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: [CLIENT_ORIGIN, 'http://localhost:5174'] } });
attachSockets(io);

// Auto-away + queue-timeout scan. This is the one place a naive setInterval
// polling loop is actually correct — it's server-side maintenance ticking
// against in-memory state, not a client polling the network. Push to
// clients still happens exclusively through the event bus → WebSocket path.
setInterval(() => { runMaintenanceTick().catch(console.error); }, 20_000);

httpServer.listen(PORT, () => {
  console.log(`[tredevastro-realtime] listening on http://localhost:${PORT}`);
});
