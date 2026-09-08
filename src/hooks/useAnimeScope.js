import { useEffect, useRef } from 'react';
import { createScope } from 'animejs';

/** True when the visitor asked the OS to reduce motion. */
export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Scoped anime.js setup for a section component.
 *
 * `setup` receives the anime.js scope; declare every animate()/timeline inside
 * it so `scope.revert()` cleans them up on unmount. Anything the setup returns
 * (one animation or an array of them) is treated as a scroll reveal: it stays
 * paused until the section first enters the viewport, then plays once. An
 * IntersectionObserver drives that rather than anime's own onScroll, so jumping
 * straight to a section from the navbar still triggers it.
 *
 * When the visitor prefers reduced motion the setup never runs — the
 * `.anim-hidden` CSS rule flips to `opacity: 1` in that case, so content stays
 * visible.
 *
 * Returns the ref to attach to the section root.
 */
export function useAnimeScope(setup, deps = []) {
  const root = useRef(null);
  const scope = useRef(null);

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let deferred = [];
    scope.current = createScope({ root }).add((self) => {
      const result = setup(self);
      deferred = Array.isArray(result) ? result.filter(Boolean) : result ? [result] : [];
    });

    // The observer is created unconditionally: anime.js may fill `deferred`
    // after `add()` returns, so the array is read at intersection time and the
    // observer only disconnects once it actually had something to play.
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (!deferred.length) return;
        deferred.forEach((anim) => anim.play());
        observer.disconnect();
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0 }
    );
    if (root.current) observer.observe(root.current);

    return () => {
      observer?.disconnect();
      scope.current?.revert();
      scope.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return root;
}
