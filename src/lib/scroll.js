let instance = null;

/** The smooth-scroll hook registers here; nothing else should call this. */
export function registerScroll(lenis) {
  instance = lenis;
}

/** The live Lenis instance, or null when it is not running. */
export function getScroll() {
  return instance;
}

/**
 * Scrolls to a section by id. Routed through Lenis when it is running so the
 * jump uses the same easing as a wheel scroll; falls back to the platform's own
 * smooth scroll on reduced motion, where Lenis is never created.
 */
export function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  if (instance) instance.scrollTo(target, { offset: 0 });
  else target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
