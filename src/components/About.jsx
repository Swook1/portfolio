import { animate, stagger } from 'animejs';
import portrait from '../assets/picture/rayyanganteng2.webp';
import portraitAvatar from '../assets/picture/rayyanganteng2-avatar.webp';
import { useAnimeScope, splitReveal } from '../hooks/useAnimeScope';

const paragraphs = [
  "I'm an Indonesian developer based in Jakarta. I believe I can reach my goal as a developer, and I'm committed to learning and to taking other people's input on board.",
  "I'm a Computer Science student at Bina Nusantara University, taking the Software Engineering stream. Most of my work is fullstack web development, and I enjoy exploring beyond it, such as IoT and embedded systems, and artificial intelligence.",
  'Beyond coding, my interests include Sports, Gym, Movies, and Bouldering, which help me maintain a balanced lifestyle and inspire creativity in my work.',
];

const details = [
  { label: 'Based in', value: 'Jakarta, Indonesia' },
  { label: 'University', value: 'Bina Nusantara' },
  { label: 'Major', value: 'Computer Science' },
  { label: 'Stream', value: 'Software Engineering' },
];

export default function About() {
  const root = useAnimeScope(() => [
    animate('.about-avatar', {
      opacity: [0, 1],
      scale: [0.8, 1],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.about-media', {
      opacity: [0, 1],
      x: [-40, 0],
      duration: 900,
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.about-frame', {
      opacity: [0, 1],
      scale: [0.94, 1],
      duration: 900,
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.about-step', {
      opacity: [0, 1],
      y: [26, 0],
      duration: 700,
      delay: stagger(110, { start: 150 }),
      ease: 'out(3)',
      autoplay: false,
    }),
    splitReveal('.section-title', { start: 150 }),
    animate('.about-detail', {
      opacity: [0, 1],
      y: [18, 0],
      duration: 600,
      delay: stagger(80, { start: 500 }),
      ease: 'out(3)',
      autoplay: false,
    }),
  ]);

  return (
    <section
      ref={root}
      id="about"
      className="section-tint relative flex min-h-screen items-center overflow-hidden py-28"
    >
      <div className="section-shell grid items-center gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        {/* Photo, framed and still. The source is a tall portrait, so at full
            width it fills most of a phone screen on its own — below lg it is
            replaced by the avatar in the heading instead. */}
        <div className="order-2 hidden justify-center lg:order-1 lg:flex lg:justify-start">
          <div className="relative w-full max-w-sm">
            <div className="about-frame anim-hidden about-frame-box" aria-hidden="true" />
            <img
              src={portrait}
              alt="Rayyan Zafier Leksono outdoors"
              loading="lazy"
              className="about-media anim-hidden relative z-10 h-auto w-full rounded-2xl border object-cover shadow-2xl"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>

        <div className="order-1 text-center lg:order-2 lg:text-left">
          {/* Its own crop rather than the full portrait: a phone was pulling
              320KB to paint 88px of face. */}
          <img
            src={portraitAvatar}
            alt="Rayyan Zafier Leksono"
            width="88"
            height="88"
            loading="lazy"
            className="about-avatar anim-hidden lg:hidden"
          />
          <span className="about-step anim-hidden eyebrow">About</span>
          <h2 className="section-title mt-5">
            A little more <span className="text-accent">about me</span>
          </h2>

          <div className="mt-7 space-y-5">
            {paragraphs.map((text) => (
              <p
                key={text.slice(0, 24)}
                className="about-step anim-hidden text-sm leading-relaxed text-muted sm:text-base lg:text-[1.05rem]"
              >
                {text}
              </p>
            ))}
          </div>

          <dl className="mt-10 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border sm:grid-cols-2"
              style={{ borderColor: 'var(--border)', background: 'var(--border)' }}>
            {details.map((item) => (
              <div
                key={item.label}
                className="about-detail anim-hidden px-5 py-4 text-center sm:text-left"
                style={{ background: 'var(--surface)' }}
              >
                <dt className="text-xs uppercase tracking-[0.18em] text-dim">{item.label}</dt>
                <dd className="mt-1 text-sm font-medium text-ink sm:text-base">{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
