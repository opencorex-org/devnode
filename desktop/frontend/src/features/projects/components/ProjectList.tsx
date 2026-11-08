import { ProjectCard } from "./ProjectCard";
import { EmptyState } from "../../../components/ui/EmptyState";
import type { Project } from "../../../types";

export function ProjectList({
  projects,
  onSelect,
}: {
  projects: Project[];
  onSelect: (project: Project) => void;
}) {
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects yet"
        description="Create your first remote development project above to get started."
      />
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.name}
          project={project}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}
