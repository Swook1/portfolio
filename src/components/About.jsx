import { animate, stagger } from 'animejs';
import portrait from '../assets/picture/rayyanganteng2.webp';
import { useAnimeScope } from '../hooks/useAnimeScope';

const paragraphs = [
  "I'm an Indonesian, born in Jakarta with three younger siblings. I believe that I can achieve my goal as a developer. I am committed to learning and accepting others' input.",
  "I have a strong passion for continuously learning and exploring new technologies. As a Computer Science student at Bina Nusantara University, I'm always eager to expand my knowledge in software or website development and stay updated with the latest industry trends.",
  'Beyond coding, my interests include Sports, Gym, Movies, and Comics, which help me maintain a balanced lifestyle and inspire creativity in my work.',
];

export default function About() {
  const root = useAnimeScope(() => [
    animate('.about-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.about-p', {
      opacity: [0, 1],
      y: [28, 0],
      duration: 700,
      delay: stagger(120),
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.about-img', {
      opacity: [0, 1],
      scale: [1.08, 1],
      clipPath: ['inset(0 0 100% 0)', 'inset(0 0 0% 0)'],
      duration: 1100,
      ease: 'out(4)',
      autoplay: false,
    }),
  ]);

  return (
    <section
      ref={root}
      id="about"
      className="relative flex min-h-screen items-center overflow-hidden py-24"
      style={{ background: 'var(--bg-alt)' }}
    >
      <div
        className="blob left-1/4 top-1/4 h-[380px] w-[380px]"
        style={{ background: 'var(--accent)', opacity: 0.12 }}
      />

      <div className="section-shell grid items-center gap-12 lg:grid-cols-2">
        <div className="text-center lg:text-left">
          <div className="about-head anim-hidden">
            <span className="eyebrow">About</span>
            <h2 className="section-title mt-5">About Me</h2>
          </div>
          <div className="mt-8 space-y-5">
            {paragraphs.map((text, i) => (
              <p
                key={i}
                className="about-p anim-hidden text-sm leading-relaxed text-muted sm:text-base lg:text-lg"
              >
                {text}
              </p>
            ))}
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <div className="relative">
            <div
              className="absolute -inset-3 rounded-3xl"
              style={{ background: 'var(--accent-dim)', filter: 'blur(30px)' }}
            />
            <img
              src={portrait}
              alt="Rayyan Zafier Leksono outdoors"
              loading="lazy"
              className="about-img anim-hidden relative h-auto w-full max-w-sm rounded-2xl border object-cover shadow-2xl lg:max-w-md"
              style={{ borderColor: 'var(--border)' }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
