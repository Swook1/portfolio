import { useCallback, useEffect, useRef, useState } from 'react';
import {
  animate,
  createAnimatable,
  createDraggable,
  createSpring,
  stagger,
  svg,
  text,
  utils,
} from 'animejs';
import { projects } from '../data/projects';
import { github, browser } from '../data/icons';
import { useAnimeScope, prefersReducedMotion, splitReveal } from '../hooks/useAnimeScope';
import { webglAvailable } from '../lib/webgl';
import YouTubeFacade from './ui/YouTubeFacade';

const ORBIT_DURATION = 1000; // arbitrary length; scroll position seeks it
const DRAG_STEP = 120; // px of drag that counts as one project

const poster = (videoId) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

/**
 * A showcase rather than a list: one stage plus a rail of every project.
 * Page height stays the same whether there are four projects or forty — the
 * rail scrolls instead of the page growing.
 */
export default function Projects() {
  // `dir` is which way the last move went, so the incoming project can enter
  // from the side it came from instead of every switch looking identical.
  const [selection, setSelection] = useState({ index: 0, dir: 1 });
  const [seen, setSeen] = useState(false);

  const section = useRef(null);
  const orbit = useRef(null);
  const tilt = useRef(null);
  const rail = useRef(null);
  const stage = useRef(null);
  const cardRefs = useRef([]);
  const firstRender = useRef(true);
  const onScreen = useRef(false);
  const field = useRef(null);
  const lattice = useRef(null);
  const counter = useRef(null);

  const active = selection.index;
  const project = projects[active];
  const total = projects.length;

  const goTo = useCallback(
    (next, direction) =>
      setSelection((prev) => {
        const index = ((next % total) + total) % total;
        if (index === prev.index) return prev;
        return { index, dir: direction ?? (index > prev.index ? 1 : -1) };
      }),
    [total]
  );
  const goNext = useCallback(
    () => setSelection((p) => ({ index: (p.index + 1) % total, dir: 1 })),
    [total]
  );
  const goPrev = useCallback(
    () => setSelection((p) => ({ index: (p.index - 1 + total) % total, dir: -1 })),
    [total]
  );

  const root = useAnimeScope(() => {
    orbit.current = animate('.orbit-dot', {
      ...svg.createMotionPath('.orbit-path'),
      ease: 'linear',
      duration: ORBIT_DURATION,
      autoplay: false,
    });

    const ring = animate(svg.createDrawable('.orbit-path'), {
      draw: ['0 0', '0 1'],
      duration: 1400,
      ease: 'out(3)',
      autoplay: false,
    });

    const head = animate('.projects-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    });

    const cards = animate('.pj-card-slot', {
      opacity: [0, 1],
      y: [24, 0],
      duration: 600,
      delay: stagger(70, { start: 200 }),
      ease: 'out(3)',
      autoplay: false,
    });

    const enter = animate('.pj-stage', {
      opacity: [0, 1],
      y: [40, 0],
      duration: 900,
      ease: createSpring({ stiffness: 80, damping: 15 }),
      autoplay: false,
    });

    return [head, splitReveal('.section-title', { start: 120 }), ring, cards, enter];
  });

  // Track visibility for two things: loading the embed, and only letting the
  // arrow keys drive the rail while the section is actually on screen.
  useEffect(() => {
    const el = section.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((e) => e.isIntersecting);
        onScreen.current = visible;
        if (visible) setSeen(true);
      },
      { threshold: 0.25 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Scroll through the section -> the marker travels around the ring.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let frame = 0;
    const render = () => {
      frame = 0;
      const el = section.current;
      const anim = orbit.current;
      if (!el || !anim) return;
      const rect = el.getBoundingClientRect();
      const progress = utils.clamp(
        (window.innerHeight - rect.top) / (rect.height + window.innerHeight),
        0,
        1
      );
      anim.seek(progress * ORBIT_DURATION);
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    render();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
    };
  }, []);

  // Switching project: everything enters from the direction of travel.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const from = selection.dir * 70;
    const title = document.querySelector('.pj-title');
    const splitter = title ? text.splitText(title, { chars: true, words: false }) : null;

    const anims = [
      animate('.pj-media', {
        opacity: [0, 1],
        x: [from, 0],
        duration: 700,
        ease: createSpring({ stiffness: 90, damping: 17 }),
      }),
      animate('.pj-swap', {
        opacity: [0, 1],
        x: [from * 0.4, 0],
        y: [14, 0],
        duration: 600,
        delay: stagger(80),
        ease: 'out(3)',
      }),
      animate('.pj-chip', {
        opacity: [0, 1],
        scale: [0.5, 1],
        duration: 500,
        delay: stagger(55, { start: 150 }),
        ease: createSpring({ stiffness: 140, damping: 12 }),
      }),
    ];

    if (splitter) {
      anims.push(
        animate(splitter.chars, {
          opacity: [0, 1],
          y: [24, 0],
          rotate: [-20, 0],
          duration: 700,
          delay: stagger(16),
          ease: createSpring({ stiffness: 120, damping: 16 }),
        })
      );
    }

    return () => {
      anims.forEach((a) => a.pause());
      splitter?.revert();
    };
  }, [selection]);

  // Ambient lattice behind the whole section. Never on reduced motion or
  // without WebGL, plus a width gate: a full-section particle field is not what
  // a phone should spend its frame on when the rail and the stage already move.
  useEffect(() => {
    if (!seen) return undefined;
    if (prefersReducedMotion() || !webglAvailable()) return undefined;
    if (!window.matchMedia('(min-width: 768px)').matches) return undefined;

    let cancelled = false;
    (async () => {
      try {
        const { createField } = await import('./projects/fieldScene');
        if (cancelled || !field.current) return;
        const scene = await createField({ canvas: field.current });
        if (cancelled) {
          scene.dispose();
          return;
        }
        lattice.current = scene;
        field.current.classList.add('is-live');
        scene.setActive(true);
        scene.fadeIn();
      } catch {
        // Context creation can still fail after the capability check; the
        // section simply keeps its flat background.
      }
    })();

    return () => {
      cancelled = true;
      lattice.current?.dispose();
      lattice.current = null;
    };
  }, [seen]);

  // The lattice only renders while it is worth rendering: on screen, and in a
  // tab the visitor is actually looking at.
  useEffect(() => {
    const el = section.current;
    if (!el) return undefined;

    const sync = () => lattice.current?.setActive(onScreen.current && !document.hidden);
    const observer = new IntersectionObserver(sync, { threshold: 0 });
    observer.observe(el);
    document.addEventListener('visibilitychange', sync);

    const onMove = (event) => {
      const scene = lattice.current;
      if (!scene) return;
      const rect = el.getBoundingClientRect();
      scene.setPointer(
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height
      );
    };
    const onLeave = () => lattice.current?.setPointer(null);

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  // Every switch throws a ring across the lattice from the side the new
  // project arrived from, so the section reacts as a whole and not only inside
  // the video frame.
  useEffect(() => {
    lattice.current?.pulse(selection.dir);
  }, [selection]);

  // The counter counts rather than cuts, and wraps the short way round so
  // going 04 -> 01 rolls forward instead of spinning back through the list.
  useEffect(() => {
    const el = counter.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) {
      el.textContent = String(active + 1).padStart(2, '0');
      return undefined;
    }

    const shown = Number(el.textContent) || active + 1;
    const target = active + 1;
    // Roll in the direction of travel even across the wrap: going 04 -> 01
    // forwards counts up past the end rather than spinning all the way back.
    let from = shown;
    if (selection.dir > 0 && target < shown) from = shown - total;
    if (selection.dir < 0 && target > shown) from = shown + total;

    const roll = animate(
      { n: from },
      {
        n: target,
        duration: 420,
        ease: 'out(3)',
        onUpdate: (self) => {
          const raw = Math.round(self.targets[0].n);
          el.textContent = String(((raw - 1 + total * 2) % total) + 1).padStart(2, '0');
        },
        onComplete: () => {
          el.textContent = String(target).padStart(2, '0');
        },
      }
    );
    return () => roll.pause();
  }, [active, selection, total]);

  // Depth in the rail: cards fall away from whichever end of the rail is in
  // view, so scrolling it reads as a stack turning rather than a list sliding.
  // Driven straight off scroll position — no tween — so it tracks the finger.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const track = rail.current;
    if (!track) return undefined;
    const cards = cardRefs.current;

    let frame = 0;
    const render = () => {
      frame = 0;
      const box = track.getBoundingClientRect();
      const column = getComputedStyle(track).flexDirection === 'column';
      const scrollable = column
        ? track.scrollHeight > track.clientHeight + 4
        : track.scrollWidth > track.clientWidth + 4;

      // A rail short enough to show every card at once has no ends to fall
      // away towards, and dimming its outer cards would only make a complete
      // list look half-disabled.
      if (!scrollable) {
        for (const card of cards) {
          if (card) utils.set(card, { scale: 1, opacity: 1 });
        }
        return;
      }

      for (const card of cards) {
        if (!card) continue;
        const rect = card.getBoundingClientRect();
        // Distance from the middle of the rail, in card-lengths.
        const offset = column
          ? (rect.top + rect.height / 2 - (box.top + box.height / 2)) / box.height
          : (rect.left + rect.width / 2 - (box.left + box.width / 2)) / box.width;
        const away = utils.clamp(Math.abs(offset) * 2, 0, 1);

        // Scale and opacity only. Turning the cards in 3D looked good and made
        // them miserable to hit: a rotated card's visible face no longer lines
        // up with where a pointer expects it.
        utils.set(card, {
          scale: 1 - away * 0.07,
          opacity: 1 - away * 0.4,
        });
      }
    };
    const request = () => {
      if (!frame) frame = requestAnimationFrame(render);
    };

    render();
    track.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      track.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      cards.forEach((card) => card && utils.remove(card));
    };
  }, []);

  // Keep the selected card in view in the rail, whichever way it scrolls.
  //
  // Deliberately not scrollIntoView: that walks up every scrollable ancestor,
  // so on mount it dragged the whole page down to the Projects section instead
  // of leaving the visitor at the top. This scrolls the rail and nothing else,
  // and it skips the first render so landing on the page never moves it.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const card = cardRefs.current[active];
    const track = rail.current;
    if (!card || !track) return;

    const cardBox = card.getBoundingClientRect();
    const trackBox = track.getBoundingClientRect();

    track.scrollBy({
      left: cardBox.left - trackBox.left - (trackBox.width - cardBox.width) / 2,
      top: cardBox.top - trackBox.top - (trackBox.height - cardBox.height) / 2,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, [active]);

  // Arrow keys move through the rail while the section is on screen.
  useEffect(() => {
    const onKey = (event) => {
      if (!onScreen.current) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrev();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext, goPrev]);

  // Drag the stage to flick between projects. As with the certificate deck the
  // draggable moves an invisible proxy, not the media: its release spring would
  // otherwise settle the frame at the dragged offset. The media follows at a
  // third of the distance for rubber-band feel, and this component stays the
  // only writer of that transform.
  //
  // The trigger is the whole stage rather than the video frame: a cross-origin
  // iframe swallows pointer events, so a drag starting on the player itself
  // never reaches this page. Starting anywhere around it does, and the player
  // stays fully clickable.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const host = stage.current;
    if (!host) return undefined;

    const proxy = host.querySelector('.pj-drag-proxy');
    const media = host.querySelector('.pj-media');
    if (!proxy || !media) return undefined;

    const drag = createDraggable(proxy, {
      trigger: host,
      y: false,
      x: { snap: DRAG_STEP },
      cursor: { onHover: 'grab', onGrab: 'grabbing' },
      onDrag: (self) => utils.set(media, { x: self.x * 0.32 }),
      onRelease: (self) => {
        // Clamped to one project per flick: an unclamped hard drag could jump
        // several at once and, on a short list, wrap right back to where it
        // started — a gesture that visibly did nothing.
        const steps = utils.clamp(Math.round(self.x / DRAG_STEP), -1, 1);
        self.stop();
        self.setX(0);
        if (steps) {
          // Dragging left (negative x) should advance, like flicking a deck.
          utils.set(media, { x: 0 });
          goTo(active - steps, steps > 0 ? -1 : 1);
        } else {
          animate(media, {
            x: 0,
            duration: 500,
            ease: createSpring({ stiffness: 100, damping: 20 }),
          });
        }
      },
    });

    return () => drag.revert();
  }, [active, goTo]);

  // Media frame leans toward the pointer.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const el = tilt.current;
    if (!el) return undefined;
    // Pointer tilt is a desktop affordance; on touch it just fights scrolling.
    if (!window.matchMedia('(hover: hover)').matches) return undefined;

    const leaning = createAnimatable(el, { rotateX: 500, rotateY: 500, ease: 'out(3)' });

    const onMove = (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      leaning.rotateY(px * 10);
      leaning.rotateX(-py * 10);
    };
    const onLeave = () => {
      leaning.rotateX(0);
      leaning.rotateY(0);
    };

    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      leaning.revert();
    };
  }, []);

  const setRefs = useCallback(
    (el) => {
      section.current = el;
      root.current = el;
    },
    [root]
  );

  return (
    <section
      ref={setRefs}
      id="projects"
      className="section-tint relative overflow-hidden py-20 lg:py-28"
    >
      {/* Ambient lattice. Behind everything in the section, and inert until
          the section is reached. */}
      <canvas ref={field} className="pj-field" aria-hidden="true" />

      <div className="section-shell relative z-10">
        <div className="relative">
          <svg className="orbit" viewBox="0 0 300 300" aria-hidden="true">
            <circle className="orbit-path" cx="150" cy="150" r="128" />
            <circle className="orbit-dot" cx="0" cy="0" r="5" />
          </svg>

          <div className="projects-head anim-hidden relative text-center">
            <span className="eyebrow">Work</span>
            <h2 className="section-title mt-5">My Projects</h2>
            <p className="section-sub">Drag, swipe or use the arrow keys</p>
          </div>
        </div>

        <div className="pj-layout">
          {/* Rail: a snap-scrolling row of cards on phones, a column on desktop. */}
          <div ref={rail} className="pj-rail" role="tablist" aria-label="Projects">
            {projects.map((item, i) => (
              <div key={item.id} className="pj-card-slot anim-hidden">
                <button
                  type="button"
                  role="tab"
                  aria-selected={i === active}
                  ref={(el) => (cardRefs.current[i] = el)}
                  onClick={() => goTo(i)}
                  className={`pj-card ${i === active ? 'is-active' : ''}`}
                >
                  <span className="pj-card-thumb">
                    <img src={poster(item.youtubeId)} alt="" aria-hidden="true" loading="lazy" />
                    <span className="pj-card-num">{String(i + 1).padStart(2, '0')}</span>
                  </span>
                  <span className="pj-card-body">
                    <span className="pj-card-title">{item.title}</span>
                    <span className="pj-card-tech">
                      {item.technologies.map((tech) => (
                        <img key={tech.name} src={tech.icon} alt="" aria-hidden="true" />
                      ))}
                    </span>
                  </span>
                </button>
              </div>
            ))}
          </div>

          {/* Stage */}
          <div ref={stage} className="pj-stage anim-hidden relative">
            <span className="pj-drag-proxy" aria-hidden="true" />

            <div className="pj-media">
              <div ref={tilt} className="project-frame card overflow-hidden">
                <div className="aspect-video">
                  <YouTubeFacade
                    key={project.youtubeId}
                    videoId={project.youtubeId}
                    title={project.title}
                    autoPlay={seen}
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous project"
                className="pj-arrow pj-arrow--prev"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next project"
                className="pj-arrow pj-arrow--next"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="pj-info">
              <span className="pj-swap pj-counter">
                {/* Constant on purpose: the effect below owns this text from
                    the first switch onward, and a React re-render writing the
                    new number would land before the roll ever started. */}
                <b ref={counter}>01</b>
                <i>/ {String(total).padStart(2, '0')}</i>
              </span>

              {/* Keyed so React replaces the node outright on every switch:
                  splitText rewrites this element's children, and reverting a
                  node React still owns would restore the previous title. */}
              <h3 key={project.id} className="pj-title">
                {project.title}
              </h3>

              <p className="pj-swap pj-desc">{project.description}</p>

              <div className="pj-swap">
                <h4 className="pj-label">Built with</h4>
                <div className="pj-chips">
                  {project.technologies.map((tech) => (
                    <span key={tech.name} className="pj-chip tech-pill">
                      <img src={tech.icon} alt="" aria-hidden="true" />
                      {tech.name}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pj-swap pj-actions">
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                >
                  <img src={github} alt="" aria-hidden="true" className="h-5 w-5" />
                  View on GitHub
                </a>
                {project.websiteUrl && (
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                  >
                    <img src={browser} alt="" aria-hidden="true" className="h-5 w-5" />
                    View Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
