import { useEffect, useRef, useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { chatService, ChatApiError } from '../../services/chatService';
import type { ChatMessage } from '../../services/chatService';
import styles from './ChatWindow.module.css';

interface ChatWindowProps {
  consultationId: string;
  otherPartyName: string;
}

export default function ChatWindow({ consultationId, otherPartyName }: ChatWindowProps) {
  const { currentUser } = useAppContext();
  const { liveChatMessages } = useRealtime();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const messagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    chatService.listMessages(consultationId)
      .then(setMessages)
      .catch(err => setError(err instanceof ChatApiError ? err.message : 'Could not load chat history.'));
  }, [consultationId]);

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

  return (
    <div className={styles.chatWindow}>
      <div className={styles.header}>Chat with {otherPartyName}</div>

      <div className={styles.messages} ref={messagesRef}>
        {messages.length === 0 && <p className={styles.empty}>No messages yet — say hello!</p>}
        {messages.map(m => (
          <div key={m.id} className={`${styles.message} ${m.senderEmail.toLowerCase() === currentUser?.email.toLowerCase() ? styles.own : styles.other}`}>
            <div className={styles.bubble}>{m.content}</div>
            <div className={styles.time}>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
          </div>
        ))}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <form className={styles.inputRow} onSubmit={handleSubmit}>
        <input
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
