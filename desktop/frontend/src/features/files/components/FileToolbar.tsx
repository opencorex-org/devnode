import { FolderPlus, RefreshCw, Upload } from "lucide-react";
import { Button } from "../../../components/ui/Button";

export function FileToolbar({
  path,
  onRefresh,
}: {
  path: string;
  onRefresh?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-slate-500">PATH:</span>
        <code className="text-sm text-cyan-400">{path}</code>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="secondary" onClick={onRefresh}>
          <RefreshCw size={15} />
          Refresh
        </Button>
        <Button variant="secondary">
          <FolderPlus size={15} />
          New folder
        </Button>
        <Button variant="secondary">
          <Upload size={15} />
          Upload
        </Button>
      </div>
    </div>
  );
}
