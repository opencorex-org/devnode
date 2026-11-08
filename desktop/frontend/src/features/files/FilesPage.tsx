import { FileToolbar } from "./components/FileToolbar";
import { FileExplorer } from "./components/FileExplorer";
import { useFiles } from "./hooks/useFiles";

export function FilesPage() {
  const { currentPath } = useFiles();

  return (
    <div className="space-y-6">
      <FileToolbar path={currentPath} />
      <FileExplorer />
    </div>
  );
}
