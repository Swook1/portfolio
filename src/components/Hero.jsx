import { useEffect, useRef } from 'react';
import { animate, createTimeline, stagger, utils } from 'animejs';
import person from '../assets/picture/rayyanganteng1.webp';
import { heroLinks } from '../data/socials';
import { useAnimeScope, prefersReducedMotion } from '../hooks/useAnimeScope';

export default function Hero() {
  const parallax = useRef(null);

  const root = useAnimeScope(() => {
    createTimeline({ defaults: { ease: 'out(3)', duration: 800 } })
      .add('.hero-eyebrow', { opacity: [0, 1], y: [20, 0] })
      .add('.hero-word', { opacity: [0, 1], y: [40, 0], delay: stagger(60) }, '-=550')
      .add('.hero-sub', { opacity: [0, 1], y: [24, 0] }, '-=500')
      .add('.hero-cta', { opacity: [0, 1], scale: [0.9, 1], delay: stagger(90) }, '-=550')
      .add('.hero-img', { opacity: [0, 1], x: [70, 0], duration: 1000 }, 200)
      .add('.hero-scroll', { opacity: [0, 1] }, '-=300');

    // Idle motion: portrait breathes, blobs drift.
    animate('.hero-img', {
      y: [0, -14, 0],
      duration: 6000,
      ease: 'inOut(2)',
      loop: true,
    });
    animate('.hero-blob-a', {
      x: [0, 60, 0],
      y: [0, -40, 0],
      duration: 14000,
      ease: 'inOut(2)',
      loop: true,
    });
    animate('.hero-blob-b', {
      x: [0, -50, 0],
      y: [0, 50, 0],
      duration: 18000,
      ease: 'inOut(2)',
      loop: true,
    });
  });

  // Light cursor parallax on the portrait + blobs.
  useEffect(() => {
    if (prefersReducedMotion()) return undefined;
    const layer = parallax.current;
    if (!layer) return undefined;

    const onMove = (e) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 2;
      const dy = (e.clientY / window.innerHeight - 0.5) * 2;
      animate(layer, {
        x: dx * 18,
        y: dy * 12,
        duration: 900,
        ease: 'out(3)',
      });
    };

    window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('pointermove', onMove);
      utils.remove(layer);
    };
  }, []);

  const name = "I'm Rayyan Zafier Leksono".split(' ');

  return (
    <section
      ref={root}
      id="home"
      className="noise relative flex min-h-screen items-end overflow-hidden pt-24 lg:items-center"
    >
      <div
        className="blob hero-blob-a -left-24 top-10 h-[420px] w-[420px]"
        style={{ background: 'var(--accent)' }}
      />
      <div
        className="blob hero-blob-b right-0 top-1/3 h-[360px] w-[360px]"
        style={{ background: '#7c3aed' }}
      />

      <div className="section-shell grid flex-1 items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div className="flex flex-col justify-center gap-6 text-center lg:text-left">
          <span className="hero-eyebrow anim-hidden eyebrow mx-auto w-fit self-center lg:mx-0 lg:self-start">Hi There,</span>

          <h1 className="font-display text-3xl font-bold leading-[1.15] tracking-tight sm:text-5xl lg:text-6xl">
            {name.map((word, i) => (
              <span key={i} className="hero-word anim-hidden mr-[0.28em] inline-block">
                {word === 'Rayyan' || word === 'Zafier' || word === 'Leksono' ? (
                  <span className="text-accent">{word}</span>
                ) : (
                  word
                )}
              </span>
            ))}
          </h1>

          <p className="hero-sub anim-hidden mx-auto max-w-xl text-sm leading-relaxed text-muted sm:text-base lg:mx-0 lg:text-lg">
            Student at Bina Nusantara University majoring in Computer Science with a stream in
            Software Engineering
          </p>

          <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
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

        <div ref={parallax} className="flex items-end justify-center lg:justify-end">
          <div className="relative">
            <div
              className="absolute inset-x-6 bottom-0 h-2/3 rounded-t-[999px]"
              style={{ background: 'var(--accent-dim)', filter: 'blur(40px)' }}
            />
            <img
              src={person}
              alt="Portrait of Rayyan Zafier Leksono"
              fetchPriority="high"
              className="hero-img anim-hidden relative h-[52vh] w-auto max-w-none object-contain object-bottom sm:h-[60vh] lg:h-[72vh]"
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
