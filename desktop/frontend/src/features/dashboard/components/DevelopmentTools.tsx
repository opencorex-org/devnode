import type { ActiveTool } from "../../../types";
import { Card } from "../../../components/ui/Card";
import { PanelTitle } from "../../../components/shared/PanelTitle";

export function DevelopmentTools({ tools }: { tools: ActiveTool[] }) {
  return (
    <Card className="p-3">
      <div className="mb-2">
        <PanelTitle
          title="Development tools"
          subtitle={`${tools.length} tools detected`}
        />
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {tools.map((tool) => (
          <div
            key={tool.Key}
            className="
              flex min-w-0 items-center gap-2
              rounded-md border border-border
              bg-background/50 px-2.5 py-2
              transition-colors hover:bg-background/80
            "
          >
            {/* Status Indicator */}
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                tool.Version ? "bg-emerald-400" : "bg-slate-600"
              }`}
            />

            {/* Tool Information */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-[11px] font-medium leading-4">
                {tool.Label}
              </p>

              <p className="truncate text-[10px] leading-3 text-slate-500">
                {tool.Version || "Not installed"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}