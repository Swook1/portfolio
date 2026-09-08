import { createTimeline, stagger } from 'animejs';
import person from '../assets/picture/rayyanganteng1.webp';
import { heroLinks } from '../data/socials';
import { useAnimeScope } from '../hooks/useAnimeScope';

const facts = ['Jakarta, Indonesia', 'Fullstack Development', 'Computer Science'];

export default function Hero() {
  const root = useAnimeScope(() => {
    // Entrance only. The portrait fades in once and then never moves again —
    // no idle loop, no cursor parallax.
    createTimeline({ defaults: { ease: 'out(3)', duration: 800 } })
      .add('.hero-panel', { opacity: [0, 1], scale: [0.96, 1], duration: 900 }, 100)
      .add('.hero-img', { opacity: [0, 1], y: [24, 0], duration: 900 }, 250)
      .add('.hero-eyebrow', { opacity: [0, 1], y: [20, 0] }, 0)
      .add('.hero-word', { opacity: [0, 1], y: [40, 0], delay: stagger(55) }, 150)
      .add('.hero-sub', { opacity: [0, 1], y: [24, 0] }, 500)
      .add('.hero-fact', { opacity: [0, 1], y: [16, 0], delay: stagger(80) }, 650)
      .add('.hero-cta', { opacity: [0, 1], scale: [0.92, 1], delay: stagger(90) }, 750)
      .add('.hero-badge', { opacity: [0, 1], x: [-20, 0] }, 900)
      .add('.hero-scroll', { opacity: [0, 1] }, 1100);
  });

  const name = "I'm Rayyan Zafier Leksono".split(' ');

  return (
    <section
      ref={root}
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden pb-16 pt-28 lg:pb-0 lg:pt-24"
    >
      <div
        data-scroll-fade
        className="section-shell grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8"
      >
        <div className="flex flex-col justify-center gap-6 text-center lg:text-left">
          <span className="hero-eyebrow anim-hidden eyebrow mx-auto w-fit self-center lg:mx-0 lg:self-start">
            Hi There,
          </span>

          <h1 className="font-display text-3xl font-bold leading-[1.12] tracking-tight sm:text-5xl lg:text-[3.4rem]">
            {name.map((word, i) => (
              <span key={i} className="hero-word anim-hidden mr-[0.26em] inline-block">
                {i > 0 ? <span className="text-accent">{word}</span> : word}
              </span>
            ))}
          </h1>

          <p className="hero-sub anim-hidden mx-auto max-w-xl text-sm leading-relaxed text-muted sm:text-base lg:mx-0 lg:text-lg">
            Fullstack Developer and Computer Science student at Bina Nusantara University
          </p>

          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-2 lg:justify-start">
            {facts.map((fact) => (
              <li
                key={fact}
                className="hero-fact anim-hidden flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-dim sm:text-sm"
              >
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-accent" />
                {fact}
              </li>
            ))}
          </ul>

          <div className="mt-1 flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
            {heroLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`hero-cta anim-hidden btn ${i === 0 ? 'btn-primary' : 'btn-ghost'}`}
              >
                <img src={link.icon} alt="" aria-hidden="true" className="h-5 w-5" />
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* Portrait: seated in a static frame, no motion of its own. */}
        <div className="relative flex justify-center lg:justify-end">
          <div className="relative w-full max-w-[340px] sm:max-w-[400px] lg:max-w-[480px]">
            <div className="hero-panel anim-hidden portrait-panel" aria-hidden="true">
              <span className="portrait-corner portrait-corner--tl" />
              <span className="portrait-corner portrait-corner--br" />
            </div>

            <img
              src={person}
              alt="Portrait of Rayyan Zafier Leksono"
              fetchPriority="high"
              className="hero-img anim-hidden relative z-10 mx-auto block w-full object-contain object-bottom"
            />
          </div>
        </div>
      </div>

      <a
        href="#about"
        className="hero-scroll anim-hidden absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-xs uppercase tracking-[0.25em] text-dim transition-colors hover:text-accent-soft lg:flex"
      >
        Scroll
        <span className="h-8 w-px" style={{ background: 'var(--border)' }} />
      </a>
    </section>
  );
}
