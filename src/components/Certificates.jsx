import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, createDraggable, createSpring, stagger, svg, utils } from 'animejs';
import { certificates } from '../data/certificates';
import { useAnimeScope, prefersReducedMotion, splitReveal } from '../hooks/useAnimeScope';
import CertificateModal from './ui/CertificateModal';

const AUTO_ROTATE_MS = 8000;
const DRAG_STEP = 140; // px of drag that counts as one card

/** Shortest signed distance from `index` to `current` on a ring of `total`. */
function ringOffset(index, current, total) {
  let diff = index - current;
  if (diff > total / 2) diff -= total;
  if (diff < -total / 2) diff += total;
  return diff;
}

export default function Certificates() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [spacing, setSpacing] = useState(320);

  const stage = useRef(null);
  const slideRefs = useRef([]);
  const autoplay = useRef(null);
  const advance = useRef(() => {});

  const total = certificates.length;

  const next = useCallback(() => setCurrent((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + total) % total), [total]);
  advance.current = next;

  const root = useAnimeScope(() => {
    // The countdown ring both paces the autoplay and shows how long is left:
    // one drawable stroke, looping, advancing the deck on every lap.
    autoplay.current = animate(svg.createDrawable('.cert-ring-path'), {
      draw: ['0 0', '0 1'],
      duration: AUTO_ROTATE_MS,
      ease: 'linear',
      loop: true,
      onLoop: () => advance.current(),
    });

    // Drag to flick through the deck. The draggable moves an invisible proxy
    // rather than the track itself: its release spring would otherwise settle
    // the track at the dragged offset and leave the deck off-centre. The track
    // follows the drag at a quarter strength for rubber-band feel, and this
    // component stays the only writer of the track's transform.
    createDraggable('.cert-drag-proxy', {
      trigger: '.cert-viewport',
      y: false,
      x: { snap: DRAG_STEP },
      cursor: { onHover: 'grab', onGrab: 'grabbing' },
      onGrab: () => autoplay.current?.pause(),
      onDrag: (self) => utils.set('.cert-track', { x: self.x * 0.25 }),
      onRelease: (self) => {
        const steps = Math.round(self.x / DRAG_STEP);
        if (steps) setCurrent((i) => (((i - steps) % total) + total) % total);
        self.stop();
        self.setX(0);
        animate('.cert-track', {
          x: 0,
          duration: 600,
          ease: createSpring({ stiffness: 90, damping: 20 }),
        });
        autoplay.current?.restart();
      },
    });

    const head = animate('.cert-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    });

    const deck = animate('.cert-stage', {
      opacity: [0, 1],
      y: [40, 0],
      scale: [0.94, 1],
      duration: 900,
      ease: createSpring({ stiffness: 80, damping: 15 }),
      autoplay: false,
    });

    const caption = animate('.cert-caption', {
      opacity: [0, 1],
      y: [20, 0],
      duration: 700,
      delay: stagger(120, { start: 350 }),
      ease: 'out(3)',
      autoplay: false,
    });

    return [head, splitReveal('.section-title', { start: 120 }), deck, caption];
  });

  // Side-slide distance scales with the stage width.
  useEffect(() => {
    const el = stage.current;
    if (!el) return undefined;
    const measure = () => setSpacing(Math.min(el.offsetWidth * 0.33, 380));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Lay the deck out: centre card up front, neighbours behind and turned away.
  useEffect(() => {
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const offset = ringOffset(i, current, total);
      const visible = Math.abs(offset) <= 1;
      const target = {
        x: offset * spacing,
        scale: offset === 0 ? 1 : 0.72,
        rotateY: offset * -16,
        opacity: visible ? (offset === 0 ? 1 : 0.45) : 0,
      };
      el.style.pointerEvents = visible ? 'auto' : 'none';
      el.parentElement.style.zIndex = offset === 0 ? 20 : visible ? 10 : 0;
      el.setAttribute('aria-hidden', visible ? 'false' : 'true');
      el.tabIndex = visible ? 0 : -1;

      if (prefersReducedMotion()) {
        el.style.transform = `translateX(${target.x}px) scale(${target.scale})`;
        el.style.opacity = target.opacity;
        return;
      }
      animate(el, {
        ...target,
        duration: 900,
        ease: createSpring({ stiffness: 90, damping: 18 }),
      });
    });
  }, [current, spacing, total]);

  // The modal owns the visitor's attention, so the autoplay ring stops.
  useEffect(() => {
    const ring = autoplay.current;
    if (!ring) return;
    if (selected) ring.pause();
    else ring.play();
  }, [selected]);

  const holdAutoplay = () => autoplay.current?.pause();
  const resumeAutoplay = () => {
    if (!selected) autoplay.current?.play();
  };

  return (
    <section ref={root} id="certificate" className="relative flex min-h-screen items-center py-28">
      <div className="section-shell text-center">
        <div className="cert-head anim-hidden">
          <span className="eyebrow">Credentials</span>
          <h2 className="section-title mt-5">Certificates</h2>
          <p className="section-sub">Drag the deck, or let it run — {total} in total</p>
        </div>

        <div
          className="cert-stage anim-hidden relative mt-14"
          onMouseEnter={holdAutoplay}
          onMouseLeave={resumeAutoplay}
        >
          <button
            type="button"
            onClick={prev}
            aria-label="Previous certificate"
            className="cert-arrow left-0 sm:left-2"
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

          <span className="cert-drag-proxy" aria-hidden="true" />

          <div ref={stage} className="cert-viewport">
            <div className="cert-track">
              {certificates.map((cert, i) => (
                <div key={cert.id} className="cert-slot">
                  <button
                    type="button"
                    ref={(el) => (slideRefs.current[i] = el)}
                    onClick={() => (i === current ? setSelected(cert) : setCurrent(i))}
                    aria-label={`${cert.title} - open full size`}
                    className="cert-slide card"
                  >
                    <img src={cert.thumb} alt={cert.title} loading="lazy" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={next}
            aria-label="Next certificate"
            className="cert-arrow right-0 sm:right-2"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="cert-caption anim-hidden mx-auto mt-10 flex max-w-2xl items-center gap-4">
          {/* Countdown ring: the same drawable that paces the autoplay. */}
          <svg className="cert-ring" viewBox="0 0 40 40" aria-hidden="true">
            <circle className="cert-ring-track" cx="20" cy="20" r="17" />
            <circle className="cert-ring-path" cx="20" cy="20" r="17" />
          </svg>
          <div className="text-left">
            <h3 className="font-display text-base font-semibold sm:text-lg">
              {certificates[current].title}
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-muted sm:text-sm">
              {certificates[current].description}
            </p>
          </div>
        </div>

        <div className="cert-caption anim-hidden mt-6 flex justify-center gap-2">
          {certificates.map((cert, i) => (
            <button
              key={cert.id}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to certificate ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-8' : 'w-2'
              }`}
              style={{ background: i === current ? 'var(--accent)' : 'var(--border)' }}
            />
          ))}
        </div>
      </div>

      {selected && <CertificateModal certificate={selected} onClose={() => setSelected(null)} />}
    </section>
  );
}
