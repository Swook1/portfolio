import { animate, stagger } from 'animejs';
import { contacts } from '../data/socials';
import { ReactLogo, TailwindLogo } from '../data/skills';
import { useAnimeScope } from '../hooks/useAnimeScope';

const credits = [
  { name: 'React', icon: ReactLogo },
  { name: 'anime.js', icon: null },
  { name: 'Tailwind CSS', icon: TailwindLogo },
];

export default function Footer() {
  const root = useAnimeScope(() => [
    animate('.foot-block', {
      opacity: [0, 1],
      y: [24, 0],
      duration: 700,
      delay: stagger(120),
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.foot-contact', {
      opacity: [0, 1],
      x: [20, 0],
      duration: 600,
      delay: stagger(80, { start: 200 }),
      ease: 'out(3)',
      autoplay: false,
    }),
  ]);

  return (
    <footer
      ref={root}
      id="footer"
      className="section-tint relative border-t pt-14"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="section-shell">
        <div className="flex flex-col justify-between gap-10 lg:flex-row">
          <div className="foot-block anim-hidden flex-1 text-center lg:text-left">
            <h3 className="font-display text-lg font-bold">Site Credits</h3>
            <p className="mt-3 text-sm text-muted sm:text-base">
              Built using modern web technologies 🔥
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm text-muted lg:justify-start">
              {credits.map((c) => (
                <span key={c.name} className="flex items-center gap-1.5">
                  {c.icon ? (
                    <img src={c.icon} alt="" aria-hidden="true" className="h-4 w-4" />
                  ) : (
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                  )}
                  {c.name}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm text-dim">
              Designed and developed by Rayyan Zafier Leksono
            </p>
          </div>

          <div className="foot-block anim-hidden flex-1 text-center lg:text-right">
            <h3 className="font-display text-lg font-bold">Contacts</h3>
            <div className="mt-4 space-y-2">
              {contacts.map((c) => (
                <a
                  key={c.name}
                  href={c.href}
                  target={c.href.startsWith('mailto:') ? undefined : '_blank'}
                  rel="noopener noreferrer"
                  style={{ '--hover': c.hover }}
                  className="foot-contact anim-hidden flex items-center justify-center gap-3 text-sm text-muted transition-colors duration-200 hover:text-[color:var(--hover)] sm:text-base lg:justify-end"
                >
                  <img src={c.icon} alt="" aria-hidden="true" className="h-7 w-7 flex-shrink-0" />
                  <span>{c.label}</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="my-8 border-t" style={{ borderColor: 'var(--border)' }} />

        <div className="pb-8 text-center">
          <p className="text-sm text-muted">
            © {new Date().getFullYear()} Rayyan Zafier Leksono. All rights reserved.
          </p>
          <p className="mt-1 text-xs text-dim sm:text-sm">
            Made with passion for web development and clean design
          </p>
        </div>
      </div>
    </footer>
  );
}
