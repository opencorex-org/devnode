import { AlertTriangle, Check, ShieldCheck } from "lucide-react";

import { Card } from "../../../components/ui/Card";
import { PanelTitle } from "../../../components/shared/PanelTitle";
import type { ToolCheck } from "../../../types";

interface RequirementsProps {
  tools: ToolCheck[];
  missing: ToolCheck[];
  platform: string;
}

export function Requirements({
  tools,
  missing,
  platform,
}: RequirementsProps) {
  return (
    <div className="space-y-2">
      {/* Local Requirements */}
      <Card className="p-3">
        <div className="mb-2">
          <PanelTitle
            title="Local requirements"
            subtitle={platform}
          />
        </div>

        <div className="space-y-1">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="
                flex min-w-0 items-center gap-2
                rounded-md border border-border
                bg-background/40 px-2 py-1.5
              "
            >
              {/* Status Icon */}
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                  tool.available
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-red-500/10 text-red-400"
                }`}
              >
                {tool.available ? (
                  <Check size={12} strokeWidth={2} />
                ) : (
                  <AlertTriangle size={12} strokeWidth={1.8} />
                )}
              </div>

              {/* Tool Information */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-medium leading-4">
                  {tool.name}
                </p>

                <p
                  className="truncate text-[9px] leading-3 text-slate-500"
                  title={tool.available ? tool.path : "Not found on PATH"}
                >
                  {tool.available ? tool.path : "Not found on PATH"}
                </p>
              </div>

              {/* Availability Indicator */}
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                  tool.available ? "bg-emerald-400" : "bg-red-400"
                }`}
                title={tool.available ? "Available" : "Missing"}
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Missing Requirements Warning */}
      {missing.length > 0 && (
        <Card className="border-amber-500/20 bg-amber-500/5 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={13}
              className="mt-0.5 shrink-0 text-amber-400"
            />

            <div className="min-w-0">
              <h3 className="text-[11px] font-semibold text-amber-400">
                OpenSSH is required
              </h3>

              <p className="mt-1 text-[10px] leading-4 text-slate-400">
                Install or enable OpenSSH, then restart DevNode.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Authentication Information */}
      <Card className="p-3">
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
            <ShieldCheck size={13} strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-[11px] font-semibold leading-4">
              First-time authentication
            </h3>

            <p className="mt-1 text-[10px] leading-4 text-slate-400">
              DevNode never stores your Ubuntu password.
              Run{" "}
              <code className="rounded bg-cyan-500/10 px-1 py-0.5 font-mono text-[10px] text-cyan-400">
                devnode setup
              </code>{" "}
              once in your terminal to install the dedicated SSH public key.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}