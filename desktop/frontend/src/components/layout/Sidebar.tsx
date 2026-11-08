import { Brand } from "./Brand";
import type { Page } from "../../types";
import { ServerStatus } from "./ServerStatus";
import { navigation } from "../../app/navigation";

interface SidebarProps {
  page: Page;
  onNavigate: (page: Page) => void;
  online: boolean;
  target?: string;
  host?: string;
  platform?: string;
}

export function Sidebar({
  page,
  onNavigate,
  online,
  target,
  host,
  platform,
}: SidebarProps) {
  return (
    <aside
      className="
        sticky top-0
        flex h-screen w-52 shrink-0 flex-col
        border-r border-border
        bg-sidebar
      "
    >
      {/* Brand */}
      <div className="shrink-0">
        <Brand />
      </div>

      {/* Navigation Label */}
      <div className="px-3 pb-1.5 pt-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.15em] text-slate-600">
          Workspace
        </p>
      </div>

      {/* Navigation */}
      <nav
        aria-label="Main navigation"
        className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2"
      >
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = page === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={active ? "page" : undefined}
              title={item.label}
              className={`
                flex w-full items-center gap-2.5
                rounded-md px-2.5 py-2
                text-left text-[11px] font-medium
                transition-colors duration-150
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-indigo-500/50
                ${
                  active
                    ? "bg-indigo-500/15 text-indigo-400"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              <Icon
                size={14}
                strokeWidth={1.8}
                className="shrink-0"
              />

              <span className="truncate">{item.label}</span>

              {/* {active && (
                <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-400" />
              )} */}
            </button>
          );
        })}
      </nav>

      {/* Server Status */}
      <div className="shrink-0">
        <ServerStatus
          online={online}
          target={target}
          host={host}
          platform={platform}
        />
      </div>
    </aside>
  );
}