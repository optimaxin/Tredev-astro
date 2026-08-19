import cors from 'cors';
import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { runMigrations } from './core/db.ts';
import { seedDemoAccounts } from './core/seedDemoAccounts.ts';
import { router } from './api/routes.ts';
import { authRouter } from './api/auth.routes.ts';
import { attachSockets } from './websocket/sockets.ts';
import { runMaintenanceTick } from './services/realtimeStore.ts';

const PORT = Number(process.env.PORT) || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

runMigrations();
seedDemoAccounts();

const app = express();
app.use(cors({ origin: [CLIENT_ORIGIN, 'http://localhost:5174'] }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api', router);
app.get('/health', (_req, res) => res.json({ ok: true }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: [CLIENT_ORIGIN, 'http://localhost:5174'] } });
attachSockets(io);

// Auto-away + queue-timeout scan. This is the one place a naive setInterval
// polling loop is actually correct — it's server-side maintenance ticking
// against in-memory state, not a client polling the network. Push to
// clients still happens exclusively through the event bus → WebSocket path.
setInterval(() => runMaintenanceTick(), 20_000);

httpServer.listen(PORT, () => {
  console.log(`[tredevastro-realtime] listening on http://localhost:${PORT}`);
});
