import { animate, stagger } from 'animejs';
import portrait from '../assets/picture/rayyanganteng2.webp';
import { useAnimeScope } from '../hooks/useAnimeScope';

const paragraphs = [
  "I'm an Indonesian, born in Jakarta with three younger siblings. I believe that I can achieve my goal as a developer. I am committed to learning and accepting others' input.",
  "I have a strong passion for continuously learning and exploring new technologies. As a Computer Science student at Bina Nusantara University, I'm always eager to expand my knowledge in software or website development and stay updated with the latest industry trends.",
  'Beyond coding, my interests include Sports, Gym, Movies, and Comics, which help me maintain a balanced lifestyle and inspire creativity in my work.',
];

const details = [
  { label: 'Based in', value: 'Jakarta, Indonesia' },
  { label: 'University', value: 'Bina Nusantara' },
  { label: 'Major', value: 'Computer Science' },
  { label: 'Stream', value: 'Software Engineering' },
];

export default function About() {
  const root = useAnimeScope(() => [
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
        {/* Photo, framed and still. */}
        <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
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
          <span className="about-step anim-hidden eyebrow">About</span>
          <h2 className="about-step anim-hidden section-title mt-5">
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
