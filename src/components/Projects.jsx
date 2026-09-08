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
import { useAnimeScope, prefersReducedMotion } from '../hooks/useAnimeScope';
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

    return [head, ring, cards, enter];
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
      <div className="section-shell">
        <div className="relative">
          <svg className="orbit" viewBox="0 0 300 300" aria-hidden="true">
            <circle className="orbit-path" cx="150" cy="150" r="128" />
            <circle className="orbit-dot" cx="0" cy="0" r="5" />
          </svg>

          <div className="projects-head anim-hidden relative text-center">
            <span className="eyebrow">Work</span>
            <h2 className="section-title mt-5">My Projects</h2>
            <p className="section-sub">Drag, swipe or use the arrow keys — {total} and counting</p>
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
                {String(active + 1).padStart(2, '0')}
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
