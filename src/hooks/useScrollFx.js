import { useEffect } from 'react';
import { prefersReducedMotion } from './useAnimeScope';

/**
 * One scroll listener for the whole page, batched into a single rAF frame.
 *
 * It drives three things:
 *  - the progress bar under the navbar (`#scroll-progress`), scaled 0 -> 1
 *  - every `[data-parallax]` layer, translated by `scrollY * speed`
 *  - every `[data-scroll-fade]` block, which sinks and fades as the first
 *    viewport scrolls past
 *
 * Parallax layers are decorative and oversized, and nothing else writes to
 * their transform, so this is the only owner of that property. Under reduced
 * motion the parallax is skipped and only the progress bar keeps updating.
 */
export function useScrollFx() {
  useEffect(() => {
    const motionOk = !prefersReducedMotion();
    const bar = document.getElementById('scroll-progress');
    const layers = motionOk ? Array.from(document.querySelectorAll('[data-parallax]')) : [];
    const faders = motionOk ? Array.from(document.querySelectorAll('[data-scroll-fade]')) : [];

    let frame = 0;

    const render = () => {
      frame = 0;
      const y = window.scrollY;

      if (bar) {
        const max = document.documentElement.scrollHeight - window.innerHeight;
        bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;
      }

      for (const el of layers) {
        const speed = parseFloat(el.dataset.parallax) || 0;
        el.style.transform = `translate3d(0, ${(-y * speed).toFixed(2)}px, 0)`;
      }

      // Content that recedes as its section scrolls away. The effect holds off
      // for the first tenth of a viewport so a nudge of the wheel doesn't
      // immediately dim the hero.
      if (faders.length) {
        const vh = window.innerHeight;
        const t = Math.min(Math.max((y - vh * 0.1) / (vh * 0.8), 0), 1);
        const opacity = (1 - t * 0.65).toFixed(3);
        const shift = (t * 60).toFixed(2);
        for (const el of faders) {
          el.style.opacity = opacity;
          el.style.transform = `translate3d(0, ${shift}px, 0)`;
        }
      }
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
}
