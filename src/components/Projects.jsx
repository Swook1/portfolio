import { animate, stagger } from 'animejs';
import { projects } from '../data/projects';
import { github, browser } from '../data/icons';
import { useAnimeScope } from '../hooks/useAnimeScope';
import YouTubeFacade from './ui/YouTubeFacade';

function ProjectRow({ project, index }) {
  const flipped = index % 2 === 1;
  const from = flipped ? 70 : -70;

  const root = useAnimeScope(() => [
    animate('.p-media', {
      opacity: [0, 1],
      x: [from, 0],
      duration: 900,
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.p-step', {
      opacity: [0, 1],
      x: [-from * 0.5, 0],
      y: [20, 0],
      duration: 700,
      delay: stagger(110),
      ease: 'out(3)',
      autoplay: false,
    }),
    animate('.p-tech', {
      opacity: [0, 1],
      scale: [0.6, 1],
      duration: 500,
      delay: stagger(60, { start: 300 }),
      ease: 'out(4)',
      autoplay: false,
    }),
  ]);

  return (
    <article
      ref={root}
      className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
        flipped ? 'lg:[&>*:first-child]:order-2' : ''
      }`}
    >
      <div className="p-media anim-hidden">
        <div className="project-frame card overflow-hidden">
          <div className="aspect-video">
            <YouTubeFacade videoId={project.youtubeId} title={project.title} />
          </div>
        </div>
      </div>

      <div className="space-y-5 text-center lg:text-left">
        <h3 className="p-step anim-hidden font-display text-xl font-bold sm:text-2xl lg:text-3xl">
          {project.title}
        </h3>
        <p className="p-step anim-hidden text-sm leading-relaxed text-muted sm:text-base">
          {project.description}
        </p>

        <div className="p-step anim-hidden">
          <h4 className="text-sm font-semibold uppercase tracking-[0.18em] text-dim">
            Language Used
          </h4>
          <div className="mt-3 flex flex-wrap justify-center gap-3 lg:justify-start">
            {project.technologies.map((tech) => (
              <span
                key={tech.name}
                title={tech.name}
                className="p-tech anim-hidden flex h-10 w-10 items-center justify-center rounded-xl border sm:h-12 sm:w-12"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                <img src={tech.icon} alt={tech.name} loading="lazy" className="h-6 w-6 object-contain sm:h-7 sm:w-7" />
              </span>
            ))}
          </div>
        </div>

        <div className="p-step anim-hidden flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
          <a
            href={project.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            <img src={github} alt="" aria-hidden="true" className="h-5 w-5" />
            View on GitHub
          </a>
          {project.websiteUrl && (
            <a
              href={project.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <img src={browser} alt="" aria-hidden="true" className="h-5 w-5" />
              View Website
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const root = useAnimeScope(() => [
    animate('.projects-head', {
      opacity: [0, 1],
      y: [30, 0],
      duration: 700,
      ease: 'out(3)',
      autoplay: false,
    }),
  ]);

  return (
    <section
      ref={root}
      id="projects"
      className="section-tint relative py-24"
    >
      <div className="section-shell">
        <div className="projects-head anim-hidden text-center">
          <span className="eyebrow">Work</span>
          <h2 className="section-title mt-5">My Projects</h2>
          <p className="section-sub">
            Showcase of my development projects and technical achievements
          </p>
        </div>

        <div className="mt-16 space-y-20 lg:space-y-28">
          {projects.map((project, i) => (
            <ProjectRow key={project.id} project={project} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
