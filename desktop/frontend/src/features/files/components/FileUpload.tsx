import { Upload } from "lucide-react";
import { Card } from "../../../components/ui/Card";

export function FileUpload({
  onUpload,
}: {
  onUpload?: (files: FileList) => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center border-dashed p-8 text-center">
      <Upload size={32} className="mb-3 text-slate-500" />
      <p className="text-sm font-semibold text-slate-300">
        Drag files here or click to browse
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Upload files directly to remote server
      </p>
      <input
        type="file"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && onUpload?.(e.target.files)}
      />
    </Card>
  );
}
