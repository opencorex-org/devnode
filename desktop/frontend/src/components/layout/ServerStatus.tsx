import { ExternalLink, GitBranch, Wifi, WifiOff } from "lucide-react";

interface ServerStatusProps {
  online: boolean;
  target?: string;
  host?: string;
  platform?: string;
}

export function ServerStatus({
  online,
  target,
  host,
  platform,
}: ServerStatusProps) {
  const year = new Date().getFullYear();

  return (
    <div className="border-t border-border px-2.5 py-2.5">
      {/* Server Connection */}
      <div className="rounded-lg border border-border bg-background/60 p-2">
        <div className="flex min-w-0 items-center gap-2">
          {/* Connection Icon */}
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
              online
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {online ? (
              <Wifi size={12} strokeWidth={1.8} />
            ) : (
              <WifiOff size={12} strokeWidth={1.8} />
            )}
          </div>

          {/* Connection Details */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px] font-semibold leading-3.5 text-foreground">
              {online ? "Server online" : "Not connected"}
            </p>

            <p
              className="truncate text-[9px] leading-3 text-slate-500"
              title={target ?? host ?? "Configure server"}
            >
              {target ?? host ?? "Configure server"}
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-2 flex flex-col items-center gap-1 text-center">
        {/* Platform */}
        <p className="max-w-full truncate text-[9px] leading-3 text-slate-500">
          {platform ?? "Desktop"} · DevNode Desktop
        </p>

        {/* OpenCorex GitHub */}
        <a
          href="https://github.com/opencorex-org"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Visit OpenCorex on GitHub"
          className="
            group inline-flex items-center gap-1
            rounded-md px-1.5 py-0.5
            text-[10px] font-medium text-slate-500
            transition-colors duration-150
            hover:bg-white/5 hover:text-foreground
            focus-visible:outline-none
            focus-visible:ring-2 focus-visible:ring-indigo-500/50
          "
        >
          <GitBranch size={11} strokeWidth={1.8} />

          <span>OpenCorex</span>

          <ExternalLink
            size={9}
            className="opacity-50 group-hover:opacity-100"
          />
        </a>

        {/* Copyright */}
        <p className="text-[9px] leading-3 text-slate-600">
          © {year} OpenCorex
        </p>
      </footer>
    </div>
  );
}