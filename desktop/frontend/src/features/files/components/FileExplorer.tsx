import { Folder } from "lucide-react";
import { Card } from "../../../components/ui/Card";

export function FileExplorer() {
  return (
    <Card className="flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
        <Folder size={28} />
      </div>
      <p className="font-semibold text-white">Remote File Explorer</p>
      <p className="mt-1 max-w-sm text-xs text-slate-400">
        Browse and manage files in your server workspace.
      </p>
    </Card>
  );
}
