import { useEffect } from 'react';
import { prefersReducedMotion } from './useAnimeScope';
import { getScroll } from '../lib/scroll';

const DURATION_MS = 1500; // must match the Lenis duration in useSmoothScroll
const GESTURE = 55; // px of wheel that counts as one deliberate flick
const QUIET_MS = 140; // wheel silence needed before the next flick is accepted
const EDGE = 6; // px of slack when deciding a tall section is at its edge

/** Every full-height block the page pages between, in document order. */
function pages() {
  const list = Array.from(document.querySelectorAll('main > section[id]'));
  const footer = document.getElementById('footer');
  if (footer) list.push(footer);
  return list;
}

/** Index of the page currently filling the viewport. */
function currentIndex(list) {
  let best = 0;
  let bestDistance = Infinity;
  list.forEach((el, i) => {
    const distance = Math.abs(el.getBoundingClientRect().top);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  });
  return best;
}

/**
 * The nearest ancestor of `node` that can still scroll in `dir` itself.
 *
 * The projects rail is the reason this exists: it is a scrolling column of its
 * own, and a wheel over it has to move the rail rather than page the document.
 */
function scrollableAncestor(node, dir) {
  let el = node instanceof Element ? node : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const style = getComputedStyle(el);
    const scrolls = /auto|scroll|overlay/.test(style.overflowY);
    if (scrolls && el.scrollHeight > el.clientHeight + 1) {
      const room =
        dir > 0 ? el.scrollTop + el.clientHeight < el.scrollHeight - 1 : el.scrollTop > 1;
      if (room) return el;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * One flick, one section.
 *
 * A move runs to completion before the next one is accepted. That is deliberate
 * rather than a limitation: the travel is a fixed 1.5s on an ease-in-out curve,
 * so it leaves slowly, accelerates, and settles — and interrupting it would
 * restart that curve from zero, throwing away the speed it had built and
 * turning the whole thing into slow motion. Trackpad momentum is swallowed
 * while the move runs, so one flick can never spend itself paging through the
 * whole site.
 *
 * The hook only claims the wheel when it is actually going to page; everything
 * else it hands on:
 *  - a section taller than the viewport, until it is scrolled to its own edge
 *  - anything inside its own scrollable box (the projects rail)
 *  - an open modal
 *
 * Narrow viewports and reduced motion never arm it: phones have sections taller
 * than the screen and momentum scrolling of their own.
 */
export function useSectionSnap() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    if (!window.matchMedia('(min-width: 1024px)').matches) return undefined;

    let travel = 0; // wheel accumulated within the current gesture
    let moving = false; // a page turn is in flight
    let quiet = 0;
    let watchdog = 0;

    // The move is over, but the wheel usually is not: trackpad momentum runs on
    // for a while after the fingers lift. Rearming only once it falls quiet is
    // what keeps one flick to one section.
    const rearmWhenQuiet = () => {
      clearTimeout(quiet);
      quiet = setTimeout(() => {
        moving = false;
        travel = 0;
      }, QUIET_MS);
    };

    const modalOpen = () => Boolean(document.querySelector('[role="dialog"][aria-modal="true"]'));

    /** True when the current section is taller than the viewport and has room left. */
    const roomInside = (el, dir) => {
      const rect = el.getBoundingClientRect();
      if (rect.height <= window.innerHeight + EDGE) return false;
      return dir > 0 ? rect.bottom > window.innerHeight + EDGE : rect.top < -EDGE;
    };

    const go = (index) => {
      const lenis = getScroll();
      const target = pages()[index];
      if (!lenis || !target) return false;

      moving = true;
      // If onComplete never arrives — a tab hidden mid-animation, a jump with
      // nowhere to go — the page must not be left unscrollable.
      clearTimeout(watchdog);
      watchdog = setTimeout(rearmWhenQuiet, DURATION_MS + 400);

      lenis.scrollTo(target, {
        // Locked for the duration: this curve is only itself when it runs start
        // to finish, and a competing scroll mid-flight would restart it.
        lock: true,
        onComplete: () => {
          clearTimeout(watchdog);
          rearmWhenQuiet();
        },
      });
      return true;
    };

    const step = (dir) => {
      const list = pages();
      if (!list.length) return false;
      const next = currentIndex(list) + dir;
      if (next < 0 || next >= list.length) return false;
      return go(next);
    };

    // Capture phase, so this runs before Lenis' own wheel handler and can take
    // the event away from it when the gesture is a page turn.
    const onWheel = (event) => {
      if (event.ctrlKey) return; // pinch zoom
      if (modalOpen()) return;

      const dir = Math.sign(event.deltaY);
      if (!dir) return;

      // Both of these belong to someone else. Hand the event on and treat the
      // gesture as spent, so reaching an edge never pages on the same flick.
      if (scrollableAncestor(event.target, dir)) {
        travel = 0;
        return;
      }
      const list = pages();
      if (list.length && roomInside(list[currentIndex(list)], dir)) {
        travel = 0;
        return;
      }

      // From here the wheel is ours: Lenis must not scroll the document too, or
      // the page would drift out of alignment between sections.
      event.preventDefault();
      event.stopPropagation();

      if (moving) {
        // Momentum from the flick that started this move. Swallow it, and keep
        // pushing the rearm back until it stops.
        rearmWhenQuiet();
        return;
      }

      travel += event.deltaY;
      if (Math.abs(travel) < GESTURE) return;

      travel = 0;
      step(dir);
    };

    const KEYS = { PageDown: 1, PageUp: -1, ArrowDown: 1, ArrowUp: -1, ' ': 1 };

    const onKey = (event) => {
      if (modalOpen()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;

      const list = pages();
      if (!list.length) return;

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (!moving) go(event.key === 'Home' ? 0 : list.length - 1);
        return;
      }

      const dir = KEYS[event.key] * (event.key === ' ' && event.shiftKey ? -1 : 1);
      if (!dir) return;
      if (moving) {
        // Swallow it rather than letting the browser scroll under the move.
        event.preventDefault();
        return;
      }
      if (scrollableAncestor(event.target, dir)) return;
      if (roomInside(list[currentIndex(list)], dir)) return;
      if (step(dir)) event.preventDefault();
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(quiet);
      clearTimeout(watchdog);
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
