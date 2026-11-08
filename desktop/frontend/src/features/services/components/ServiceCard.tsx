import type { CatalogItem, ServiceState } from "../../../types";
import { Loader2, Play, RotateCw, Server, Square } from "lucide-react";

import { Card } from "../../../components/ui/Card";
import { StatusBadge } from "../../../components/ui/Badge";
import { isRunning } from "../../../lib/utils";

interface ServiceCardProps {
  item: CatalogItem;
  state?: ServiceState;
  working: string;
  onManage: (name: string, action: string) => void;
}

export function ServiceCard({
  item,
  state,
  working,
  onManage,
}: ServiceCardProps) {
  const installed = Boolean(state && state.State !== "not-installed");

  const running = Boolean(
    installed && state && isRunning(state.State),
  );

  const manageable = Boolean(
    installed && state && ["docker", "systemd"].includes(state.Source),
  );

  const isWorking = working.startsWith(`${item.name}:`);
  const disabled = Boolean(working);

  return (
    <Card className="flex min-w-0 flex-col p-3 transition-colors hover:border-indigo-500/30">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
          <Server size={12} strokeWidth={1.8} />
        </div>

        <StatusBadge
          online={running}
          label={installed && state ? state.State : "Not installed"}
        />
      </div>

      {/* Service Information */}
      <h3
        className="truncate text-[11px] font-semibold leading-4"
        title={item.label}
      >
        {item.label}
      </h3>

      <p
        className="mt-1 line-clamp-2 flex-1 text-[10px] leading-4 text-slate-400"
        title={item.description}
      >
        {item.description}
      </p>

      {/* Footer */}
      <div className="mt-2 flex min-w-0 items-center justify-between gap-2 border-t border-border pt-2">
        {/* Metadata */}
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          <span className="max-w-full truncate rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-slate-500">
            {item.method}
          </span>

          {item.guided && (
            <span className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-[9px] text-indigo-400">
              Guided
            </span>
          )}
        </div>

        {/* Compact Action Buttons */}
        {manageable && (
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              disabled={disabled}
              onClick={() =>
                onManage(item.name, running ? "restart" : "start")
              }
              title={running ? "Restart service" : "Start service"}
              aria-label={running ? "Restart service" : "Start service"}
              className="
                flex h-6 w-6 items-center justify-center
                rounded-md border border-indigo-500/20
                bg-indigo-500/10 text-indigo-400
                transition-colors
                hover:bg-indigo-500/20
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {isWorking ? (
                <Loader2 size={12} className="animate-spin" />
              ) : running ? (
                <RotateCw size={12} />
              ) : (
                <Play size={12} />
              )}
            </button>

            {running && (
              <button
                type="button"
                disabled={disabled}
                onClick={() => onManage(item.name, "stop")}
                title="Stop service"
                aria-label="Stop service"
                className="
                  flex h-6 w-6 items-center justify-center
                  rounded-md border border-red-500/20
                  bg-red-500/10 text-red-400
                  transition-colors
                  hover:bg-red-500/20
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <Square size={11} fill="currentColor" />
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}