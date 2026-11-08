import { friendly, isRunning } from "../../../lib/utils";

import { Card } from "../../../components/ui/Card";
import { PanelTitle } from "../../../components/shared/PanelTitle";
import { Server } from "lucide-react";
import type { ServiceState } from "../../../types";
import { StatusBadge } from "../../../components/ui/Badge";

interface ActiveServicesProps {
  services: [string, ServiceState][];
}

export function ActiveServices({ services }: ActiveServicesProps) {
  return (
    <Card className="p-3">
      {/* Header */}
      <div className="mb-2">
        <PanelTitle
          title="Active services"
          subtitle={`${services.length} available`}
        />
      </div>

      {/* Services */}
      <div className="space-y-1.5">
        {services.map(([name, state]) => (
          <div
            key={name}
            className="
              flex min-w-0 items-center gap-2
              rounded-md border border-border
              bg-background/50 px-2.5 py-2
              transition-colors hover:bg-background/80
            "
          >
            {/* Service Icon */}
            <div
              className="
                flex h-7 w-7 shrink-0 items-center justify-center
                rounded-md bg-indigo-500/10 text-indigo-400
              "
            >
              <Server size={14} strokeWidth={1.8} />
            </div>

            {/* Service Information */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-4">
                {friendly(name)}
              </p>

              <p
                className="truncate text-[10px] leading-3 text-slate-500"
                title={state.Source}
              >
                {state.Source || "Unknown source"}
              </p>
            </div>

            {/* Status Badge */}
            <div className="shrink-0 [&>*]:px-1.5 [&>*]:py-0.5 [&>*]:text-[10px]">
              <StatusBadge
                online={isRunning(state.State)}
                label={state.State}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}