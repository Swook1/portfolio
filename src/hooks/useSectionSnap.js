import { useEffect } from 'react';
import { prefersReducedMotion } from './useAnimeScope';
import { getScroll } from '../lib/scroll';

const DURATION = 1.0; // seconds per page
const QUIET_MS = 160; // wheel silence needed before the next page is allowed
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
        dir > 0
          ? el.scrollTop + el.clientHeight < el.scrollHeight - 1
          : el.scrollTop > 1;
      if (room) return el;
    }
    el = el.parentElement;
  }
  return null;
}

/**
 * One gesture, one section.
 *
 * Rather than easing the wheel — which just made the same scroll slower — each
 * wheel gesture, swipe or page key moves the document to the next section and
 * refuses further input until it has landed and the wheel has gone quiet. Lenis
 * animates the jump, so the easing is the same one the anchors use.
 *
 * Three things opt out, because paging past content the visitor cannot see is
 * worse than not paging at all:
 *  - a section taller than the viewport, until it is scrolled to its own edge
 *  - anything inside its own scrollable box (the projects rail)
 *  - an open modal
 *
 * Reduced motion and narrow viewports never arm it: phones have sections taller
 * than the screen and momentum scrolling of their own.
 */
export function useSectionSnap() {
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    if (!window.matchMedia('(min-width: 1024px)').matches) return undefined;

    let locked = false;
    let quiet = 0;
    let watchdog = 0;

    const releaseWhenQuiet = () => {
      clearTimeout(quiet);
      quiet = setTimeout(() => {
        locked = false;
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
      const list = pages();
      const target = list[index];
      if (!lenis || !target) return false;

      locked = true;
      // If onComplete never arrives — a jump with nowhere to go, a tab that was
      // hidden mid-animation — the page must not be left unscrollable.
      clearTimeout(watchdog);
      watchdog = setTimeout(releaseWhenQuiet, DURATION * 1000 + 400);

      lenis.scrollTo(target, {
        duration: DURATION,
        lock: true,
        onComplete: () => {
          clearTimeout(watchdog);
          releaseWhenQuiet();
        },
      });
      return true;
    };

    const step = (dir) => {
      const list = pages();
      if (!list.length) return false;
      const index = currentIndex(list);
      if (roomInside(list[index], dir)) return false;

      const next = index + dir;
      if (next < 0 || next >= list.length) return false;
      return go(next);
    };

    const onWheel = (event) => {
      if (event.ctrlKey) return; // pinch zoom
      if (modalOpen()) return;

      const dir = Math.sign(event.deltaY);
      if (!dir) return;

      // Checked before the lock so a rail stays scrollable even mid-page.
      if (scrollableAncestor(event.target, dir)) return;

      if (locked) {
        // Trackpad momentum keeps firing long after the gesture; swallow it and
        // hold the lock open until it stops, so one flick is one page.
        event.preventDefault();
        releaseWhenQuiet();
        return;
      }

      const list = pages();
      if (list.length && roomInside(list[currentIndex(list)], dir)) return;

      event.preventDefault();
      step(dir);
    };

    const KEYS = {
      PageDown: 1,
      PageUp: -1,
      ArrowDown: 1,
      ArrowUp: -1,
      ' ': 1,
    };

    const onKey = (event) => {
      if (modalOpen()) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || event.target?.isContentEditable) return;

      const list = pages();
      if (!list.length) return;

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        go(event.key === 'Home' ? 0 : list.length - 1);
        return;
      }

      const dir = KEYS[event.key] * (event.key === ' ' && event.shiftKey ? -1 : 1);
      if (!dir) return;
      if (scrollableAncestor(event.target, dir)) return;
      if (step(dir)) event.preventDefault();
    };

    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(quiet);
      clearTimeout(watchdog);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
