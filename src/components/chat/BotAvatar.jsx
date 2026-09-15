/**
 * The bot's face: a geometric mark drawn inline rather than a photo, so it
 * scales to any size, needs no network request, and picks up the accent
 * colour from CSS with the rest of the site.
 *
 * Decorative everywhere it is used — the speaker is already named in text —
 * so it is hidden from screen readers.
 */
export default function BotAvatar({ className = '' }) {
  return (
    <span className={`chat-avatar ${className}`} aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="none">
        {/* Antenna */}
        <circle cx="16" cy="5" r="1.8" fill="currentColor" />
        <path d="M16 6.8v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />

        {/* Head */}
        <rect
          x="6.5"
          y="9.8"
          width="19"
          height="15"
          rx="5.5"
          stroke="currentColor"
          strokeWidth="1.7"
        />

        {/* Eyes — the one detail that reads at 28px, so they carry the face. */}
        <circle cx="12.4" cy="16.6" r="1.7" fill="currentColor" />
        <circle cx="19.6" cy="16.6" r="1.7" fill="currentColor" />

        {/* Mouth */}
        <path
          d="M12.8 20.4h6.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.65"
        />

        {/* Ears */}
        <path
          d="M4.4 15.2v4.2M27.6 15.2v4.2"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity="0.5"
        />
      </svg>
    </span>
  );
}
