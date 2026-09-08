import { useEffect } from 'react';
import { prefersReducedMotion } from './useAnimeScope';
import { getScroll } from '../lib/scroll';

const GESTURE = 55; // px of wheel that counts as one deliberate flick
const QUIET_MS = 110; // wheel silence that ends a gesture
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
 * One flick, one section — without ever stopping the page mid-move.
 *
 * The movement is a chase rather than a fixed animation: the section is a
 * target and Lenis eases the document toward it every frame. Re-aiming
 * mid-flight only moves the target, so flicking twice runs on through two
 * sections in one continuous glide instead of stopping and restarting. Nothing
 * is ever locked out — what is rate-limited is *starting a new gesture*, which
 * needs the wheel to fall quiet first, so trackpad momentum cannot spend itself
 * paging through the whole site.
 *
 * The hook only claims the wheel when it is actually going to page; everything
 * else it hands on to Lenis, which smooths it as usual:
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
    let armed = true; // false until the wheel goes quiet again
    let quiet = 0;
    let aim = null; // section we are already heading for, while still moving

    const endGesture = () => {
      clearTimeout(quiet);
      quiet = setTimeout(() => {
        armed = true;
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
      const list = pages();
      const target = list[index];
      if (!lenis || !target) return false;
      // No duration and no lock: Lenis' configured lerp chases whatever the
      // target currently is, so a second call while this one is still running
      // re-aims it rather than cutting it off.
      lenis.scrollTo(target);
      return true;
    };

    const step = (dir) => {
      const lenis = getScroll();
      const list = pages();
      if (!list.length) return false;

      // Count from where we are HEADING, not from where the page happens to be
      // right now. Mid-flight the nearest section is still the one we are
      // leaving, so measuring position would make a second flick re-target the
      // same section and the gesture would appear to do nothing.
      const from = aim !== null && lenis?.isScrolling ? aim : currentIndex(list);
      const next = from + dir;
      if (next < 0 || next >= list.length) return false;

      aim = next;
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
      endGesture();

      if (!armed) return;

      travel += event.deltaY;
      if (Math.abs(travel) < GESTURE) return;

      travel = 0;
      armed = false;
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
        go(event.key === 'Home' ? 0 : list.length - 1);
        return;
      }

      const dir = KEYS[event.key] * (event.key === ' ' && event.shiftKey ? -1 : 1);
      if (!dir) return;
      if (scrollableAncestor(event.target, dir)) return;
      if (roomInside(list[currentIndex(list)], dir)) return;
      if (step(dir)) event.preventDefault();
    };

    window.addEventListener('wheel', onWheel, { passive: false, capture: true });
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(quiet);
      window.removeEventListener('wheel', onWheel, { capture: true });
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
