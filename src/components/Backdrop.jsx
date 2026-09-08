import { animate, stagger } from 'animejs';
import { useAnimeScope } from '../hooks/useAnimeScope';

/**
 * Deterministic star field. Positions are fixed constants rather than
 * Math.random() so the layout is stable across renders and reloads.
 */
const DOTS = Array.from({ length: 42 }, (_, i) => {
  const golden = 0.6180339887;
  const x = ((i * golden * 100) % 100).toFixed(2);
  const y = (((i * 37) % 100) + (i % 3)) .toFixed(2);
  const size = 1 + (i % 3);
  return { x, y, size, i };
});

/**
 * One fixed layer behind the whole page: drifting gradient blobs, a faded
 * grid and a twinkling dot field. Sits at z-index -1 so the document
 * background still paints behind it and no section needs its own decoration.
 *
 * The `data-parallax` wrappers are moved by useScrollFx; the blobs inside them
 * carry the anime.js loops, so scroll parallax and idle drift never fight over
 * the same transform.
 */
export default function Backdrop() {
  const root = useAnimeScope(() => {
    animate('.bd-blob-a', {
      x: [0, 90, -30, 0],
      y: [0, -60, 40, 0],
      scale: [1, 1.15, 0.95, 1],
      duration: 26000,
      ease: 'inOut(2)',
      loop: true,
    });
    animate('.bd-blob-b', {
      x: [0, -80, 40, 0],
      y: [0, 70, -30, 0],
      scale: [1, 0.9, 1.12, 1],
      duration: 32000,
      ease: 'inOut(2)',
      loop: true,
    });
    animate('.bd-blob-c', {
      x: [0, 60, -50, 0],
      y: [0, 40, 60, 0],
      scale: [1, 1.2, 1, 1],
      duration: 38000,
      ease: 'inOut(2)',
      loop: true,
    });
    animate('.bd-dot', {
      opacity: [0.15, 0.8, 0.15],
      scale: [1, 1.6, 1],
      duration: 4200,
      ease: 'inOut(2)',
      loop: true,
      delay: stagger(160, { from: 'random' }),
    });
  });

  return (
    <div ref={root} className="backdrop noise" aria-hidden="true">
      <div className="bd-layer" data-parallax="0.05">
        <span className="blob bd-blob-a" />
      </div>
      <div className="bd-layer" data-parallax="0.09">
        <span className="blob bd-blob-b" />
      </div>
      <div className="bd-layer" data-parallax="0.03">
        <span className="blob bd-blob-c" />
      </div>

      <div className="bd-layer bd-grid" data-parallax="0.02" />

      <div className="bd-layer" data-parallax="0.06">
        {DOTS.map((dot) => (
          <span
            key={dot.i}
            className="bd-dot"
            style={{
              left: `${dot.x}%`,
              top: `${dot.y}%`,
              height: `${dot.size}px`,
              width: `${dot.size}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
