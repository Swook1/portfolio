import BotAvatar from './BotAvatar';

/**
 * The bottom-right floating button. It is the panel's toggle, so it keeps
 * aria-expanded and swaps to a close glyph while the panel is up.
 */
export default function ChatLauncher({ open, unread, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-controls="chat-panel"
      aria-label={open ? 'Close chat' : 'Open chat'}
      className={`chat-fab ${open ? 'is-open' : ''}`}
    >
      <span className="chat-fab-ping" aria-hidden="true" />

      <span className="chat-fab-face" data-face="idle">
        <BotAvatar className="chat-fab-mark" />
      </span>

      <svg className="chat-fab-face" data-face="open" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M6 6l12 12M18 6L6 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      {unread > 0 && !open && (
        <span className="chat-fab-badge" aria-hidden="true">
          {unread}
        </span>
      )}

      {/* Desktop-only label that slides out of the button on hover. */}
      <span className="chat-fab-tip" aria-hidden="true">
        Chat with me
      </span>
    </button>
  );
}
