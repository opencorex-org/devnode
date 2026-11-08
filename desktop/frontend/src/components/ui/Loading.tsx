import { LoaderCircle } from "lucide-react";

export function Loading() {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-slate-400">
      <LoaderCircle
        className="animate-spin text-indigo-400"
        size={22}
      />

      Preparing DevNode…
    </div>
  );
}
