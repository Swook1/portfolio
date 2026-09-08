import { useEffect, useRef, useState } from 'react';
import { animate, svg } from 'animejs';
import { prefersReducedMotion } from '../../hooks/useAnimeScope';

const PLAY_PATH = 'M8 5 L8 19 L19 12 Z';
const LOADING_PATH = 'M9 9 L15 9 L15 15 L9 15 Z';

// Chrome's effectiveType is a rolling estimate that reads "3g" on plenty of
// healthy wifi, so only the genuinely slow tiers count as too slow to stream.
const TOO_SLOW = ['slow-2g', '2g'];

/**
 * Autoplay is refused when the visitor has asked for less motion, or when the
 * browser reports data saver or a genuinely slow connection — a muted clip is
 * not worth someone's mobile data.
 */
function autoplayAllowed() {
  if (prefersReducedMotion()) return false;
  const connection = navigator.connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !TOO_SLOW.includes(connection.effectiveType);
}

/**
 * Lightweight YouTube placeholder: shows the poster frame and only mounts the
 * real iframe when asked, so an embed never ships with the page. The play
 * triangle morphs into a square while the iframe mounts.
 *
 * With `autoPlay` the iframe mounts on its own — used once the Projects
 * section is actually on screen, so the embed still costs nothing until then.
 */
export default function YouTubeFacade({ videoId, title, autoPlay = false }) {
  const [active, setActive] = useState(false);
  const icon = useRef(null);

  useEffect(() => {
    if (autoPlay && autoplayAllowed()) setActive(true);
  }, [autoPlay]);

  const start = () => {
    if (prefersReducedMotion() || !icon.current) {
      setActive(true);
      return;
    }
    animate(icon.current, {
      d: svg.morphTo(`#morph-target-${videoId}`),
      duration: 320,
      ease: 'out(3)',
      onComplete: () => setActive(true),
    });
  };

  if (active) {
    return (
      <iframe
        className="h-full w-full"
        // Autoplay only works muted; playsinline keeps iOS from taking the
        // video fullscreen; iv_load_policy drops the annotation layer.
        src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3`}
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
      onClick={start}
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
        <span className="play-badge">
          <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden="true">
            <path ref={icon} d={PLAY_PATH} fill="#fff" />
            {/* Morph target, never rendered visibly. */}
            <path id={`morph-target-${videoId}`} d={LOADING_PATH} fill="none" opacity="0" />
          </svg>
        </span>
      </span>
    </button>
  );
}
