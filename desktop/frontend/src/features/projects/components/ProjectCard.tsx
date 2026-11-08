import { ChevronRight, Folder, GitBranch } from "lucide-react";

import { Card } from "../../../components/ui/Card";
import type { Project } from "../../../types";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const hasGit = project.branch !== "-";
  const hasPackageManager =
    project.packageManager !== "none";

  return (
    <Card
      className="
        group flex min-w-0 flex-col
        p-3 transition-colors
        hover:border-indigo-500/40
      "
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div
          className="
            flex h-7 w-7 shrink-0 items-center justify-center
            rounded-md bg-indigo-500/10 text-indigo-400
          "
        >
          <Folder size={14} strokeWidth={1.8} />
        </div>

        <ChevronRight
          size={13}
          className="
            text-slate-600 transition-transform
            group-hover:translate-x-0.5
            group-hover:text-indigo-400
          "
        />
      </div>

      {/* Project Name */}
      <h3
        className="truncate text-[11px] font-semibold leading-4"
        title={project.name}
      >
        {project.name}
      </h3>

      {/* Package Manager */}
      <p className="mt-0.5 truncate text-[10px] text-slate-500">
        {hasPackageManager
          ? project.packageManager
          : "No package manager"}
      </p>

      {/* Footer */}
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1 border-t border-border pt-2">
        {/* Git Branch */}
        <span
          className="
            inline-flex min-w-0 max-w-full items-center gap-1
            rounded bg-white/5 px-1.5 py-0.5
            text-[9px] text-slate-400
          "
          title={hasGit ? project.branch : "No Git repository"}
        >
          <GitBranch size={10} className="shrink-0" />

          <span className="truncate">
            {hasGit ? project.branch : "No Git"}
          </span>
        </span>

        {/* Modified Status */}
        {project.dirty && (
          <span
            className="
              inline-flex shrink-0 items-center gap-1
              rounded bg-amber-500/10 px-1.5 py-0.5
              text-[9px] text-amber-400
            "
          >
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            Modified
          </span>
        )}
      </div>
    </Card>
  );
}