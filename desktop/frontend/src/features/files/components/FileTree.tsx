import { Folder, ChevronRight } from "lucide-react";
import { Card } from "../../../components/ui/Card";

export function FileTree() {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <ChevronRight size={16} />
        <Folder size={16} className="text-indigo-400" />
        <span>projects</span>
      </div>
    </Card>
  );
}
