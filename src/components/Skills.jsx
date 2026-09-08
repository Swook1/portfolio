import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, createSpring, stagger, svg } from 'animejs';
import { skills } from '../data/skills';
import { useAnimeScope, prefersReducedMotion } from '../hooks/useAnimeScope';

/**
 * Two elliptical rings around a hub. Positions are percentages of the
 * constellation box, so the whole thing scales with the viewport instead of
 * needing a separate mobile layout.
 */
const RINGS = [
  { count: 5, rx: 21, ry: 23, offset: -90 },
  { count: 8, rx: 39, ry: 41, offset: -67 },
];

/** Character pool for the hub's scramble-in effect. */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%$&';

const NODES = (() => {
  const out = [];
  let index = 0;
  for (const ring of RINGS) {
    for (let i = 0; i < ring.count && index < skills.length; i += 1, index += 1) {
      const angle = ((ring.offset + (360 / ring.count) * i) * Math.PI) / 180;
      out.push({
        ...skills[index],
        x: 50 + Math.cos(angle) * ring.rx,
        y: 50 + Math.sin(angle) * ring.ry,
        outer: ring.rx > 30,
      });
    }
  }
  return out;
})();

export default function Skills() {
  const [active, setActive] = useState(0);
  const hubLabel = useRef(null);

  const root = useAnimeScope(() => {
    // Idle drift, on its own wrapper so entrance and hover transforms stay free.
    animate('.node-float', {
      y: [0, -8, 0],
      duration: (el, i) => 3600 + (i % 4) * 600,
      ease: 'inOut(2)',
      loop: true,
      delay: stagger(140, { from: 'center' }),
    });

    // The web draws itself outward from the hub.
    const lines = animate(svg.createDrawable('.const-line'), {
      draw: ['0 0', '0 1'],
      duration: 900,
      delay: stagger(70),
      ease: 'out(3)',
      autoplay: false,
    });

    const hub = animate('.const-hub', {
      opacity: [0, 1],
      scale: [0.6, 1],
      duration: 900,
      ease: createSpring({ stiffness: 90, damping: 14 }),
      autoplay: false,
    });

    const nodes = animate('.const-node', {
      opacity: [0, 1],
      scale: [0.2, 1],
      duration: 1100,
      delay: stagger(70, { from: 'center', start: 250 }),
      ease: createSpring({ stiffness: 110, damping: 13 }),
      autoplay: false,
    });

    const head = animate('.skills-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    });

    return [head, hub, lines, nodes];
  });

  // Hub label scrambles into the selected skill's name: anime.js drives a
  // plain progress value and each frame rewrites the not-yet-revealed tail
  // with random characters.
  useEffect(() => {
    const el = hubLabel.current;
    if (!el) return undefined;
    const name = NODES[active].name;

    if (prefersReducedMotion()) {
      el.textContent = name;
      return undefined;
    }

    const state = { progress: 0 };
    const anim = animate(state, {
      progress: [0, 1],
      duration: 520,
      ease: 'out(2)',
      onUpdate: () => {
        const revealed = Math.round(state.progress * name.length);
        let out = name.slice(0, revealed);
        for (let i = revealed; i < name.length; i += 1) {
          out += name[i] === ' ' ? ' ' : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }
        el.textContent = out;
      },
      onComplete: () => {
        el.textContent = name;
      },
    });

    return () => anim.pause();
  }, [active]);

  const select = useCallback((i) => setActive(i), []);

  return (
    <section ref={root} id="skills" className="relative flex min-h-screen items-center py-28">
      <div className="section-shell text-center">
        <div className="skills-head anim-hidden">
          <span className="eyebrow">Stack</span>
          <h2 className="section-title mt-5">
            Tools I <span className="text-accent">build with</span>
          </h2>
          <p className="section-sub">
            Hover or tap a node — each one wires back into the same stack
          </p>
        </div>

        <div className="constellation mt-12">
          <svg
            className="const-web"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {NODES.map((node, i) => (
              <line
                key={node.name}
                className={`const-line ${i === active ? 'is-active' : ''}`}
                x1="50"
                y1="50"
                x2={node.x}
                y2={node.y}
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>

          <div className="const-hub anim-hidden">
            <span className="const-hub-ring" aria-hidden="true" />
            <span ref={hubLabel} className="const-hub-name" aria-live="polite">
              {NODES[0].name}
            </span>
            <span className="const-hub-meta">{skills.length} tools</span>
          </div>

          {NODES.map((node, i) => (
            <button
              key={node.name}
              type="button"
              className={`const-node anim-hidden ${node.outer ? 'is-outer' : ''} ${
                i === active ? 'is-active' : ''
              }`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onMouseEnter={() => select(i)}
              onFocus={() => select(i)}
              onClick={() => select(i)}
              aria-label={node.name}
              aria-pressed={i === active}
            >
              <span className="node-float">
                <span className="node-tile">
                  <img src={node.icon} alt="" aria-hidden="true" loading="lazy" />
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
