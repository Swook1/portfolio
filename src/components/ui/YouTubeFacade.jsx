import { useEffect, useRef, useState } from 'react';
import { animate, svg } from 'animejs';
import { prefersReducedMotion } from '../../hooks/useAnimeScope';

const PLAY_PATH = 'M8 5 L8 19 L19 12 Z';
const LOADING_PATH = 'M9 9 L15 9 L15 15 L9 15 Z';

/**
 * Autoplay is refused when the visitor has asked for less motion, or when the
 * browser reports a metered or slow connection — a muted clip is not worth
 * someone's mobile data.
 */
function autoplayAllowed() {
  if (prefersReducedMotion()) return false;
  const connection = navigator.connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return !/2g|slow-2g|3g/.test(connection.effectiveType || '');
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
  // The poster stays over the iframe until playback is under way: YouTube
  // shows its title bar, spinner and controls while a video is still loading,
  // and that chrome is the first thing a visitor would otherwise see.
  const [playing, setPlaying] = useState(false);
  const icon = useRef(null);
  const frame = useRef(null);

  useEffect(() => {
    if (autoPlay && autoplayAllowed()) setActive(true);
  }, [autoPlay]);

  // Drop the poster only once the player reports it is actually playing. The
  // iframe's load event fires long before the first frame, and YouTube shows
  // its title bar, spinner and controls for the whole buffering stretch.
  // enablejsapi + a 'listening' handshake gets onStateChange without pulling
  // in the IFrame API script.
  useEffect(() => {
    if (!active) return undefined;
    const iframe = frame.current;
    if (!iframe) return undefined;

    const handshake = setInterval(() => {
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: videoId, channel: 'widget' }),
        '*'
      );
    }, 250);

    const onMessage = (event) => {
      if (event.source !== iframe.contentWindow) return;
      try {
        const data = JSON.parse(event.data);
        // 1 = playing
        if (data.event === 'onStateChange' && data.info === 1) setPlaying(true);
      } catch {
        // YouTube also posts non-JSON frames; ignore them.
      }
    };
    window.addEventListener('message', onMessage);

    // If the handshake never lands, don't leave the poster up forever.
    const failsafe = setTimeout(() => setPlaying(true), 6000);

    return () => {
      clearInterval(handshake);
      clearTimeout(failsafe);
      window.removeEventListener('message', onMessage);
    };
  }, [active, videoId]);

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
      <div className="yt-embed">
        <iframe
          ref={frame}
          className="h-full w-full"
          // Autoplay only works muted; playsinline keeps iOS from taking the
          // video fullscreen; iv_load_policy drops the annotation layer.
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}&playsinline=1&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <span className={`yt-cover ${playing ? 'is-gone' : ''}`} aria-hidden="true">
          <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="" />
        </span>
      </div>
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
