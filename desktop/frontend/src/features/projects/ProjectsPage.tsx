import { useState } from "react";
import { CreateProject } from "./components/CreateProject";
import { ProjectList } from "./components/ProjectList";
import { ProjectDetailsModal } from "./components/ProjectDetailsModal";
import { Loading } from "../../components/ui/Loading";
import type { Project } from "../../types";

export function ProjectsPage({
  projects,
  loading = false,
  reload,
  notify,
  fail,
}: {
  projects: Project[];
  loading?: boolean;
  reload: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await reload();
    } catch {
      // Handled by parent
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <CreateProject
        onCreated={reload}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        notify={notify}
        fail={fail}
      />

      {loading && projects.length === 0 ? (
        <Loading />
      ) : (
        <ProjectList
          projects={projects}
          onSelect={(project) => setSelectedProject(project)}
        />
      )}

      <ProjectDetailsModal
        project={selectedProject}
        open={Boolean(selectedProject)}
        onClose={() => setSelectedProject(null)}
        onDeleted={reload}
        notify={notify}
        fail={fail}
      />
    </div>
  );
}
