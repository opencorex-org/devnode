import { Network, Server } from "lucide-react";

import { Card } from "../../../components/ui/Card";
import type { Snapshot } from "../../../types";
import { StatusBadge } from "../../../components/ui/Badge";

interface ServerOverviewProps {
  snapshot: Snapshot;
  target: string;
}

export function ServerOverview({
  snapshot,
  target,
}: ServerOverviewProps) {
  return (
    <Card
      className="
        relative overflow-hidden
        border-indigo-500/20
        bg-linear-to-br
        from-indigo-950/60
        via-surface
        to-cyan-950/20
        px-3 py-2.5
      "
    >
      {/* Background Glow */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

      <div className="relative flex flex-wrap items-center justify-between gap-3">
        {/* Server Information */}
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
            <Server size={15} strokeWidth={1.8} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="max-w-48 truncate text-xs font-semibold tracking-tight"
                title={snapshot.Host || target}
              >
                {snapshot.Host || target}
              </h2>

              <div className="[&>*]:px-1.5 [&>*]:py-0.5 [&>*]:text-[9px]">
                <StatusBadge online />
              </div>
            </div>

            <p
              className="mt-0.5 truncate text-[10px] leading-4 text-slate-400"
              title={`${snapshot.OS} · ${snapshot.Arch} · Up ${snapshot.Uptime}`}
            >
              {snapshot.OS} · {snapshot.Arch} · Up {snapshot.Uptime}
            </p>
          </div>
        </div>

        {/* Server Address */}
        <div className="flex shrink-0 items-center gap-2 rounded-md border border-cyan-500/10 bg-cyan-500/5 px-2.5 py-1.5">
          <Network size={13} className="text-cyan-400" />

          <div>
            <p className="text-[9px] font-medium uppercase tracking-wider text-slate-500">
              Server Address
            </p>

            <code className="block text-[11px] font-semibold text-cyan-400">
              {snapshot.IP || target}
            </code>
          </div>
        </div>
      </div>
    </Card>
  );
}