import { animate, stagger } from 'animejs';
import { skills } from '../data/skills';
import { useAnimeScope } from '../hooks/useAnimeScope';

/**
 * Hand-tuned scatter: `size` picks the tile scale, `shift` nudges the node up
 * or down. The shift is a margin (not a transform) so anime.js keeps sole
 * ownership of every transform on these nodes.
 */
const LAYOUT = [
  { size: 'md', shift: 26 },
  { size: 'lg', shift: -18 },
  { size: 'sm', shift: 34 },
  { size: 'lg', shift: 4 },
  { size: 'md', shift: -30 },
  { size: 'sm', shift: 18 },
  { size: 'lg', shift: -8 },
  { size: 'sm', shift: 30 },
  { size: 'md', shift: -24 },
  { size: 'md', shift: 12 },
  { size: 'sm', shift: -14 },
  { size: 'lg', shift: 22 },
];

export default function Skills() {
  const root = useAnimeScope(() => {
    // Idle drift, one wrapper per node so hover and entrance transforms stay
    // on their own elements. Varied durations keep the cloud from pulsing.
    animate('.skill-float', {
      y: [0, -10, 0],
      duration: (el, i) => 3200 + (i % 5) * 500,
      ease: 'inOut(2)',
      loop: true,
      delay: stagger(180),
    });

    const head = animate('.skills-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    });

    // Nodes scatter outward from the middle of the cloud.
    const nodes = animate('.skill-node', {
      opacity: [0, 1],
      scale: [0.4, 1],
      y: (el, i) => [i % 2 === 0 ? 50 : -50, 0],
      rotate: (el, i) => [i % 3 === 0 ? -12 : 10, 0],
      duration: 900,
      ease: 'out(4)',
      delay: stagger(60, { from: 'center' }),
      autoplay: false,
    });

    return [head, nodes];
  });

  return (
    <section ref={root} id="skills" className="relative flex min-h-screen items-center overflow-hidden py-28">
      <div className="section-shell relative text-center">
        <div className="skills-head anim-hidden">
          <span className="eyebrow">Stack</span>
          <h2 className="section-title mt-5">
            Tools I <span className="text-accent">build with</span>
          </h2>
          <p className="section-sub">Programming languages and softwares I work with</p>
        </div>

        <div className="relative mt-16">
          <div className="skill-rings" data-parallax="0.04" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <ul className="skill-cloud">
            {skills.map((skill, i) => {
              const { size, shift } = LAYOUT[i % LAYOUT.length];
              return (
                <li
                  key={skill.name}
                  className={`skill-node anim-hidden skill-node--${size}`}
                  style={{ marginTop: `${shift}px` }}
                >
                  <div className="skill-float">
                    <div className="skill-tile">
                      <img src={skill.icon} alt="" aria-hidden="true" loading="lazy" />
                    </div>
                  </div>
                  <span className="skill-label">{skill.name}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
