import { animate, stagger } from 'animejs';
import { skills } from '../data/skills';
import { useAnimeScope } from '../hooks/useAnimeScope';

export default function Skills() {
  const root = useAnimeScope(() => {
    // Gentle idle float on a dedicated wrapper, so CSS hover transforms on the
    // card and the icon stay free of anime.js inline styles. Runs immediately;
    // only the two entrance animations wait for the section to scroll in.
    animate('.skill-float', {
      y: [0, -9, 0],
      duration: 3400,
      ease: 'inOut(2)',
      loop: true,
      delay: stagger(220),
    });

    const head = animate('.skills-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    });

    // Ripple out from the middle of the grid.
    const cards = animate('.skill-card', {
      opacity: [0, 1],
      scale: [0.7, 1],
      y: [30, 0],
      rotate: [-6, 0],
      duration: 800,
      ease: 'out(4)',
      delay: stagger(70, { from: 'center' }),
      autoplay: false,
    });

    return [head, cards];
  });

  return (
    <section ref={root} id="skills" className="relative flex min-h-screen items-center py-24">
      <div className="section-shell text-center">
        <div className="skills-head anim-hidden">
          <span className="eyebrow">Stack</span>
          <h2 className="section-title mt-5">Skills</h2>
          <p className="section-sub">Programming languages and softwares I work with</p>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-4 sm:grid-cols-4 sm:gap-6 lg:grid-cols-6 lg:gap-7">
          {skills.map((skill) => (
            <div key={skill.name} className="skill-card anim-hidden">
              <div className="skill-float">
                <div className="skill-tile card group flex flex-col items-center gap-3 p-4 sm:p-6">
                  <img
                    src={skill.icon}
                    alt={skill.name}
                    loading="lazy"
                    className="h-12 w-12 object-contain transition-transform duration-300 group-hover:scale-110 sm:h-16 sm:w-16 lg:h-20 lg:w-20"
                  />
                  <span className="text-xs font-medium leading-tight text-muted transition-colors duration-300 group-hover:text-accent-soft sm:text-sm">
                    {skill.name}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
