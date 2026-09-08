import { useEffect } from 'react';
import Lenis from 'lenis';
import { prefersReducedMotion } from './useAnimeScope';
import { registerScroll } from '../lib/scroll';

/**
 * Quartic ease-in-out — the curve the page travels on.
 *
 * Half the distance is covered in the middle fifth of the time: it leaves
 * slowly, rushes, then eases into place.
 */
const quartInOut = (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2);

/**
 * Inertial scrolling for the whole page.
 *
 * Lenis intercepts the wheel and animates the document's real scroll position,
 * so `window.scrollY`, native `scroll` events and every IntersectionObserver on
 * the page keep working exactly as before — the reveals, the navbar underline
 * and the backdrop's camera flight all read the same numbers they always did,
 * they just arrive eased instead of in steps.
 *
 * Touch is left alone: phones already have momentum scrolling from the OS, and
 * overriding it fights the platform. Reduced motion skips Lenis entirely.
 */
export function useSmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    const lenis = new Lenis({
      // Fixed duration with an ease-IN-out, not a lerp and not an ease-out.
      // The slow start is the whole character: the page takes a beat to gather
      // itself, accelerates through the middle, and settles. An ease-out does
      // the opposite — all its speed up front and then a long creeping tail,
      // which is what reads as slow motion however short you make it.
      duration: 1.5,
      easing: quartInOut,
      // The wheel belongs to useSectionSnap; Lenis is the animator for the
      // jumps it makes, not a smoother for raw wheel input.
      smoothWheel: false,
      syncTouch: false,
      // Handles every in-page anchor that isn't already intercepted.
      anchors: true,
    });

    registerScroll(lenis);

    // A deep link still has to land on its section. The browser's own jump does
    // not survive Lenis taking over the scroll position, so it is redone here,
    // immediately and only when a hash actually names a section — an ordinary
    // visit must open at the top.
    const hash = window.location.hash.slice(1);
    const target = hash ? document.getElementById(hash) : null;
    if (target) lenis.scrollTo(target, { immediate: true });

    let frame = 0;
    const raf = (time) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      registerScroll(null);
      lenis.destroy();
    };
  }, []);
}
