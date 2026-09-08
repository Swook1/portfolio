import { useCallback, useEffect, useRef, useState } from 'react';
import { animate } from 'animejs';
import { certificates } from '../data/certificates';
import { useAnimeScope, prefersReducedMotion } from '../hooks/useAnimeScope';
import CertificateModal from './ui/CertificateModal';

const AUTO_ROTATE_MS = 8000;
const SWIPE_THRESHOLD = 50;

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
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  const total = certificates.length;

  const next = useCallback(() => setCurrent((i) => (i + 1) % total), [total]);
  const prev = useCallback(() => setCurrent((i) => (i - 1 + total) % total), [total]);

  const root = useAnimeScope(() => [
    animate('.cert-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.cert-stage', {
      opacity: [0, 1],
      y: [40, 0],
      duration: 800,
      ease: 'out(3)',
      autoplay: false,
    }),
  ]);

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

  // Drive the carousel transition with anime.js instead of CSS transitions.
  useEffect(() => {
    slideRefs.current.forEach((el, i) => {
      if (!el) return;
      const offset = ringOffset(i, current, total);
      const visible = Math.abs(offset) <= 1;
      const target = {
        x: offset * spacing,
        scale: offset === 0 ? 1 : 0.72,
        opacity: visible ? (offset === 0 ? 1 : 0.45) : 0,
      };
      el.style.zIndex = offset === 0 ? 20 : visible ? 10 : 0;
      el.style.pointerEvents = visible ? 'auto' : 'none';
      el.parentElement.style.zIndex = offset === 0 ? 20 : visible ? 10 : 0;
      el.setAttribute('aria-hidden', visible ? 'false' : 'true');
      el.tabIndex = visible ? 0 : -1;

      if (prefersReducedMotion()) {
        el.style.transform = `translateX(${target.x}px) scale(${target.scale})`;
        el.style.opacity = target.opacity;
        return;
      }
      animate(el, { ...target, duration: 700, ease: 'out(3)' });
    });
  }, [current, spacing, total]);

  // Auto-rotate, paused while the modal is open.
  useEffect(() => {
    if (selected) return undefined;
    const id = setInterval(next, AUTO_ROTATE_MS);
    return () => clearInterval(id);
  }, [next, selected]);

  const onTouchStart = (e) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };
  const onTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };
  const onTouchEnd = () => {
    if (touchStart.current == null || touchEnd.current == null) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > SWIPE_THRESHOLD) next();
    if (distance < -SWIPE_THRESHOLD) prev();
  };

  return (
    <section ref={root} id="certificate" className="relative flex min-h-screen items-center py-24">
      <div className="section-shell text-center">
        <div className="cert-head anim-hidden">
          <span className="eyebrow">Credentials</span>
          <h2 className="section-title mt-5">Certificates</h2>
          <p className="section-sub">Achievements and certifications I have earned</p>
        </div>

        <div className="cert-stage anim-hidden relative mt-14">
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

          <div
            ref={stage}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className="relative mx-auto h-[300px] w-full overflow-hidden sm:h-[380px] lg:h-[460px]"
          >
            {certificates.map((cert, i) => (
              // The wrapper centers the slide with flex, leaving `transform`
              // entirely to anime.js.
              <div
                key={cert.id}
                className="pointer-events-none absolute inset-0 flex justify-center"
              >
                <button
                  type="button"
                  ref={(el) => (slideRefs.current[i] = el)}
                  onClick={() => (i === current ? setSelected(cert) : setCurrent(i))}
                  aria-label={`${cert.title} - open full size`}
                  className="cert-slide card h-full w-[64%] max-w-[520px] overflow-hidden p-3 opacity-0 sm:w-[56%]"
                  style={{ willChange: 'transform, opacity' }}
                >
                  <img
                    src={cert.thumb}
                    alt={cert.title}
                    loading="lazy"
                    className="h-full w-full object-contain"
                  />
                </button>
              </div>
            ))}
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

        <div className="mx-auto mt-8 max-w-xl">
          <h3 className="font-display text-base font-semibold sm:text-lg">
            {certificates[current].title}
          </h3>
          <p className="mt-2 text-xs leading-relaxed text-muted sm:text-sm">
            {certificates[current].description}
          </p>
        </div>

        <div className="mt-6 flex justify-center gap-2">
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
