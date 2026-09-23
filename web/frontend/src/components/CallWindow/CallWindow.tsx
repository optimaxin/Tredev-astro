import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '../../realtime/RealtimeContext';
import { startRingbackTone, stopRingbackTone } from '../../realtime/sound';
import { API_URL } from '../../services/apiUrl';
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

// STUN alone only works when at least one side has a NAT that allows a
// direct/reflexive path — real users on separate networks routinely sit
// behind a NAT that doesn't, which is exactly "stuck on Connecting…
// forever" (ICE never completes, so pc.ontrack/onconnectionstatechange
// never fires). TURN credentials are minted per-call by the backend
// (backend/app/api/turn.routes.ts, backed by Cloudflare's TURN service)
// rather than a fixed secret baked into the bundle — falls back to
// STUN-only if that request fails or Cloudflare isn't configured.
async function fetchIceServers(): Promise<RTCIceServer[]> {
  const fallback: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];
  try {
    const token = localStorage.getItem('auth_access_token');
    const res = await fetch(`${API_URL}/api/turn/credentials`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    return Array.isArray(data.iceServers) ? data.iceServers : fallback;
  } catch {
    return fallback;
  }
}

type CallStatus = 'connecting' | 'connected' | 'ended' | 'error';

// Uploaded to backend/app/api/chat.routes.ts's POST /:id/recording as a raw
// binary body (see that route's own comment for why not JSON/base64) —
// staff-only playback and 10-day auto-delete both live server-side.
async function uploadRecording(consultationId: string, blob: Blob) {
  if (blob.size === 0) return;
  try {
    const token = localStorage.getItem('auth_access_token');
    await fetch(`${API_URL}/api/consultations/${consultationId}/recording`, {
      method: 'POST',
      headers: { 'Content-Type': blob.type || 'audio/webm', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: blob,
    });
  } catch (err) {
    // Best-effort — a failed recording upload must never surface as a call
    // failure to either party, it's a staff-side archival feature only.
    console.error('Failed to upload call recording:', err);
  }
}

// Voice-only WebRTC call, signaled over the existing realtime socket (see
// RealtimeContext's sendCallSignal/onCallSignal — a thin relay, no new REST
// endpoints). Video is a separate, later feature; this only ever requests
// a microphone. Ending the call here tears down the MEDIA connection only
// — the underlying consultation record's lifecycle (accept/end) is a
// separate, already-built concern (see endActiveConsultation).
export default function CallWindow({ consultationId, otherPartyName, isInitiator }: CallWindowProps) {
  const { sendCallSignal, onCallSignal, endConsultationById } = useRealtime();
  const [status, setStatus] = useState<CallStatus>('connecting');
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [seconds, setSeconds] = useState(0);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidateInit[]>([]);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  // Recording — only the initiator side records (see startRecording's own
  // comment for why one side capturing both tracks is enough).
  const audioCtxRef = useRef<AudioContext | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  // Mixes the local mic + the just-arrived remote track into one stream via
  // Web Audio, so the recording captures both sides of the conversation from
  // a single MediaRecorder. Only the initiator (by this app's fixed
  // user-always-initiates convention, see the isInitiator prop comment)
  // does this — WebRTC delivers both tracks to both peers once connected,
  // so recording on one side alone already has the full conversation;
  // recording on both would just produce two duplicate copies to store and
  // auto-delete for no benefit.
  function startRecording(localStream: MediaStream, remoteStream: MediaStream) {
    if (!isInitiator || recorderRef.current) return;
    try {
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      audioCtx.createMediaStreamSource(localStream).connect(dest);
      audioCtx.createMediaStreamSource(remoteStream).connect(dest);
      const recorder = new MediaRecorder(dest.stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.start();
      recorderRef.current = recorder;
    } catch (err) {
      // Best-effort — recording setup failure must never block the call itself.
      console.error('Failed to start call recording:', err);
    }
  }

  function stopRecordingAndUpload() {
    const recorder = recorderRef.current;
    if (!recorder) return;
    recorderRef.current = null;
    recorder.onstop = () => {
      const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
      recordedChunksRef.current = [];
      uploadRecording(consultationId, blob);
    };
    if (recorder.state !== 'inactive') recorder.stop();
    audioCtxRef.current?.close().catch(() => {});
    audioCtxRef.current = null;
  }

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      try {
        // Fetched in parallel with the mic prompt below — both are awaited
        // before the peer connection does anything signaling-related.
        const iceServersPromise = fetchIceServers();
        const streamPromise = navigator.mediaDevices.getUserMedia({ audio: true });
        const iceServers = await iceServersPromise;
        if (cancelled) return;
        const pc = new RTCPeerConnection({ iceServers });
        pcRef.current = pc;

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
          if (localStreamRef.current) startRecording(localStreamRef.current, e.streams[0]);
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') setStatus(s => (s === 'ended' ? s : 'error'));
        };

        // Acquire the mic and add the track BEFORE subscribing to signaling
        // (and before creating an offer). Getting this backwards was the
        // actual bug: the answerer's onCallSignal handler used to be live
        // the instant the component mounted, so an offer arriving while
        // getUserMedia was still pending (a permission prompt, a slow
        // device) got answered with no local track ever added — the
        // initiator would then get one-way or no audio, with nothing in
        // the UI indicating why. Now nothing touches signaling until the
        // local track actually exists.
        const stream = await streamPromise;
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); pc.close(); pcRef.current = null; return; }
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
              stopRecordingAndUpload();
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
      pcRef.current?.close();
      pcRef.current = null;
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      // Safety net for a call that ends by the component unmounting (tab
      // closed, network drop) rather than an explicit hangup — hangUp() and
      // the 'call:hangup' handler above already cover the normal paths, so
      // this is a no-op (recorderRef.current is already null) most of the time.
      stopRecordingAndUpload();
    };
  }, [consultationId, isInitiator, sendCallSignal, onCallSignal]);

  useEffect(() => {
    if (status !== 'connected') return;
    const id = window.setInterval(() => setSeconds(s => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [status]);

  // Ringback tone loops while the call is connecting, on BOTH sides — real
  // phone calls ring for the caller too, not just once picked up.
  useEffect(() => {
    if (status === 'connecting') startRingbackTone();
    else stopRingbackTone();
    return () => stopRingbackTone();
  }, [status]);

  const toggleMute = () => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach(t => { t.enabled = !next; });
    setMuted(next);
  };

  // "Speaker" here means whether you can hear the other person at all —
  // there's no separate earpiece/loudspeaker device to route between on a
  // typical desktop browser, and setSinkId() support is inconsistent
  // enough (no Firefox/Safari) that picking a specific output device isn't
  // reliable. Muting the remote <audio> element itself is the one thing
  // that always works everywhere.
  const toggleSpeaker = () => {
    if (remoteAudioRef.current) remoteAudioRef.current.muted = speakerOn;
    setSpeakerOn(!speakerOn);
  };

  const hangUp = () => {
    sendCallSignal('call:hangup', consultationId);
    setStatus('ended');
    stopRecordingAndUpload();
    // Hanging up the call ends the underlying consultation too — not just
    // the media connection. The other side doesn't need to also call this:
    // ending here fires chat:ended over the socket, which updates both
    // parties' state on its own (see RealtimeContext's listener).
    endConsultationById(consultationId).catch(console.error);
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
          <button className={`${styles.iconBtn} ${!speakerOn ? styles.iconBtnActive : ''}`} onClick={toggleSpeaker} title={speakerOn ? 'Mute speaker' : 'Unmute speaker'} type="button">
            {speakerOn ? '🔊' : '🔈'}
          </button>
          <button className={styles.hangupBtn} onClick={hangUp} title="End call" type="button">📞</button>
        </div>
      )}
    </div>
  );
}
