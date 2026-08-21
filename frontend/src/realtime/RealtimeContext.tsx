import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppContext } from '../context/AppContext';
import { realtimeApi, SERVER_URL } from './api';
import { playNotificationChime } from './sound';
import type {
  AstrologerNotification, AstrologerSyncSnapshot, ConsultationType, PublicAstrologerState,
  RecommendedAstrologer, RequestResult, UserSyncSnapshot,
} from './types';
import type { ChatMessage } from '../services/chatService';

interface NotifPrefs {
  onboarded: boolean;
  sound: boolean;
  browser: boolean;
}

function loadNotifPrefs(): NotifPrefs {
  try {
    const raw = localStorage.getItem('astro_realtime_notif_prefs');
    return raw ? JSON.parse(raw) : { onboarded: false, sound: false, browser: false };
  } catch {
    return { onboarded: false, sound: false, browser: false };
  }
}

export interface Toast {
  id: string;
  message: string;
  tone: 'info' | 'success' | 'warning';
}

interface RealtimeContextValue {
  connected: boolean;
  publicStates: Record<number, PublicAstrologerState>;

  // Astrologer side
  astrologerSync: AstrologerSyncSnapshot | null;
  goOnline: () => Promise<void>;
  goOffline: () => Promise<void>;
  acceptAssignment: (id: string) => Promise<void>;
  declineAssignment: (id: string) => Promise<void>;
  endActiveConsultation: () => Promise<void>;
  markNotifRead: (id: string) => Promise<void>;
  markAllNotifsRead: () => Promise<void>;
  idleWarning: boolean;
  stayOnline: () => Promise<void>;
  notifPrefs: NotifPrefs;
  completeOnboarding: (sound: boolean, browser: boolean) => Promise<void>;

  // User side
  userSync: UserSyncSnapshot | null;
  requestConsultation: (astrologerId: number, category: string, type: ConsultationType) => Promise<RequestResult>;
  cancelMyQueueEntry: () => Promise<void>;
  recommendations: RecommendedAstrologer[] | null;
  queueExpired: boolean;
  clearQueueExpired: () => void;

  toasts: Toast[];
  dismissToast: (id: string) => void;

  // Live chat — messages arrive here the instant either party sends one;
  // ChatWindow merges these into the history it loaded via chatService.
  liveChatMessages: ChatMessage[];
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

export function useRealtime() {
  const ctx = useContext(RealtimeContext);
  if (!ctx) throw new Error('useRealtime must be used within RealtimeProvider');
  return ctx;
}

export function RealtimeProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAppContext();
  const socketRef = useRef<Socket | null>(null);
  const seenNotificationIds = useRef(new Set<string>());

  const [connected, setConnected] = useState(false);
  const [publicStates, setPublicStates] = useState<Record<number, PublicAstrologerState>>({});
  const [astrologerSync, setAstrologerSync] = useState<AstrologerSyncSnapshot | null>(null);
  const [userSync, setUserSync] = useState<UserSyncSnapshot | null>(null);
  const [idleWarning, setIdleWarning] = useState(false);
  const [recommendations, setRecommendations] = useState<RecommendedAstrologer[] | null>(null);
  const [queueExpired, setQueueExpired] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [liveChatMessages, setLiveChatMessages] = useState<ChatMessage[]>([]);
  const [notifPrefs, setNotifPrefsState] = useState<NotifPrefs>(() => loadNotifPrefs());
  const notifPrefsRef = useRef(notifPrefs);
  useEffect(() => { notifPrefsRef.current = notifPrefs; }, [notifPrefs]);

