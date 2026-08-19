import type { Server, Socket } from 'socket.io';
import { bus } from './bus.ts';
import { getAstrologerByEmail, getAstrologerSyncSnapshot, getUserSyncSnapshot, listPublicAstrologers, touchActivity } from '../services/realtimeStore.ts';

function resyncAstrologer(io: Server, astrologerId: number) {
  const snapshot = getAstrologerSyncSnapshot(astrologerId);
  if (snapshot) io.to(astroRoom(astrologerId)).emit('sync:astrologer', snapshot);
}

interface HandshakeAuth {
  email?: string;
  role?: 'ASTROLOGIST' | 'USER' | 'ADMIN';
}

function astroRoom(id: number) {
  return `astro:${id}`;
}
function userRoom(email: string) {
  return `user:${email.toLowerCase()}`;
}
const PUBLIC_ROOM = 'public:astrologers';

export function attachSockets(io: Server) {
  io.on('connection', (socket: Socket) => {
    const auth = (socket.handshake.auth || {}) as HandshakeAuth;
    const email = auth.email?.toLowerCase();

    // Every client gets live public availability updates for astrologer cards.
    socket.join(PUBLIC_ROOM);
    socket.emit('sync:public', listPublicAstrologers());

    if (email) {
      socket.join(userRoom(email));

      if (auth.role === 'ASTROLOGIST') {
        const astro = getAstrologerByEmail(email);
        if (astro) {
          socket.join(astroRoom(astro.id));
          touchActivity(astro.id);
          // Reconnect recovery: re-send everything this client needs without
          // requiring a manual page refresh.
          socket.emit('sync:astrologer', getAstrologerSyncSnapshot(astro.id));
        }
      } else {
        socket.emit('sync:user', getUserSyncSnapshot(email));
      }
    }
  });

  // Forward the internal event bus onto the right Socket.IO rooms. This is
  // the only place that knows about transport — store.ts stays transport-agnostic.
  //
  // Every event that can change an astrologer's own status/intent/queue/
  // pending-assignments ALSO triggers a full resync to that astrologer's own
  // room (not just the public broadcast) — otherwise their dashboard's own
  // "am I online?" state goes stale the moment anything server-side changes
  // it (this is exactly the bug a manual click-through test caught: the
  // public card update and the astrologer's own dashboard state were two
  // different client-side slices, and only one of them was being kept fresh).
  bus.onTyped('astrologer:status', state => {
    io.to(PUBLIC_ROOM).emit('astrologer:status', state);
    resyncAstrologer(io, state.id);
  });
  bus.onTyped('astrologer:away', ({ astrologerId }) => { io.to(astroRoom(astrologerId)).emit('astrologer:away'); resyncAstrologer(io, astrologerId); });
  bus.onTyped('astrologer:idle-warning', ({ astrologerId }) => io.to(astroRoom(astrologerId)).emit('astrologer:idle-warning'));

  bus.onTyped('chat:assigned', c => { io.to(astroRoom(c.astrologerId)).emit('chat:assigned', c); resyncAstrologer(io, c.astrologerId); });
  bus.onTyped('chat:accepted', c => { io.to(astroRoom(c.astrologerId)).emit('chat:accepted', c); io.to(userRoom(c.userEmail)).emit('chat:accepted', c); resyncAstrologer(io, c.astrologerId); });
  bus.onTyped('chat:started', c => { io.to(astroRoom(c.astrologerId)).emit('chat:started', c); io.to(userRoom(c.userEmail)).emit('chat:started', c); });
  bus.onTyped('chat:declined', c => { io.to(userRoom(c.userEmail)).emit('chat:declined', c); resyncAstrologer(io, c.astrologerId); });
  bus.onTyped('chat:ended', c => { io.to(astroRoom(c.astrologerId)).emit('chat:ended', c); io.to(userRoom(c.userEmail)).emit('chat:ended', c); resyncAstrologer(io, c.astrologerId); });

  bus.onTyped('queue:position', ({ entry, position, eta }) => io.to(userRoom(entry.userEmail)).emit('queue:position', { position, eta }));
  bus.onTyped('queue:promoted', ({ entry, consultation }) => io.to(userRoom(entry.userEmail)).emit('queue:promoted', consultation));
  bus.onTyped('queue:expired', ({ entry, recommendations }) => io.to(userRoom(entry.userEmail)).emit('queue:expired', { recommendations }));

  bus.onTyped('notification:created', n => io.to(astroRoom(n.astrologerId)).emit('notification:created', n));
}
