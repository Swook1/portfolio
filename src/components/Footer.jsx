import { animate, createSpring, stagger, svg } from 'animejs';
import { contacts, heroLinks, navLinks } from '../data/socials';
import { ReactLogo, TailwindLogo } from '../data/skills';
import { useAnimeScope, prefersReducedMotion, splitReveal } from '../hooks/useAnimeScope';
import { scrollToSection } from '../lib/scroll';

const EMAIL = contacts.find((c) => c.name === 'Email');

const credits = [
  { name: 'React', icon: ReactLogo },
  { name: 'Tailwind', icon: TailwindLogo },
  { name: 'three.js', icon: null },
  { name: 'anime.js', icon: null },
];

export default function Footer() {
  const root = useAnimeScope(() => {
    const line = animate(svg.createDrawable('.foot-rule-path'), {
      draw: ['0 0', '0 1'],
      duration: 1200,
      ease: 'out(3)',
      autoplay: false,
    });

    const cta = animate('.foot-cta-sub, .foot-cta-actions', {
      opacity: [0, 1],
      y: [22, 0],
      duration: 700,
      delay: stagger(110, { start: 280 }),
      ease: 'out(3)',
      autoplay: false,
    });

    const cards = animate('.foot-card', {
      opacity: [0, 1],
      y: [26, 0],
      scale: [0.96, 1],
      duration: 700,
      delay: stagger(70, { start: 200 }),
      ease: createSpring({ stiffness: 100, damping: 16 }),
      autoplay: false,
    });

    const tail = animate('.foot-tail', {
      opacity: [0, 1],
      y: [16, 0],
      duration: 600,
      delay: stagger(90, { start: 420 }),
      ease: 'out(3)',
      autoplay: false,
    });

    return [line, splitReveal('.foot-cta-title', { charDelay: 18, start: 120 }), cta, cards, tail];
  });

  // Copies the address and reports back on the button itself — a mailto link
  // is useless to anyone without a desktop mail client configured.
  const copyEmail = async (event) => {
    const button = event.currentTarget;
    try {
      await navigator.clipboard.writeText(EMAIL.label);
    } catch {
      return; // clipboard blocked; the mailto link beside it still works
    }
    button.dataset.copied = 'true';
    if (!prefersReducedMotion()) {
      animate(button, {
        scale: [1, 1.06, 1],
        duration: 420,
        ease: createSpring({ stiffness: 180, damping: 12 }),
      });
    }
    setTimeout(() => {
      delete button.dataset.copied;
    }, 1800);
  };

  const toTop = () => scrollToSection('home');

  return (
    <footer ref={root} id="footer" className="foot section-tint relative overflow-hidden">
      {/* One drawn line instead of a border: it draws itself as the footer
          arrives, which is the same entrance the rest of the site uses. */}
      <svg className="foot-rule" viewBox="0 0 1200 2" preserveAspectRatio="none" aria-hidden="true">
        <line className="foot-rule-path" x1="0" y1="1" x2="1200" y2="1" />
      </svg>

      <div className="section-shell relative">
        <div className="foot-cta">
          <span className="eyebrow">Get in touch</span>
          <h2 className="foot-cta-title">
            Let&apos;s build <span className="text-accent">something</span>
          </h2>
          <p className="foot-cta-sub anim-hidden">
            Open to freelance work, and anything worth learning from. The fastest way
            to reach me is email or the rest are below.
          </p>

          <div className="foot-cta-actions anim-hidden">
            <a href={EMAIL.href} className="btn btn-primary">
              <img src={EMAIL.icon} alt="" aria-hidden="true" className="h-5 w-5" />
              {EMAIL.label}
            </a>
            <button type="button" onClick={copyEmail} className="btn btn-ghost foot-copy">
              <span className="foot-copy-idle">Copy address</span>
              <span className="foot-copy-done" aria-hidden="true">
                Copied
              </span>
            </button>
          </div>
        </div>

        {/* Every channel as a real target rather than a list of small links. */}
        <ul className="foot-grid">
          {contacts.map((contact) => (
            <li key={contact.name}>
              <a
                href={contact.href}
                target={contact.href.startsWith('mailto:') ? undefined : '_blank'}
                rel="noopener noreferrer"
                style={{ '--hover': contact.hover }}
                className="foot-card anim-hidden"
              >
                <img src={contact.icon} alt="" aria-hidden="true" />
                <span className="foot-card-name">{contact.name}</span>
                <span className="foot-card-label">{contact.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="foot-bar">
          <nav className="foot-tail anim-hidden foot-nav" aria-label="Footer">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={(event) => {
                  event.preventDefault();
                  scrollToSection(link.id);
                }}
              >
                {link.label}
              </a>
            ))}
          </nav>

          <div className="foot-tail anim-hidden foot-social">
            {heroLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.name}
                style={{ '--hover': link.brand }}
              >
                <img src={link.icon} alt="" aria-hidden="true" />
              </a>
            ))}
            <button type="button" onClick={toTop} aria-label="Back to top" className="foot-top">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="foot-tail anim-hidden foot-fine">
          <p>© {new Date().getFullYear()} Rayyan Zafier Leksono</p>
          <p className="foot-credits">
            Built with
            {credits.map((credit) => (
              <span key={credit.name}>
                {credit.icon ? (
                  <img src={credit.icon} alt="" aria-hidden="true" />
                ) : (
                  <i aria-hidden="true" />
                )}
                {credit.name}
              </span>
            ))}
          </p>
        </div>
      </div>

      {/* Oversized wordmark, mostly cropped by the footer's edge. */}
      <span className="foot-mark" aria-hidden="true">
        RAYYAN
      </span>
    </footer>
  );
}