  const pushToast = useCallback((message: string, tone: Toast['tone'] = 'info') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000);
  }, []);

  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const notifyAstrologer = useCallback((n: AstrologerNotification) => {
    if (seenNotificationIds.current.has(n.id)) return; // idempotent — never re-alert for an event we've already shown
    seenNotificationIds.current.add(n.id);
    pushToast(n.message, n.kind === 'chat_request' ? 'success' : 'info');
    if (notifPrefsRef.current.sound) playNotificationChime();
    if (notifPrefsRef.current.browser && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('TredevAstro', { body: n.message });
    }
  }, [pushToast]);

  useEffect(() => {
    if (!currentUser) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      setAstrologerSync(null);
      setUserSync(null);
      return;
    }

    const socket = io(SERVER_URL, { auth: { email: currentUser.email, role: currentUser.role }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('sync:public', (states: PublicAstrologerState[]) => {
      setPublicStates(Object.fromEntries(states.map(s => [s.id, s])));
    });
    socket.on('astrologer:status', (state: PublicAstrologerState) => {
      setPublicStates(prev => ({ ...prev, [state.id]: state }));
    });

    // Reconnect recovery: the server resends a full snapshot on every
    // connection (including reconnects) — no manual refresh required.
    socket.on('sync:astrologer', (snapshot: AstrologerSyncSnapshot) => {
      setAstrologerSync(snapshot);
      snapshot.notifications.forEach(n => seenNotificationIds.current.add(n.id));
    });
    socket.on('sync:user', (snapshot: UserSyncSnapshot) => setUserSync(snapshot));

    socket.on('chat:assigned', (consultation) => {
      setAstrologerSync(prev => prev ? { ...prev, pendingAssignments: [...prev.pendingAssignments.filter(p => p.id !== consultation.id), consultation] } : prev);
    });
    socket.on('chat:accepted', (consultation) => {
      setAstrologerSync(prev => prev ? { ...prev, activeConsultation: consultation, pendingAssignments: prev.pendingAssignments.filter(p => p.id !== consultation.id) } : prev);
      setUserSync(prev => prev ? { ...prev, consultation } : prev);
    });
    socket.on('chat:declined', (consultation) => {
      setUserSync(prev => prev ? { ...prev, consultation } : prev);
      pushToast('Your consultation request was declined.', 'warning');
    });
    socket.on('chat:ended', (consultation) => {
      setAstrologerSync(prev => prev ? { ...prev, activeConsultation: prev.activeConsultation?.id === consultation.id ? null : prev.activeConsultation } : prev);
      setUserSync(prev => prev ? { ...prev, consultation } : prev);
    });

    socket.on('queue:position', ({ position, eta }: { position: number; eta: { minMinutes: number; maxMinutes: number } }) => {
      setUserSync(prev => prev ? { ...prev, position, eta } : prev);
    });
    socket.on('queue:promoted', (consultation) => {
      setUserSync({ consultation, queueEntry: null, position: null, eta: null });
      pushToast('An astrologer is ready for you now.', 'success');
    });
    socket.on('queue:expired', ({ recommendations: recs }: { recommendations: RecommendedAstrologer[] }) => {
      setQueueExpired(true);
      setRecommendations(recs);
    });

    socket.on('notification:created', (n: AstrologerNotification) => {
      setAstrologerSync(prev => prev ? { ...prev, notifications: [n, ...prev.notifications.filter(x => x.id !== n.id)] } : prev);
      notifyAstrologer(n);
    });

    socket.on('astrologer:away', () => setIdleWarning(false));
    socket.on('astrologer:idle-warning', () => setIdleWarning(true));

    socket.on('chat:message', (message: ChatMessage) => {
      setLiveChatMessages(prev => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [currentUser?.email, currentUser?.role, notifyAstrologer, pushToast]);

  const goOnline = useCallback(async () => {
    if (!currentUser) return;
    await realtimeApi.setAvailability(currentUser.email, 'ONLINE');
  }, [currentUser]);

  const goOffline = useCallback(async () => {
    if (!currentUser) return;
    await realtimeApi.setAvailability(currentUser.email, 'OFFLINE');
  }, [currentUser]);

  const acceptAssignment = useCallback(async (id: string) => {
    if (!currentUser) return;
    await realtimeApi.acceptConsultation(id, currentUser.email);
  }, [currentUser]);

  const declineAssignment = useCallback(async (id: string) => {
    if (!currentUser) return;
    await realtimeApi.declineConsultation(id, currentUser.email);
    setAstrologerSync(prev => prev ? { ...prev, pendingAssignments: prev.pendingAssignments.filter(p => p.id !== id) } : prev);
  }, [currentUser]);

  const endActiveConsultation = useCallback(async () => {
    if (!currentUser || !astrologerSync?.activeConsultation) return;
    await realtimeApi.endConsultation(astrologerSync.activeConsultation.id, currentUser.email);
  }, [currentUser, astrologerSync]);

  const markNotifRead = useCallback(async (id: string) => {
    if (!currentUser) return;
    setAstrologerSync(prev => prev ? { ...prev, notifications: prev.notifications.map(n => n.id === id ? { ...n, read: true } : n) } : prev);
    await realtimeApi.markNotificationRead(id, currentUser.email);
  }, [currentUser]);

  const markAllNotifsRead = useCallback(async () => {
    if (!currentUser) return;
    setAstrologerSync(prev => prev ? { ...prev, notifications: prev.notifications.map(n => ({ ...n, read: true })) } : prev);
    await realtimeApi.markAllNotificationsRead(currentUser.email);
  }, [currentUser]);

  const stayOnline = useCallback(async () => {
    if (!currentUser) return;
    setIdleWarning(false);
    await realtimeApi.heartbeat(currentUser.email);
  }, [currentUser]);

  const completeOnboarding = useCallback(async (sound: boolean, browser: boolean) => {
    if (browser && 'Notification' in window && Notification.permission === 'default') {
      try { await Notification.requestPermission(); } catch { /* ignored — visual notifications still work */ }
    }
    const next: NotifPrefs = { onboarded: true, sound, browser: browser && 'Notification' in window && Notification.permission === 'granted' };
    setNotifPrefsState(next);
    localStorage.setItem('astro_realtime_notif_prefs', JSON.stringify(next));
  }, []);

  const requestConsultation = useCallback(async (astrologerId: number, category: string, type: ConsultationType) => {
    if (!currentUser) throw new Error('Not logged in');
    const requestId = `req-${currentUser.email}-${astrologerId}-${Date.now()}`;
    const result = await realtimeApi.requestConsultation({ requestId, astrologerId, userEmail: currentUser.email, userName: currentUser.name, category, type });
    setQueueExpired(false);
    if (result.outcome === 'QUEUED') {
      setUserSync({ consultation: null, queueEntry: result.entry, position: result.position, eta: result.eta });
      const recs = await realtimeApi.recommendations(astrologerId, category).catch(() => null);
      setRecommendations(recs?.astrologers || []);
    } else if (result.outcome === 'ASSIGNED') {
      setUserSync({ consultation: result.consultation, queueEntry: null, position: null, eta: null });
    }
    return result;
  }, [currentUser]);

  const cancelMyQueueEntry = useCallback(async () => {
    if (!currentUser || !userSync?.queueEntry) return;
    await realtimeApi.cancelQueueEntry(userSync.queueEntry.id, currentUser.email);
    setUserSync(prev => prev ? { ...prev, queueEntry: null, position: null, eta: null } : prev);
  }, [currentUser, userSync]);

  const clearQueueExpired = useCallback(() => setQueueExpired(false), []);

  return (
    <RealtimeContext.Provider value={{
      connected, publicStates,
      astrologerSync, goOnline, goOffline, acceptAssignment, declineAssignment, endActiveConsultation,
      markNotifRead, markAllNotifsRead, idleWarning, stayOnline, notifPrefs, completeOnboarding,
      userSync, requestConsultation, cancelMyQueueEntry, recommendations, queueExpired, clearQueueExpired,
      toasts, dismissToast, liveChatMessages,
    }}>
      {children}
    </RealtimeContext.Provider>
  );
}
