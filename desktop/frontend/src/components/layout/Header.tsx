import { RefreshCw } from "lucide-react";

interface HeaderProps {
  title: string;
  updatedAt?: string;
  busy: boolean;
  onRefresh: () => void;
}

export function Header({
  title,
  updatedAt,
  busy,
  onRefresh,
}: HeaderProps) {
  return (
    <header
      className="
        sticky top-0 z-20
        flex h-12 shrink-0 items-center justify-between
        border-b border-border
        bg-background/90 px-4
        backdrop-blur-xl
      "
    >
      {/* Page Title */}
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="h-5 w-0.5 shrink-0 rounded-full bg-indigo-400" />

        <div className="min-w-0">
          <p className="text-[8px] font-semibold uppercase leading-3 tracking-widest text-indigo-400">
            Workspace
          </p>

          <h1 className="truncate text-sm font-semibold leading-4 tracking-tight text-foreground">
            {title}
          </h1>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2.5">
        {/* Last Updated */}
        {updatedAt && (
          <span className="hidden text-[10px] text-slate-500 sm:block">
            Updated {updatedAt}
          </span>
        )}

        {/* Refresh Button */}
        <button
          type="button"
          aria-label="Refresh dashboard"
          title="Refresh dashboard"
          onClick={onRefresh}
          disabled={busy}
          className="
            flex h-7 w-7 items-center justify-center
            rounded-md border border-border
            bg-surface text-slate-400
            transition-colors duration-150
            hover:border-indigo-500/40
            hover:bg-indigo-500/10
            hover:text-indigo-400
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-indigo-500/50
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          <RefreshCw
            size={13}
            strokeWidth={1.8}
            className={busy ? "animate-spin" : ""}
          />
        </button>
      </div>
    </header>
  );
}