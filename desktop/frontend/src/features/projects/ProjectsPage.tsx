import { CreateProject } from "./components/CreateProject";
import { ProjectList } from "./components/ProjectList";
import type { Project } from "../../types";

export function ProjectsPage({
  projects,
  reload,
  notify,
  fail,
}: {
  projects: Project[];
  reload: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  return (
    <div className="space-y-6">
      <CreateProject onCreated={reload} notify={notify} fail={fail} />
      <ProjectList projects={projects} />
    </div>
  );
}
