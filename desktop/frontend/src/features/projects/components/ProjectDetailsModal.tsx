import { useState, useEffect } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Folder,
  GitBranch,
  Package,
  Terminal,
  Trash2,
  X,
} from "lucide-react";
import type { Project } from "../../../types";
import { api } from "../../../services/api";
import { messageOf } from "../../../lib/utils";

interface ProjectDetailsModalProps {
  project: Project | null;
  open: boolean;
  onClose: () => void;
  onDeleted?: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}

export function ProjectDetailsModal({
  project,
  open,
  onClose,
  onDeleted,
  notify,
  fail,
}: ProjectDetailsModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [baseSshCmd, setBaseSshCmd] = useState<string>("");
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmDelete(false);
      void api
        .connectionCommand()
        .then(setBaseSshCmd)
        .catch(() => setBaseSshCmd(""));
    }
  }, [open]);

  if (!open || !project) return null;

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore
    }
  };

  const projectPath = `~/projects/${project.name}`;
  const sshJumpCommand = baseSshCmd
    ? `${baseSshCmd} -t "cd ~/projects/${project.name} && exec \\$SHELL -l"`
    : `ssh -t "cd ~/projects/${project.name} && exec \\$SHELL -l"`;
  const devnodeCliCommand = `devnode ${project.name}`;

  const pm = project.packageManager !== "none" ? project.packageManager : "npm";
  const pmCommands = [
    { label: "Install dependencies", cmd: `devnode ${project.name} install` },
    { label: "Run dev server", cmd: `devnode ${project.name} run dev` },
    { label: "Run build", cmd: `devnode ${project.name} run build` },
    { label: "Run test suite", cmd: `devnode ${project.name} run test` },
  ];

  const handleDelete = async () => {
    setDeleting(true);
    fail("");
    try {
      const msg = await api.deleteProject(project.name);
      notify(String(msg || `Project ${project.name} deleted`));
      onClose();
      if (onDeleted) {
        await onDeleted();
      }
    } catch (err) {
      fail(messageOf(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex max-h-[88vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-surface shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Folder size={20} strokeWidth={1.8} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  {project.name}
                </h2>
                <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                  {project.packageManager !== "none"
                    ? project.packageManager
                    : "No package manager"}
                </span>
                <span
                  className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400"
                >
                  <GitBranch size={11} />
                  {project.branch !== "-" ? project.branch : "No Git"}
                </span>
                {project.dirty && (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Modified
                  </span>
                )}
              </div>

              <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                <span className="font-mono text-cyan-400">{projectPath}</span>
                <button
                  type="button"
                  onClick={() => copyText(projectPath, "path")}
                  className="rounded p-1 text-slate-500 hover:text-white transition-colors"
                  title="Copy remote directory path"
                >
                  {copiedKey === "path" ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Quick Terminal SSH Jump */}
          <div className="rounded-xl border border-border bg-slate-950/60 p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
                <Terminal size={14} className="text-indigo-400" />
                SSH Direct Shell
              </span>
              <button
                type="button"
                onClick={() => copyText(sshJumpCommand, "ssh")}
                className="inline-flex items-center gap-1 rounded bg-white/5 px-2 py-1 text-[11px] font-sans text-slate-300 hover:bg-white/15 hover:text-white transition-colors"
              >
                {copiedKey === "ssh" ? (
                  <>
                    <Check size={12} className="text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    <span>Copy Command</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Opens your remote shell directly in the project directory:
            </p>
            <div className="rounded-md border border-slate-800 bg-black/80 px-3 py-2 font-mono text-[11px] text-emerald-400 break-all select-all">
              <span className="mr-1.5 text-slate-600">$</span>
              {sshJumpCommand}
            </div>
          </div>

          {/* DevNode CLI Integration */}
          <div className="space-y-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Package size={14} className="text-cyan-400" />
              DevNode Project Commands ({pm})
            </span>
            <div className="grid gap-2">
              {pmCommands.map((item, idx) => {
                const key = `cmd-${idx}`;
                const isCopied = copiedKey === key;
                return (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-slate-950/60 px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] text-slate-400">
                        {item.label}
                      </div>
                      <div className="font-mono text-[11px] text-slate-200 break-all select-all">
                        {item.cmd}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyText(item.cmd, key)}
                      className="inline-flex shrink-0 items-center gap-1 rounded bg-white/5 px-2 py-1 text-[10px] text-slate-400 hover:bg-white/15 hover:text-white transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check size={11} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete Danger Zone */}
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-red-400">
                  Delete Project
                </h4>
                <p className="text-[11px] text-slate-400">
                  Permanently deletes <code className="text-slate-300">{projectPath}</code> from the remote server.
                </p>
              </div>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-colors"
                >
                  <Trash2 size={13} />
                  <span>Delete</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="rounded-lg border border-border bg-white/5 px-2.5 py-1 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                  >
                    {deleting ? "Deleting…" : "Confirm Delete"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-white/[0.02] p-4 text-xs text-slate-400">
          <span className="text-[11px]">
            Run commands in terminal using DevNode CLI or SSH.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
