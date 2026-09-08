import { useEffect, useRef, useState } from 'react';
import { animate, stagger } from 'animejs';
import { useAnimeScope, prefersReducedMotion } from '../hooks/useAnimeScope';
import { webglAvailable } from '../lib/webgl';

/**
 * Deterministic star field. Positions are fixed constants rather than
 * Math.random() so the layout is stable across renders and reloads.
 */
const DOTS = Array.from({ length: 42 }, (_, i) => {
  const golden = 0.6180339887;
  const x = ((i * golden * 100) % 100).toFixed(2);
  const y = (((i * 37) % 100) + (i % 3)).toFixed(2);
  const size = 1 + (i % 3);
  return { x, y, size, i };
});

/**
 * One fixed layer behind the whole page, at z-index -1 so the document
 * background still paints behind it.
 *
 * Two tiers. The CSS tier — drifting blobs, a faded grid, a twinkling dot
 * field — renders immediately and is the whole backdrop on mobile, on reduced
 * motion, and without WebGL. On desktop the three.js tier fades in over it
 * after first paint, and the CSS blobs and dots step aside so the two don't
 * stack. three.js is never in the initial bundle.
 *
 * The WebGL tier is `backdrop/nebulaScene.js`: an aurora with a star field
 * over it. `auroraScene.js` and `spaceScene.js` hold each half on its own,
 * behind the same interface, so either can be swapped back in on one line.
 */
export default function Backdrop() {
  const [spaceReady, setSpaceReady] = useState(false);
  const canvas = useRef(null);
  const scene = useRef(null);

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

  useEffect(() => {
    const wide = window.matchMedia('(min-width: 1024px)').matches;
    if (!wide || prefersReducedMotion() || !webglAvailable()) return undefined;

    let cancelled = false;
    let idle = 0;

    // After first paint: the backdrop must never delay the hero.
    const start = async () => {
      try {
        const { createNebula } = await import('./backdrop/nebulaScene');
        if (cancelled || !canvas.current) return;
        // While the GL context is gone the CSS tier is the backdrop again, so
        // the page is never left with a blank canvas over a flat background.
        scene.current = await createNebula({
          canvas: canvas.current,
          onLost: () => setSpaceReady(false),
          onRestored: () => setSpaceReady(true),
        });
        if (cancelled) {
          scene.current.dispose();
          scene.current = null;
          return;
        }
        setSpaceReady(true);
      } catch {
        // Keep the CSS backdrop; nothing else to do.
      }
    };

    // A plain timer rather than requestIdleCallback: idle callbacks can be
    // starved indefinitely, and the backdrop should not be left to chance.
    // 900ms is comfortably past first paint for this page.
    idle = window.setTimeout(start, 900);

    return () => {
      cancelled = true;
      window.clearTimeout(idle);
      scene.current?.dispose();
      scene.current = null;
    };
  }, []);

  return (
    <div ref={root} className="backdrop noise" aria-hidden="true">
      <canvas ref={canvas} className={`bd-canvas ${spaceReady ? 'is-live' : ''}`} />

      <div className={`bd-css ${spaceReady ? 'is-muted' : ''}`}>
        <div className="bd-layer" data-parallax="0.05">
          <span className="blob bd-blob-a" />
        </div>
        <div className="bd-layer" data-parallax="0.09">
          <span className="blob bd-blob-b" />
        </div>
        <div className="bd-layer" data-parallax="0.03">
          <span className="blob bd-blob-c" />
        </div>

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

      {/* The grid stays in both tiers — it gives the page its structure. */}
      <div className="bd-layer bd-grid" data-parallax="0.02" />
    </div>
  );
}
