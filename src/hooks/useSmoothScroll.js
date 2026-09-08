import { useEffect } from 'react';
import Lenis from 'lenis';
import { prefersReducedMotion } from './useAnimeScope';
import { registerScroll } from '../lib/scroll';

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
      duration: 1.15,
      // A long tail: the page keeps drifting after the wheel stops, which is
      // what gives the weight.
      easing: (t) => 1 - Math.pow(1 - t, 3),
      smoothWheel: true,
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
