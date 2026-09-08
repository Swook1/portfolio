import { useState } from 'react';

/**
 * Lightweight YouTube placeholder: shows the poster frame and only mounts the
 * real iframe once the visitor asks for it, so four embeds don't ship with the
 * page.
 */
export default function YouTubeFacade({ videoId, title }) {
  const [active, setActive] = useState(false);

  if (active) {
    return (
      <iframe
        className="h-full w-full"
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`}
        title={title}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setActive(true)}
      aria-label={`Play video: ${title}`}
      className="group relative h-full w-full overflow-hidden"
    >
      <img
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      />
      <span className="absolute inset-0" style={{ background: 'rgba(11,15,23,0.35)' }} />
      <span className="absolute inset-0 flex items-center justify-center">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
          style={{ background: 'var(--accent)' }}
        >
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-white" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
    </button>
  );
}
