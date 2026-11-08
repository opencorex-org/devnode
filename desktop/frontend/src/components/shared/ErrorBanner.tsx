import { AlertTriangle, CheckCircle2, X } from "lucide-react";

export function ErrorBanner({
  error,
  notice,
  onDismiss,
}: {
  error: string;
  notice: string;
  onDismiss: () => void;
}) {
  if (!error && !notice) return null;

  return (
    <div
      className={`
        mx-8 mt-6 flex items-center gap-3
        rounded-xl border px-5 py-4
        text-sm
        ${
          error
            ? "border-red-500/20 bg-red-500/10 text-red-300"
            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300"
        }
      `}
    >
      {error ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
      <span className="flex-1">{error || notice}</span>
      <button onClick={onDismiss}>
        <X size={18} />
      </button>
    </div>
  );
}
