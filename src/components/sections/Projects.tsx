import { ProjectCard } from '@/components/ui/ProjectCard';
import { projects } from '@/data/projects';

export function Projects() {
  return (
    <section id="projects" className="px-6 py-24 sm:px-12 lg:px-20">
      <h2 className="mb-10 text-3xl font-bold sm:text-4xl">만든 것들</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} />
        ))}
      </div>
    </section>
  );
}
