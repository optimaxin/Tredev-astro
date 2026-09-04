import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '../../realtime/RealtimeContext';
import styles from './CallWindow.module.css';

interface CallWindowProps {
  consultationId: string;
  otherPartyName: string;
  // The user side always creates the WebRTC offer, the astrologer side
  // always answers — a fixed convention avoids both sides racing to create
  // an offer at once. Passed in by the caller (PageRenderer vs. the
  // astrologer dashboard), not derived here, since each side already knows
  // which one it is.
  isInitiator: boolean;
}

const ICE_SERVERS: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

type CallStatus = 'connecting' | 'connected' | 'ended' | 'error';

// Voice-only WebRTC call, signaled over the existing realtime socket (see
// RealtimeContext's sendCallSignal/onCallSignal — a thin relay, no new REST
// endpoints). Video is a separate, later feature; this only ever requests
// a microphone. Ending the call here tears down the MEDIA connection only
// — the underlying consultation record's lifecycle (accept/end) is a
// separate, already-built concern (see endActiveConsultation).
export default function CallWindow({ consultationId, otherPartyName, isInitiator }: CallWindowProps) {
  const { sendCallSignal, onCallSignal } = useRealtime();
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [muted, setMuted] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const flushPendingCandidates = async () => {
      const queued = pendingCandidatesRef.current.splice(0);
      for (const c of queued) {
        try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (err) { console.error('Failed to add queued ICE candidate:', err); }
      }
    };

    pc.onicecandidate = e => {
      if (e.candidate) sendCallSignal('call:ice-candidate', consultationId, e.candidate.toJSON());
    };
    pc.ontrack = e => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
      setStatus('connected');
    };
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') setStatus(s => (s === 'ended' ? s : 'error'));
    };

    (async () => {
      try {
        // Acquire the mic and add the track BEFORE subscribing to signaling
        // (and before creating an offer). Getting this backwards was the
        // actual bug: the answerer's onCallSignal handler used to be live
        // the instant the component mounted, so an offer arriving while
        // getUserMedia was still pending (a permission prompt, a slow
        // device) got answered with no local track ever added — the
        // initiator would then get one-way or no audio, with nothing in
        // the UI indicating why. Now nothing touches signaling until the
        // local track actually exists.
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        unsubscribe = onCallSignal(async (event, id, payload) => {
          if (id !== consultationId || cancelled) return;
          try {
            if (event === 'call:offer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
              await flushPendingCandidates();
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              sendCallSignal('call:answer', consultationId, answer);
            } else if (event === 'call:answer') {
              await pc.setRemoteDescription(new RTCSessionDescription(payload as RTCSessionDescriptionInit));
              await flushPendingCandidates();
            } else if (event === 'call:ice-candidate') {
              const candidate = payload as RTCIceCandidateInit;
              // ICE candidates can (and often do) arrive before the remote
              // description is set — queue them and flush once it is,
              // rather than dropping/erroring on addIceCandidate.
              if (pc.remoteDescription) await pc.addIceCandidate(new RTCIceCandidate(candidate));
              else pendingCandidatesRef.current.push(candidate);
            } else if (event === 'call:hangup') {
              setStatus('ended');
              pc.close();
              localStreamRef.current?.getTracks().forEach(t => t.stop());
            }
          } catch (err) {
            console.error('Call signaling error:', err);
          }
        });

        if (isInitiator) {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          sendCallSignal('call:offer', consultationId, offer);
        }
      } catch (err) {
        console.error('Microphone access failed:', err);
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
      pc.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [consultationId, isInitiator, sendCallSignal, onCallSignal]);

  useEffect(() => {
    if (status !== 'connected') return;
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
  };

  const hangUp = () => {
    sendCallSignal('call:hangup', consultationId);
    setStatus('ended');
  };

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  const live = status !== 'ended' && status !== 'error';

  return (
    <div className={styles.callWindow}>
      <audio ref={remoteAudioRef} autoPlay />
      <div className={`${styles.avatar} ${status === 'connected' ? styles.avatarLive : ''}`}>
        {otherPartyName.charAt(0).toUpperCase()}
      </div>
      <div className={styles.name}>{otherPartyName}</div>
      <div className={styles.status}>
        {status === 'connecting' && 'Connecting…'}
        {status === 'connected' && `${mm}:${ss}`}
        {status === 'ended' && 'Call ended'}
        {status === 'error' && 'Call failed — check your microphone permission and try again'}
      </div>
      {live && (
        <div className={styles.controls}>
          <button className={`${styles.iconBtn} ${muted ? styles.iconBtnActive : ''}`} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'} type="button">
            {muted ? '🔇' : '🎙️'}
          </button>
          <button className={styles.hangupBtn} onClick={hangUp} title="End call" type="button">📞</button>
        </div>
      )}
    </div>
  );
}
