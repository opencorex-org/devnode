import { ChevronRight, Folder, GitBranch, Terminal } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import type { Project } from "../../../types";

interface ProjectCardProps {
  project: Project;
  onSelect?: (project: Project) => void;
}

export function ProjectCard({ project, onSelect }: ProjectCardProps) {
  const hasGit = project.branch !== "-";
  const hasPackageManager = project.packageManager !== "none";

  return (
    <Card
      onClick={() => onSelect?.(project)}
      className="
        group flex min-w-0 cursor-pointer flex-col
        p-3.5 transition-all
        hover:border-indigo-500/50 hover:bg-white/[0.02] hover:shadow-lg hover:shadow-indigo-500/5
      "
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div
          className="
            flex h-7 w-7 shrink-0 items-center justify-center
            rounded-md bg-indigo-500/10 text-indigo-400
            transition-colors group-hover:bg-indigo-500/20
          "
        >
          <Folder size={14} strokeWidth={1.8} />
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 font-medium">
            Manage
          </span>
          <ChevronRight
            size={14}
            className="
              text-slate-600 transition-all
              group-hover:translate-x-0.5 group-hover:text-indigo-400
            "
          />
        </div>
      </div>

      {/* Project Name */}
      <h3
        className="truncate text-[12px] font-semibold leading-4 text-white group-hover:text-indigo-300 transition-colors"
        title={project.name}
      >
        {project.name}
      </h3>

      {/* Package Manager */}
      <p className="mt-0.5 truncate text-[10px] text-slate-400">
        {hasPackageManager ? project.packageManager : "No package manager"}
      </p>

      {/* Footer */}
      <div className="mt-3 flex min-w-0 items-center justify-between gap-1 border-t border-border pt-2">
        <div className="flex min-w-0 flex-wrap items-center gap-1">
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

        <div className="flex shrink-0 items-center">
          <span className="inline-flex items-center gap-1 rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] font-medium text-indigo-400 group-hover:bg-indigo-500/20">
            <Terminal size={10} />
            Actions
          </span>
        </div>
      </div>
    </Card>
  );
}
