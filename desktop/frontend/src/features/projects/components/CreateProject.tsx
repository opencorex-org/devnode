import { useState, type FormEvent } from "react";
import { FolderPlus, Loader2, Plus, RotateCw } from "lucide-react";

import { Card } from "../../../components/ui/Card";
import { api } from "../../../services/api";
import { messageOf } from "../../../lib/utils";

interface CreateProjectProps {
  onCreated: () => Promise<void>;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  notify: (value: string) => void;
  fail: (value: string) => void;
}

export function CreateProject({
  onCreated,
  onRefresh,
  refreshing = false,
  notify,
  fail,
}: CreateProjectProps) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  const projectName = name.trim();
  const canCreate = projectName.length > 0 && !adding;

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canCreate) return;

    setAdding(true);
    fail("");

    try {
      const result = await api.createProject(projectName);

      setName("");
      notify(String(result));

      await onCreated();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card className="p-3">
      <form
        onSubmit={(event) => void create(event)}
        className="flex min-w-0 flex-wrap items-center justify-between gap-2.5"
      >
        {/* Header */}
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
            <FolderPlus size={13} strokeWidth={1.8} />
          </div>

          <div className="min-w-0">
            <h2 className="text-[11px] font-semibold leading-4">
              Remote projects
            </h2>

            <p className="text-[9px] leading-3.5 text-slate-500">
              Stored in{" "}
              <code className="font-mono text-cyan-400">
                ~/projects
              </code>{" "}
              on the server
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto">
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="new-project"
            aria-label="Project name"
            autoComplete="off"
            spellCheck={false}
            disabled={adding}
            maxLength={100}
            className="
              h-7 min-w-0 flex-1
              rounded-md border border-border
              bg-background px-2.5
              text-[11px] text-white
              placeholder:text-slate-600
              outline-none transition-colors
              focus:border-indigo-500
              focus:ring-1 focus:ring-indigo-500/20
              disabled:cursor-not-allowed
              disabled:opacity-50
              sm:w-44
            "
          />

          <button
            type="submit"
            disabled={!canCreate}
            title="Create remote project"
            className="
              inline-flex h-7 shrink-0
              items-center justify-center gap-1.5
              rounded-md border border-indigo-500/30
              bg-indigo-500/15 px-2.5
              text-[10px] font-medium text-indigo-400
              transition-colors
              hover:bg-indigo-500/25
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-indigo-500/50
              disabled:cursor-not-allowed
              disabled:opacity-40
            "
          >
            {adding ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Plus size={12} />
            )}

            <span>{adding ? "Creating…" : "Create"}</span>
          </button>

          {onRefresh && (
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void onRefresh()}
              title="Refresh projects list"
              className="
                inline-flex h-7 w-7 shrink-0
                items-center justify-center
                rounded-md border border-border
                bg-white/5 text-slate-400
                transition-colors
                hover:bg-white/10 hover:text-white
                disabled:cursor-not-allowed disabled:opacity-40
              "
            >
              <RotateCw
                size={12}
                className={refreshing ? "animate-spin text-indigo-400" : ""}
              />
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}
