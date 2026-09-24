import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { chatService, ChatApiError } from '../../services/chatService';
import type { ChatMessage } from '../../services/chatService';
import styles from './ChatWindow.module.css';

interface ChatWindowProps {
  consultationId: string;
  otherPartyName: string;
  // Media upload is user-side only (spec) — the astrologer-side render
  // sites (Overview.tsx, ChatInbox.tsx) just don't pass this, so they never
  // get the attach button; the server enforces the same rule regardless.
  allowMediaUpload?: boolean;
}

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB raw, before base64 inflation

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function ChatWindow({ consultationId, otherPartyName, allowMediaUpload = false }: ChatWindowProps) {
  const { currentUser } = useAppContext();
  const { liveChatMessages } = useRealtime();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [recording, setRecording] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    chatService.listMessages(consultationId)
      .then(setMessages)
      .catch(err => setError(err instanceof ChatApiError ? err.message : 'Could not load chat history.'))
      .finally(() => setLoading(false));
  }, [consultationId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [consultationId]);

  // The input is disabled while a send is in flight (text, image, or voice
  // message), which blurs it — so it needs to be refocused the moment
  // sending finishes, or the user has to click back into it after every
  // single message. Keeping the cursor there is the whole point here.
  useEffect(() => {
    if (!sending) inputRef.current?.focus();
  }, [sending]);

  useEffect(() => {
    const fresh = liveChatMessages.filter(m => m.consultationId === consultationId);
    if (!fresh.length) return;
    setMessages(prev => {
      const known = new Set(prev.map(m => m.id));
      const toAdd = fresh.filter(m => !known.has(m.id));
      return toAdd.length ? [...prev, ...toAdd] : prev;
    });
  }, [liveChatMessages, consultationId]);

  // Scroll only the message list itself, never the page — scrollIntoView()
  // on a sentinel element can drag the whole document's scroll position
  // along with it, which is what was hijacking the page on every send.
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    setSending(true);
    setError('');
    try {
      const sent = await chatService.sendMessage(consultationId, content);
      setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
      setInput('');
    } catch (err) {
      setError(err instanceof ChatApiError ? err.message : 'Could not send your message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow picking the same file again later
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError('That image is too large — please pick one under 5MB.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const dataUrl = await readFileAsDataUrl(file);
      const sent = await chatService.sendMessage(consultationId, dataUrl, 'IMAGE');
      setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
    } catch (err) {
      setError(err instanceof ChatApiError ? err.message : 'Could not send that image. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const startRecording = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      recorder.ondataavailable = e => { if (e.data.size > 0) recordedChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size === 0) return;
        setSending(true);
        try {
          const dataUrl = await readFileAsDataUrl(new File([blob], 'voice-message', { type: blob.type }));
          const sent = await chatService.sendMessage(consultationId, dataUrl, 'AUDIO');
          setMessages(prev => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
        } catch (err) {
          setError(err instanceof ChatApiError ? err.message : 'Could not send your voice message. Please try again.');
        } finally {
          setSending(false);
        }
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
    } catch {
      setError('Microphone access is needed to record a voice message.');
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  useEffect(() => () => { recorderRef.current?.stop(); }, [consultationId]);

  return (
    <div className={styles.chatWindow}>
      <div className={styles.header}>
        <span className={styles.headerDot} aria-hidden="true" />
        Chat with {otherPartyName}
      </div>

      <div className={styles.messages} ref={messagesRef}>
        {loading ? (
          <p className={styles.empty}>Loading conversation…</p>
        ) : messages.length === 0 ? (
          <p className={styles.empty}>No messages yet — say hello!</p>
        ) : null}
        {messages.map(m => (
          <div key={m.id} className={`${styles.message} ${m.senderEmail.toLowerCase() === currentUser?.email.toLowerCase() ? styles.own : styles.other}`}>
            {m.messageType === 'IMAGE' ? (
              <img src={m.content} alt="Shared image" className={styles.imageBubble} onClick={() => window.open(m.content, '_blank')} />
            ) : m.messageType === 'AUDIO' ? (
              <audio controls src={m.content} className={styles.audioBubble} />
            ) : (
              <div className={styles.bubble}>{m.content}</div>
            )}
            <div className={styles.time}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        {allowMediaUpload && (
          <>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileChange} disabled={sending} />
            <button type="button" className={styles.iconBtn} title="Send an image" disabled={sending} onClick={() => fileInputRef.current?.click()}>
              📎
            </button>
          </>
        )}
        <button
          type="button"
          className={`${styles.iconBtn} ${recording ? styles.iconBtnRecording : ''}`}
          title={recording ? 'Stop recording' : 'Record a voice message'}
          disabled={sending && !recording}
          onClick={recording ? stopRecording : startRecording}
        >
          {recording ? '⏹️' : '🎤'}
        </button>
        <input
          ref={inputRef}
          type="text"
          className={styles.input}
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="btn btn-gold btn-sm" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
