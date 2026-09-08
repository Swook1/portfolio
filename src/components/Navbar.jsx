import { useEffect, useRef, useState } from 'react';
import { animate, createTimeline, stagger } from 'animejs';
import { navLinks } from '../data/socials';
import { useAnimeScope, prefersReducedMotion } from '../hooks/useAnimeScope';

const UNDERLINE_BASE = 100; // px — the bar is scaled from this width

export default function Navbar() {
  const [active, setActive] = useState('home');
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const linkRefs = useRef({});
  const underline = useRef(null);
  const mobilePanel = useRef(null);

  const root = useAnimeScope(() => {
    createTimeline({ defaults: { ease: 'out(3)' } })
      .add('.nav-brand', { opacity: [0, 1], y: [-20, 0], duration: 600 })
      .add(
        '.nav-link',
        { opacity: [0, 1], y: [-16, 0], duration: 500, delay: stagger(70) },
        '-=350'
      )
      .add('.nav-burger', { opacity: [0, 1], duration: 400 }, '<<');
  });

  // Which section is on screen -> drives the sliding underline.
  useEffect(() => {
    const sections = navLinks
      .map((l) => document.getElementById(l.id))
      .filter(Boolean);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: [0, 0.25, 0.5, 1] }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScrollY = () => setScrolled(window.scrollY > 24);
    onScrollY();
    window.addEventListener('scroll', onScrollY, { passive: true });
    return () => window.removeEventListener('scroll', onScrollY);
  }, []);

  // Slide the underline under the active link (transform only, no reflow).
  useEffect(() => {
    const el = linkRefs.current[active];
    const bar = underline.current;
    if (!el || !bar) return;

    const target = {
      x: el.offsetLeft,
      scaleX: el.offsetWidth / UNDERLINE_BASE,
      opacity: 1,
    };

    if (prefersReducedMotion()) {
      bar.style.transform = `translateX(${target.x}px) scaleX(${target.scaleX})`;
      bar.style.opacity = 1;
      return;
    }
    animate(bar, { ...target, duration: 450, ease: 'out(3)' });
  }, [active]);

  // Mobile panel open/close.
  useEffect(() => {
    const panel = mobilePanel.current;
    if (!panel) return;
    const height = menuOpen ? panel.scrollHeight : 0;
    if (prefersReducedMotion()) {
      panel.style.height = `${height}px`;
      panel.style.opacity = menuOpen ? 1 : 0;
      return;
    }
    animate(panel, {
      height: `${height}px`,
      opacity: menuOpen ? 1 : 0,
      duration: 380,
      ease: 'out(3)',
    });
    if (menuOpen) {
      animate(panel.querySelectorAll('.nav-mobile-link'), {
        opacity: [0, 1],
        x: [-16, 0],
        delay: stagger(50),
        duration: 350,
        ease: 'out(3)',
      });
    }
  }, [menuOpen]);

  const go = (e, id) => {
    e.preventDefault();
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav
      ref={root}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'nav-glass border-b border-line backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-12">
        <a
          href="#home"
          onClick={(e) => go(e, 'home')}
          className="nav-brand anim-hidden font-display text-lg font-bold tracking-tight text-ink sm:text-xl"
        >
          Rayyan<span className="text-accent">.</span>
        </a>

        {/* Desktop */}
        <div className="relative hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              ref={(el) => (linkRefs.current[link.id] = el)}
              onClick={(e) => go(e, link.id)}
              aria-current={active === link.id ? 'page' : undefined}
              className={`nav-link anim-hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 lg:text-base ${
                active === link.id ? 'text-accent-soft' : 'text-muted hover:text-ink'
              }`}
            >
              {link.label}
            </a>
          ))}
          <span
            ref={underline}
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 bg-accent opacity-0"
            style={{ width: `${UNDERLINE_BASE}px`, transformOrigin: 'left center' }}
          />
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          className="nav-burger anim-hidden flex h-10 w-10 flex-col items-center justify-center gap-1.5 rounded-lg border border-line md:hidden"
        >
          <span
            className={`h-0.5 w-5 bg-ink transition-transform duration-300 ${
              menuOpen ? 'translate-y-2 rotate-45' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 bg-ink transition-opacity duration-300 ${
              menuOpen ? 'opacity-0' : ''
            }`}
          />
          <span
            className={`h-0.5 w-5 bg-ink transition-transform duration-300 ${
              menuOpen ? '-translate-y-2 -rotate-45' : ''
            }`}
          />
        </button>
      </div>

      {/* Mobile panel */}
      <div
        ref={mobilePanel}
        className="nav-glass-solid overflow-hidden border-t border-line backdrop-blur-xl md:hidden"
        style={{ height: 0, opacity: 0 }}
      >
        <div className="space-y-1 px-5 py-4">
          {navLinks.map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={(e) => go(e, link.id)}
              className={`nav-mobile-link block rounded-lg px-4 py-3 text-base font-medium transition-colors ${
                active === link.id
                  ? 'nav-link-active text-accent-soft'
                  : 'text-muted hover:bg-surface hover:text-ink'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
