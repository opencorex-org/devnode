import { Card } from "../../../components/ui/Card";

export function FileEditor({
  filename,
  content,
}: {
  filename?: string;
  content?: string;
}) {
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <span className="font-mono text-sm text-slate-300">
          {filename ?? "Untitled"}
        </span>
      </div>
      <pre className="overflow-x-auto font-mono text-xs text-slate-400">
        {content ?? "// No file opened"}
      </pre>
    </Card>
  );
}
