import type { Project } from '@/types';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <a
      href={project.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-2xl border border-white/10 bg-[rgba(8,10,22,0.55)] p-6 backdrop-blur-md transition hover:border-white/25 hover:bg-[rgba(14,17,34,0.7)]"
    >
      <div className="mb-2 flex items-center gap-3">
        <h3 className="text-xl font-semibold">{project.name}</h3>
        {project.status === 'building' && (
          <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-0.5 text-[11px] text-amber-200">
            개발 중
          </span>
        )}
      </div>
      <p className="mb-4 text-sm text-[color:var(--cosmos-muted)]">{project.tagline}</p>
      <ul className="flex flex-wrap gap-2">
        {project.tech.map((tech) => (
          <li
            key={tech}
            className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] text-[color:var(--cosmos-muted)]"
          >
            {tech}
          </li>
        ))}
      </ul>
    </a>
  );
}
