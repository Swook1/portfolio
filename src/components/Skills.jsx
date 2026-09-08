import { useCallback, useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { skills } from '../data/skills';
import { useAnimeScope, prefersReducedMotion, splitReveal } from '../hooks/useAnimeScope';

/** Character pool for the hub's scramble-in effect. */
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#%$&';

function webglAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && canvas.getContext('webgl2'));
  } catch {
    return false;
  }
}

export default function Skills() {
  const [active, setActive] = useState(0);
  // 'pending' until we know whether the 3D scene can run at all.
  const [mode, setMode] = useState('pending');

  const hubLabel = useRef(null);
  const canvas = useRef(null);
  const scene = useRef(null);

  const root = useAnimeScope(() => {
    const head = animate('.skills-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    });

    const stage = animate('.const-stage', {
      opacity: [0, 1],
      scale: [0.94, 1],
      duration: 900,
      ease: 'out(3)',
      autoplay: false,
    });

    return [head, splitReveal('.section-title', { start: 120 }), stage];
  });

  // three.js is loaded only when the section is actually reached, and never on
  // reduced motion or without WebGL — the flat grid covers those cases.
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;

    if (prefersReducedMotion() || !webglAvailable()) {
      setMode('flat');
      return undefined;
    }

    let cancelled = false;
    const observer = new IntersectionObserver(
      async (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        observer.disconnect();
        try {
          const { createConstellation } = await import('./skills/constellationScene');
          if (cancelled || !canvas.current) return;
          scene.current = await createConstellation({
            canvas: canvas.current,
            skills,
            onSelect: setActive,
          });
          if (cancelled) {
            scene.current.dispose();
            scene.current = null;
            return;
          }
          setMode('3d');
          scene.current.reveal();
        } catch {
          // WebGL can still fail at context creation; fall back rather than
          // leaving an empty box.
          if (!cancelled) setMode('flat');
        }
      },
      { rootMargin: '200px 0px', threshold: 0 }
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
      scene.current?.dispose();
      scene.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hub label scrambles into the selected skill's name.
  useEffect(() => {
    const el = hubLabel.current;
    if (!el) return undefined;
    const name = skills[active].name;

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

  // Keyboard and screen-reader selection drives the 3D scene too.
  const select = useCallback((i) => {
    setActive(i);
    scene.current?.setActive(i);
  }, []);

  return (
    <section ref={root} id="skills" className="relative flex min-h-screen items-center py-28">
      <div className="section-shell text-center">
        <div className="skills-head anim-hidden">
          <span className="eyebrow">Stack</span>
          <h2 className="section-title mt-5">
            Tools I <span className="text-accent">build with</span>
          </h2>
          <p className="section-sub">
            {mode === '3d'
              ? 'Drag to spin the cluster - hover a tile to read it'
              : 'Programming languages and softwares I work with'}
          </p>
        </div>

        <div className="const-stage anim-hidden mt-10">
          {mode !== 'flat' && (
            <div className="const-canvas-wrap">
              <canvas ref={canvas} className="const-canvas" />

              <div className="const-hub" aria-hidden="true">
                <span className="const-hub-ring" />
                <span ref={hubLabel} className="const-hub-name">
                  {skills[0].name}
                </span>
                <span className="const-hub-meta">{skills.length} tools</span>
              </div>
            </div>
          )}

          {/* Always rendered: the flat grid is the fallback, and on the 3D path
              it stays as the keyboard- and screen-reader-accessible control. */}
          <ul className={mode === '3d' ? 'skill-picker' : 'skill-grid'}>
            {skills.map((skill, i) => (
              <li key={skill.name}>
                <button
                  type="button"
                  onClick={() => select(i)}
                  onFocus={() => select(i)}
                  aria-pressed={i === active}
                  className={`skill-pick ${i === active ? 'is-active' : ''}`}
                >
                  <img src={skill.icon} alt="" aria-hidden="true" loading="lazy" />
                  <span>{skill.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
