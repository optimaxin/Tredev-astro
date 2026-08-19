import { EventEmitter } from 'node:events';
import type {
  AstrologerNotification, Consultation, EtaEstimate, PublicAstrologerState, QueueEntry,
} from '../models/types.ts';
import type { ChatMessage } from '../models/chatMessage.ts';

// Business logic (store.ts) never talks to Socket.IO directly — it publishes
// on this bus, and sockets.ts subscribes and forwards to the right rooms.
// This keeps the state machine testable/pure and the transport swappable.

export interface QueuePositionPayload {
  entry: QueueEntry;
  position: number;
  eta: EtaEstimate;
}

interface BusEvents {
  'astrologer:status': [PublicAstrologerState];
  'chat:assigned': [Consultation];
  'chat:accepted': [Consultation];
  'chat:started': [Consultation];
  'chat:declined': [Consultation];
  'chat:ended': [Consultation];
  'queue:position': [QueuePositionPayload];
  'queue:promoted': [{ entry: QueueEntry; consultation: Consultation }];
  'queue:expired': [{ entry: QueueEntry; recommendations: unknown[] }];
  'notification:created': [AstrologerNotification];
  'astrologer:away': [{ astrologerId: number }];
  'astrologer:idle-warning': [{ astrologerId: number }];
  'chat:message': [ChatMessage];
}

class TypedBus extends EventEmitter {
  emitTyped<K extends keyof BusEvents>(event: K, ...args: BusEvents[K]) {
    this.emit(event, ...args);
  }
  onTyped<K extends keyof BusEvents>(event: K, listener: (...args: BusEvents[K]) => void) {
    this.on(event, listener as (...args: unknown[]) => void);
  }
}

export const bus = new TypedBus();
bus.setMaxListeners(50);
