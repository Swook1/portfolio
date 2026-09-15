import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, stagger } from 'animejs';
import { prefersReducedMotion } from '../../hooks/useAnimeScope';
import { bot, quickReplies } from '../../data/chat';
import { useChat } from '../../hooks/useChat';
import ChatMessage from './ChatMessage';
import TypingDots from './TypingDots';
import BotAvatar from './BotAvatar';
import ChatComposer from './ChatComposer';

/**
 * The conversation surface. Mounted only while open, so the entry animation
 * and the greeting both replay on each open, and the transcript resets with
 * the widget rather than lingering invisibly.
 */
export default function ChatPanel({ onClose }) {
  const { messages, pending, error, send, reset } = useChat();
  const panel = useRef(null);
  const log = useRef(null);
  const lastCount = useRef(messages.length);

  // Entry: the panel grows from the launcher's corner, so the transform origin
  // sits bottom-right rather than centre.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    animate(panel.current, {
      opacity: [0, 1],
      scale: [0.9, 1],
      y: [16, 0],
      duration: 380,
      ease: 'out(4)',
    });
  }, []);

  // Escape closes, matching the certificate modal.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Pin to the bottom as the transcript grows. Layout effect so the jump lands
  // in the same frame the bubble paints, never as a visible scroll.
  useLayoutEffect(() => {
    const el = log.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, pending]);

  // Animate only bubbles that are new this render.
  useEffect(() => {
    if (prefersReducedMotion()) {
      lastCount.current = messages.length;
      return;
    }
    const added = messages.length - lastCount.current;
    lastCount.current = messages.length;
    if (added <= 0) return;

    const rows = log.current?.querySelectorAll('.chat-row');
    if (!rows?.length) return;
    animate(Array.from(rows).slice(-added), {
      opacity: [0, 1],
      y: [10, 0],
      duration: 320,
      delay: stagger(60),
      ease: 'out(3)',
    });
  }, [messages]);

  const showQuickReplies = messages.length === 1 && !pending;

  return (
    // data-lenis-prevent marks the panel as a scroll trap: useSectionSnap
    // checks for it and hands the wheel back rather than paging the document
    // behind an open panel, and overscroll-behavior does the same for the
    // browser's own chaining.
    <div
      id="chat-panel"
      ref={panel}
      role="dialog"
      aria-modal="false"
      aria-label={`Chat with ${bot.name}`}
      className="chat-panel"
      data-lenis-prevent
    >
      <header className="chat-head">
        <span className="chat-head-avatar">
          <BotAvatar />
          <i className="chat-status-dot" aria-hidden="true" />
        </span>

        <span className="chat-head-text">
          <strong>{bot.name}</strong>
          <small>{pending ? 'Typing…' : bot.role}</small>
        </span>

        <button type="button" className="chat-head-btn" onClick={reset} aria-label="Clear chat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 8h16M9 8V6h6v2M7 8l1 11h8l1-11"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button type="button" className="chat-head-btn" onClick={onClose} aria-label="Close chat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M6 6l12 12M18 6L6 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </header>

      {/* polite, not assertive: replies should not interrupt a screen reader
          mid-sentence while the visitor is still typing. */}
      <ol className="chat-log" ref={log} aria-live="polite" aria-atomic="false">
        {messages.map((m) => (
          <ChatMessage key={m.id} message={m} />
        ))}
        {pending && <TypingDots />}
      </ol>

      {showQuickReplies && (
        <div className="chat-chips">
          {quickReplies.map((q) => (
            <button key={q} type="button" className="chat-chip" onClick={() => send(q)}>
              {q}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="chat-error" role="status">
          {error}
        </p>
      )}

      <ChatComposer pending={pending} onSend={send} />
    </div>
  );
}
