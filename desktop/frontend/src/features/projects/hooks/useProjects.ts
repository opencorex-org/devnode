import { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { messageOf } from "../../../lib/utils";
import type { Project } from "../../../types";

export function useProjects(active: boolean) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active || projects.length) return;

    void api
      .projects()
      .then(setProjects)
      .catch((reason) => setError(messageOf(reason)));
  }, [active, projects.length]);

  const reload = async () => {
    setProjects(await api.projects());
  };

  return { projects, setProjects, error, setError, reload };
}
