import { useEffect, useRef, useState } from 'react';
import { animate, utils } from 'animejs';
import { prefersReducedMotion } from '../../hooks/useAnimeScope';

const HOLD = 4200; // ms a shot stays up before the next one fades in

/**
 * Stand-in for the video facade on projects that are shown as stills: a stack
 * of screenshots that cross-fades on its own, with dots to jump between them.
 *
 * Which shot is up is owned by the section, not by this component, so the
 * stage arrows page through the shots and this stays the one place that
 * decides how a shot appears.
 *
 * Cycling stops while the pointer is over the frame and whenever the visitor
 * has asked for less motion, so nothing moves under someone reading it.
 */
export default function ImageGallery({ images, title, index, onIndex, autoPlay = false }) {
  const [held, setHeld] = useState(false);
  const slides = useRef([]);
  const total = images.length;

  // Cross-fade rather than swap: only the incoming shot animates, so the one
  // leaving stays put underneath instead of flashing the frame background.
  //
  // Visibility is written inline on every shot, not left to a class: fading a
  // shot in leaves an inline opacity behind, which a stylesheet rule can never
  // outrank — so each shown shot stayed lit and the last one in the stack
  // covered whatever came next. The incoming shot is also lifted above the
  // others so it fades in over the one it replaces, whichever way we moved.
  useEffect(() => {
    slides.current.forEach((el, i) => {
      if (!el) return;
      utils.set(el, { opacity: i === index ? 1 : 0, zIndex: i === index ? 2 : 1 });
    });

    const el = slides.current[index];
    if (!el || prefersReducedMotion()) return undefined;
    const fade = animate(el, {
      opacity: [0, 1],
      scale: [1.04, 1],
      duration: 700,
      ease: 'out(3)',
    });
    return () => fade.pause();
  }, [index]);

  useEffect(() => {
    if (total < 2 || !autoPlay || held || prefersReducedMotion()) return undefined;
    const timer = setTimeout(() => onIndex((index + 1) % total), HOLD);
    return () => clearTimeout(timer);
  }, [index, total, autoPlay, held, onIndex]);

  return (
    <div
      className="pj-shots"
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
    >
      {images.map((shot, i) => (
        <img
          key={shot.src}
          ref={(el) => (slides.current[i] = el)}
          src={shot.src}
          alt={shot.alt ? `${title} — ${shot.alt}` : title}
          loading={i === 0 ? 'eager' : 'lazy'}
          className={`pj-shot ${i === index ? 'is-shown' : ''}`}
        />
      ))}

      {total > 1 && (
        <div className="pj-shot-dots" role="tablist" aria-label={`${title} screenshots`}>
          {images.map((shot, i) => (
            <button
              key={shot.src}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={shot.alt || `Screenshot ${i + 1}`}
              onClick={() => onIndex(i)}
              className={`pj-shot-dot ${i === index ? 'is-active' : ''}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
