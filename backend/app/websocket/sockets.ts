import type { Server, Socket } from 'socket.io';
import { bus } from './bus.ts';
import { getAstrologerByEmail, getAstrologerSyncSnapshot, getConsultation, getUserSyncSnapshot, listPublicAstrologers, touchActivity } from '../services/realtimeStore.ts';

async function resyncAstrologer(io: Server, astrologerId: number) {
  const snapshot = await getAstrologerSyncSnapshot(astrologerId);
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
    listPublicAstrologers().then(state => socket.emit('sync:public', state)).catch(console.error);

    if (email) {
      socket.join(userRoom(email));

      if (auth.role === 'ASTROLOGIST') {
        const astro = getAstrologerByEmail(email);
        if (astro) {
          socket.join(astroRoom(astro.id));
          touchActivity(astro.id).catch(console.error);
          // Reconnect recovery: re-send everything this client needs without
          // requiring a manual page refresh.
          getAstrologerSyncSnapshot(astro.id).then(snapshot => socket.emit('sync:astrologer', snapshot)).catch(console.error);
        }
      } else {
        getUserSyncSnapshot(email).then(snapshot => socket.emit('sync:user', snapshot)).catch(console.error);
      }
    }

    // WebRTC call signaling — a pure relay, no persistence: the two parties
    // in a consultation exchange SDP offers/answers and ICE candidates
    // directly over their existing socket connection rather than a REST
    // round trip, since none of this needs a database record (unlike chat
    // messages). getConsultation confirms `consultationId` is real before
    // forwarding, and `.except(socket.id)` keeps the sender from getting an
    // echo of its own signal back.
    (['call:offer', 'call:answer', 'call:ice-candidate', 'call:hangup'] as const).forEach(event => {
      socket.on(event, (data: { consultationId: string; payload?: unknown }) => {
        getConsultation(data.consultationId).then(consultation => {
          if (!consultation) return;
          io.to(astroRoom(consultation.astrologerId)).to(userRoom(consultation.userEmail)).except(socket.id).emit(event, data);
        }).catch(console.error);
      });
    });
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
    resyncAstrologer(io, state.id).catch(console.error);
  });
  bus.onTyped('astrologer:away', ({ astrologerId }) => { io.to(astroRoom(astrologerId)).emit('astrologer:away'); resyncAstrologer(io, astrologerId).catch(console.error); });
  bus.onTyped('astrologer:idle-warning', ({ astrologerId }) => io.to(astroRoom(astrologerId)).emit('astrologer:idle-warning'));

  bus.onTyped('chat:assigned', c => { io.to(astroRoom(c.astrologerId)).emit('chat:assigned', c); resyncAstrologer(io, c.astrologerId).catch(console.error); });
  bus.onTyped('chat:accepted', c => { io.to(astroRoom(c.astrologerId)).emit('chat:accepted', c); io.to(userRoom(c.userEmail)).emit('chat:accepted', c); resyncAstrologer(io, c.astrologerId).catch(console.error); });
  bus.onTyped('chat:started', c => { io.to(astroRoom(c.astrologerId)).emit('chat:started', c); io.to(userRoom(c.userEmail)).emit('chat:started', c); });
  bus.onTyped('chat:declined', c => { io.to(userRoom(c.userEmail)).emit('chat:declined', c); resyncAstrologer(io, c.astrologerId).catch(console.error); });
  bus.onTyped('chat:ended', c => { io.to(astroRoom(c.astrologerId)).emit('chat:ended', c); io.to(userRoom(c.userEmail)).emit('chat:ended', c); resyncAstrologer(io, c.astrologerId).catch(console.error); });

  bus.onTyped('queue:position', ({ entry, position, eta }) => io.to(userRoom(entry.userEmail)).emit('queue:position', { position, eta }));
  bus.onTyped('queue:promoted', ({ entry, consultation }) => io.to(userRoom(entry.userEmail)).emit('queue:promoted', consultation));
  bus.onTyped('queue:expired', ({ entry, recommendations }) => io.to(userRoom(entry.userEmail)).emit('queue:expired', { recommendations }));

  bus.onTyped('notification:created', n => io.to(astroRoom(n.astrologerId)).emit('notification:created', n));

  bus.onTyped('chat:message', message => {
    getConsultation(message.consultationId).then(consultation => {
      if (!consultation) return;
      io.to(astroRoom(consultation.astrologerId)).emit('chat:message', message);
      io.to(userRoom(consultation.userEmail)).emit('chat:message', message);
    }).catch(console.error);
  });

  // Time-boxed consultations: fired ~1 min before the chosen duration
  // (plus any top-ups) runs out, so the user's screen can offer to extend
  // before it auto-ends. 'chat:extended' clears that prompt on both sides
  // once someone actually adds time.
  bus.onTyped('chat:expiring-soon', payload => {
    getConsultation(payload.consultationId).then(consultation => {
      if (!consultation) return;
      io.to(astroRoom(consultation.astrologerId)).emit('chat:expiring-soon', payload);
      io.to(userRoom(consultation.userEmail)).emit('chat:expiring-soon', payload);
    }).catch(console.error);
  });
  bus.onTyped('chat:extended', c => {
    io.to(astroRoom(c.astrologerId)).emit('chat:extended', c);
    io.to(userRoom(c.userEmail)).emit('chat:extended', c);
  });
}
