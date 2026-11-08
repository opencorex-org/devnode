import { Activity } from "lucide-react";
import { Card } from "../../../components/ui/Card";
import type { ReactNode } from "react";

interface ResourceMetricProps {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
}

export function ResourceMetric({
  label,
  value,
  detail,
  icon,
}: ResourceMetricProps) {
  const percentage = value < 0 ? 0 : Math.min(100, Math.max(0, value));

  return (
    <Card className="p-3">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400 [&>svg]:h-3.5 [&>svg]:w-3.5">
            {icon}
          </div>

          <span className="truncate text-[11px] font-medium text-slate-400">
            {label}
          </span>
        </div>

        <Activity size={12} className="shrink-0 text-slate-600" />
      </div>

      {/* Value */}
      <p className="text-base font-semibold leading-none">
        {value < 0 ? "—" : `${value}%`}
      </p>

      {/* Progress */}
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            percentage > 85
              ? "bg-red-500"
              : percentage > 65
                ? "bg-amber-400"
                : "bg-linear-to-r from-cyan-400 to-indigo-500"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Detail */}
      <p
        className="mt-1.5 truncate text-[10px] leading-3 text-slate-500"
        title={detail || "No details reported"}
      >
        {detail || "No details reported"}
      </p>
    </Card>
  );
}