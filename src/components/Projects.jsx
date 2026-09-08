import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, createAnimatable, createSpring, stagger, svg, text, utils } from 'animejs';
import { projects } from '../data/projects';
import { github, browser } from '../data/icons';
import { useAnimeScope, prefersReducedMotion } from '../hooks/useAnimeScope';
import YouTubeFacade from './ui/YouTubeFacade';

const ORBIT_DURATION = 1000; // arbitrary length; scroll position seeks it

const poster = (videoId) => `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;

/**
 * A showcase rather than a list: one stage plus a rail of every project.
 * Page height stays the same whether there are four projects or forty — the
 * rail scrolls instead of the page growing.
 */
export default function Projects() {
  const [active, setActive] = useState(0);
  const section = useRef(null);
  const orbit = useRef(null);
  const tilt = useRef(null);
  const cardRefs = useRef([]);

  const project = projects[active];

  const root = useAnimeScope(() => {
    // A marker rides the orbit ring behind the heading; scroll seeks it.
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

    const cards = animate('.pj-card', {
      opacity: [0, 1],
      y: [24, 0],
      duration: 600,
      delay: stagger(70, { start: 200 }),
      ease: 'out(3)',
      autoplay: false,
    });

    const stage = animate('.pj-stage', {
      opacity: [0, 1],
      y: [40, 0],
      duration: 900,
      ease: createSpring({ stiffness: 80, damping: 15 }),
      autoplay: false,
    });

    return [head, ring, cards, stage];
  });

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

  // Switching project: the title re-assembles per character and the rest of
  // the stage staggers back in.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const title = document.querySelector('.pj-title');
    const splitter = title ? text.splitText(title, { chars: true, words: false }) : null;

    const anims = [
      animate('.pj-swap', {
        opacity: [0, 1],
        y: [18, 0],
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
  }, [active]);

  // Keep the selected card in view in the rail, whichever way it scrolls.
  useEffect(() => {
    cardRefs.current[active]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'nearest',
    });
  }, [active]);

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
    <section ref={setRefs} id="projects" className="section-tint relative overflow-hidden py-20 lg:py-28">
      <div className="section-shell">
        <div className="relative">
          <svg className="orbit" viewBox="0 0 300 300" aria-hidden="true">
            <circle className="orbit-path" cx="150" cy="150" r="128" />
            <circle className="orbit-dot" cx="0" cy="0" r="5" />
          </svg>

          <div className="projects-head anim-hidden relative text-center">
            <span className="eyebrow">Work</span>
            <h2 className="section-title mt-5">My Projects</h2>
            <p className="section-sub">Pick one — {projects.length} and counting</p>
          </div>
        </div>

        <div className="pj-layout">
          {/* Rail: a snap-scrolling row of cards on phones, a column on desktop. */}
          <div className="pj-rail" role="tablist" aria-label="Projects">
            {projects.map((item, i) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={i === active}
                ref={(el) => (cardRefs.current[i] = el)}
                onClick={() => setActive(i)}
                className={`pj-card anim-hidden ${i === active ? 'is-active' : ''}`}
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
            ))}
          </div>

          {/* Stage */}
          <div className="pj-stage anim-hidden">
            <div ref={tilt} className="project-frame card overflow-hidden">
              <div className="aspect-video">
                <YouTubeFacade
                  key={project.youtubeId}
                  videoId={project.youtubeId}
                  title={project.title}
                />
              </div>
            </div>

            <div className="pj-info">
              <span className="pj-swap pj-counter">
                {String(active + 1).padStart(2, '0')}
                <i>/ {String(projects.length).padStart(2, '0')}</i>
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
