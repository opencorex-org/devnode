import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Copy,
  Cpu,
  Database,
  Folder,
  HardDrive,
  LayoutDashboard,
  LoaderCircle,
  MemoryStick,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Terminal as TerminalIcon,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import type {
  Bootstrap,
  CatalogItem,
  ConnectionInput,
  Dashboard,
  PairProgress,
  PairingServer,
  Project,
} from "./types";

import { api } from "./api";

/* =========================================================
   TYPES
========================================================= */

type Page =
  | "overview"
  | "projects"
  | "services"
  | "terminal"
  | "settings"
  | "help";

const navigation = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "projects",
    label: "Projects",
    icon: Folder,
  },
  {
    id: "services",
    label: "Services",
    icon: Server,
  },
  {
    id: "terminal",
    label: "Terminal",
    icon: TerminalIcon,
  },
  {
    id: "settings",
    label: "Connection",
    icon: Settings,
  },
  {
    id: "help",
    label: "Help & Setup",
    icon: CircleHelp,
  },
] as const;

/* =========================================================
   SHARED COMPONENTS
========================================================= */

function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        rounded-2xl
        border border-border
        bg-surface
        shadow-lg shadow-black/10
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit";
  className?: string;
}) {
  const variants = {
    primary:
      "bg-gradient-to-r from-cyan-500 to-indigo-600 text-white hover:from-cyan-400 hover:to-indigo-500",

    secondary:
      "border border-border bg-white/5 text-slate-200 hover:bg-white/10",

    danger:
      "border border-red-500/20 bg-red-500/10 text-red-400 hover:bg-red-500/20",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-xl px-4 py-2.5
        text-sm font-semibold
        transition-all duration-200
        disabled:cursor-not-allowed disabled:opacity-50
        ${variants[variant]}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

function PanelTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white">
        {title}
      </h2>

      {subtitle && (
        <p className="mt-1 text-sm text-slate-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function StatusBadge({
  online,
  label,
}: {
  online: boolean;
  label?: string;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-2
        rounded-full border px-3 py-1
        text-xs font-semibold
        ${
          online
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        }
      `}
    >
      <span
        className={`
          h-2 w-2 rounded-full
          ${online ? "bg-emerald-400" : "bg-red-400"}
        `}
      />

      {label ?? (online ? "ONLINE" : "OFFLINE")}
    </span>
  );
}

function EmptyState({
  title,
  description,
  action,
  onAction,
}: {
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <Card className="flex flex-col items-center justify-center px-8 py-20 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400">
        <Server size={30} />
      </div>

      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>

      {action && (
        <Button
          className="mt-6"
          onClick={onAction}
        >
          {action}
          <ChevronRight size={16} />
        </Button>
      )}
    </Card>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-300">
        {label}
      </span>

      <input
        type={type}
        value={value}
        min={min}
        max={max}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="
          w-full rounded-xl
          border border-border
          bg-background px-4 py-3
          text-sm text-white
          placeholder:text-slate-600
          focus:border-indigo-500
          focus:ring-2 focus:ring-indigo-500/10
        "
      />
    </label>
  );
}

function Loading() {
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

/* =========================================================
   MAIN APPLICATION
========================================================= */

export default function App() {
  const [page, setPage] = useState<Page>("overview");

  const [boot, setBoot] = useState<Bootstrap | null>(null);

  const [dashboard, setDashboard] =
    useState<Dashboard | null>(null);

  const [projects, setProjects] = useState<Project[]>([]);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  const [busy, setBusy] = useState(true);

  const [error, setError] = useState("");

  const [notice, setNotice] = useState("");

  const loadDashboard = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      setDashboard(await api.dashboard());
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  const initialise = useCallback(async () => {
    setBusy(true);
    setError("");

    try {
      const next = await api.bootstrap();

      setBoot(next);

      setCatalog(await api.catalog());

      if (
        next.configured &&
        !["auto", "", "192.168.x.x"].includes(next.config.Host)
      ) {
        try {
          setDashboard(await api.dashboard());
        } catch (reason) {
          setError(messageOf(reason));
        }
      } else {
        setDashboard(null);
        setPage("settings");
      }
    } catch (reason) {
      setError(messageOf(reason));
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void initialise();
  }, [initialise]);

  useEffect(() => {
    if (page !== "projects" || projects.length) return;

    void api
      .projects()
      .then(setProjects)
      .catch((reason) => setError(messageOf(reason)));
  }, [page, projects.length]);

  const online = Boolean(dashboard && !error);

  const title =
    navigation.find((item) => item.id === page)?.label ??
    "DevNode";

  return (
    <div className="flex min-h-screen bg-background text-slate-100">

      {/* SIDEBAR */}

      <aside className="
        sticky top-0
        flex h-screen w-64 shrink-0 flex-col
        border-r border-border
        bg-sidebar
      ">

        {/* BRAND */}

        <div className="flex items-center gap-3 border-b border-border px-5 py-6">
          <img
            src="/logo.png"
            alt="DevNode"
            className="h-12 w-12 rounded-xl object-contain"
          />

          <div className="min-w-0">
            <h2 className="bg-gradient-to-r from-cyan-400 to-violet-500 bg-clip-text text-xl font-bold tracking-tight text-transparent">
              DevNode
            </h2>

            <p className="text-xs text-slate-500">
              Remote workspace
            </p>
          </div>
        </div>

        {/* NAVIGATION */}

        <div className="px-5 pb-3 pt-7">
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-600">
            WORKSPACE
          </p>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const Icon = item.icon;

            const active = page === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setPage(item.id);
                  setError("");
                }}
                className={`
                  flex w-full items-center gap-3
                  rounded-xl px-4 py-3
                  text-left text-sm font-medium
                  transition-all duration-200
                  ${
                    active
                      ? "bg-indigo-500/15 text-indigo-400"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }
                `}
              >
                <Icon size={19} />

                <span>{item.label}</span>

                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-400" />
                )}
              </button>
            );
          })}
        </nav>

        {/* CONNECTION STATUS */}

        <div className="border-t border-border p-4">
          <div className="rounded-xl border border-border bg-background/60 p-4">
            <div className="flex items-center gap-3">
              {online ? (
                <Wifi size={18} className="text-emerald-400" />
              ) : (
                <WifiOff size={18} className="text-red-400" />
              )}

              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {online ? "Server online" : "Not connected"}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {dashboard?.target ??
                    boot?.config.Host ??
                    "Configure server"}
                </p>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] text-slate-600">
            {boot?.platform ?? "desktop"} · DevNode Desktop
          </p>
        </div>
      </aside>

      {/* MAIN */}

      <main className="min-w-0 flex-1">

        {/* HEADER */}

        <header className="
          sticky top-0 z-20
          flex h-24 items-center justify-between
          border-b border-border
          bg-background/90 px-8
          backdrop-blur-xl
        ">
          <div>
            <p className="text-[11px] font-bold tracking-[0.2em] text-indigo-400">
              WORKSPACE
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight">
              {title}
            </h1>
          </div>

          <div className="flex items-center gap-5">
            {dashboard && (
              <span className="hidden text-xs text-slate-500 md:block">
                Updated {formatTime(dashboard.updatedAt)}
              </span>
            )}

            <button
              aria-label="Refresh dashboard"
              onClick={() => void loadDashboard()}
              disabled={busy}
              className="
                rounded-xl border border-border
                bg-surface p-3
                text-slate-400
                hover:border-indigo-500/40
                hover:text-white
                disabled:opacity-50
              "
            >
              <RefreshCw
                size={18}
                className={busy ? "animate-spin" : ""}
              />
            </button>
          </div>
        </header>

        {/* ALERTS */}

        {(error || notice) && (
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
            {error ? (
              <AlertTriangle size={18} />
            ) : (
              <CheckCircle2 size={18} />
            )}

            <span className="flex-1">
              {error || notice}
            </span>

            <button
              onClick={() => {
                setError("");
                setNotice("");
              }}
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* PAGE CONTENT */}

        <div className="mx-auto max-w-[1600px] p-8">
          {busy && !boot && <Loading />}

          {page === "overview" && (
            <Overview
              dashboard={dashboard}
              onConfigure={() => setPage("settings")}
            />
          )}

          {page === "projects" && (
            <Projects
              projects={projects}
              reload={async () =>
                setProjects(await api.projects())
              }
              notify={setNotice}
              fail={setError}
            />
          )}

          {page === "services" && (
            <Services
              dashboard={dashboard}
              catalog={catalog}
              refresh={loadDashboard}
              notify={setNotice}
              fail={setError}
            />
          )}

          {page === "terminal" && <Terminal />}

          {page === "settings" && boot && (
            <Connection
              boot={boot}
              changed={async () => {
                await initialise();
                setPage("overview");
              }}
              notify={setNotice}
              fail={setError}
            />
          )}

          {page === "help" && (
            <Help
              initialPlatform={boot?.platform ?? "darwin"}
            />
          )}
        </div>
      </main>
    </div>
  );
}

/* =========================================================
   OVERVIEW
========================================================= */

function Overview({
  dashboard,
  onConfigure,
}: {
  dashboard: Dashboard | null;
  onConfigure: () => void;
}) {
  if (!dashboard) {
    return (
      <EmptyState
        title="Connect your development server"
        description="Configure or discover an Ubuntu host to monitor resources, manage services, and access your development workspace."
        action="Configure connection"
        onAction={onConfigure}
      />
    );
  }

  const snapshot = dashboard.snapshot;

  const services = Object.entries(snapshot.Services ?? {})
    .filter(([, state]) => state.State !== "not-installed")
    .slice(0, 6);

  return (
    <div className="space-y-6">

      {/* SERVER HERO */}

      <Card className="
        relative overflow-hidden
        border-indigo-500/20
        bg-gradient-to-br
        from-indigo-950/60
        via-surface
        to-cyan-950/20
        p-8
      ">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div>
            <StatusBadge online />

            <h2 className="mt-5 text-3xl font-bold tracking-tight">
              {snapshot.Host || dashboard.target}
            </h2>

            <p className="mt-3 text-sm text-slate-400">
              {snapshot.OS} · {snapshot.Arch} · Up {snapshot.Uptime}
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/20 px-6 py-5">
            <p className="text-xs font-semibold tracking-widest text-slate-500">
              SERVER ADDRESS
            </p>

            <code className="mt-2 block text-lg font-semibold text-cyan-400">
              {snapshot.IP || dashboard.target}
            </code>
          </div>
        </div>
      </Card>

      {/* METRICS */}

      <div className="grid gap-5 md:grid-cols-3">
        <Metric
          label="CPU Usage"
          value={snapshot.CPU}
          detail={snapshot.CPUModel}
          icon={<Cpu size={20} />}
        />

        <Metric
          label="Memory Usage"
          value={snapshot.Memory}
          detail={snapshot.MemoryTotal}
          icon={<MemoryStick size={20} />}
        />

        <Metric
          label="Disk Usage"
          value={snapshot.Disk}
          detail={snapshot.DiskTotal}
          icon={<HardDrive size={20} />}
        />
      </div>

      {/* TOOLS + SERVICES */}

      <div className="grid gap-6 xl:grid-cols-2">

        <Card className="p-6">
          <PanelTitle
            title="Development tools"
            subtitle={`${dashboard.tools.length} tools detected`}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            {dashboard.tools.map((tool) => (
              <div
                key={tool.Key}
                className="
                  flex items-center gap-3
                  rounded-xl border border-border
                  bg-background/50 p-4
                "
              >
                <div
                  className={`
                    h-2.5 w-2.5 shrink-0 rounded-full
                    ${
                      tool.Version
                        ? "bg-emerald-400"
                        : "bg-slate-600"
                    }
                  `}
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {tool.Label}
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {tool.Version || "Not installed"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <PanelTitle
            title="Active services"
            subtitle={`${services.length} available`}
          />

          <div className="space-y-3">
            {services.map(([name, state]) => (
              <div
                key={name}
                className="
                  flex items-center gap-4
                  rounded-xl border border-border
                  bg-background/50 p-4
                "
              >
                <div className="
                  flex h-10 w-10 items-center justify-center
                  rounded-xl bg-indigo-500/10
                  text-indigo-400
                ">
                  <Server size={19} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {friendly(name)}
                  </p>

                  <p className="text-xs text-slate-500">
                    {state.Source}
                  </p>
                </div>

                <StatusBadge
                  online={isRunning(state.State)}
                  label={state.State}
                />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: number;
  detail: string;
  icon: ReactNode;
}) {
  const percentage =
    value < 0 ? 0 : Math.min(100, Math.max(0, value));

  return (
    <Card className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="
            flex h-10 w-10 items-center justify-center
            rounded-xl bg-indigo-500/10
            text-indigo-400
          ">
            {icon}
          </div>

          <span className="text-sm font-medium text-slate-400">
            {label}
          </span>
        </div>

        <Activity size={17} className="text-slate-600" />
      </div>

      <p className="text-3xl font-bold">
        {value < 0 ? "—" : `${value}%`}
      </p>

      <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
        <div
          className={`
            h-full rounded-full transition-all
            ${
              percentage > 85
                ? "bg-red-500"
                : percentage > 65
                  ? "bg-amber-400"
                  : "bg-gradient-to-r from-cyan-400 to-indigo-500"
            }
          `}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <p className="mt-4 truncate text-xs text-slate-500">
        {detail || "No details reported"}
      </p>
    </Card>
  );
}

/* =========================================================
   PROJECTS
========================================================= */

function Projects({
  projects,
  reload,
  notify,
  fail,
}: {
  projects: Project[];
  reload: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();

    if (!name.trim()) return;

    setAdding(true);
    fail("");

    try {
      notify(String(await api.createProject(name.trim())));
      setName("");
      await reload();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setAdding(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <form
          onSubmit={(event) => void create(event)}
          className="flex flex-wrap items-center justify-between gap-5"
        >
          <div>
            <h2 className="text-xl font-bold">
              Remote projects
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              Projects stored in{" "}
              <code className="text-cyan-400">
                ~/projects
              </code>{" "}
              on the server.
            </p>
          </div>

          <div className="flex w-full gap-3 sm:w-auto">
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="new-project"
              className="
                min-w-0 flex-1 rounded-xl
                border border-border
                bg-background px-4 py-3
                text-sm text-white
                focus:border-indigo-500
                sm:w-60
              "
            />

            <Button
              type="submit"
              disabled={adding}
            >
              <Plus size={17} />
              {adding ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </Card>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first remote development project to get started."
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.name}
              className="group p-6 transition-all hover:border-indigo-500/40"
            >
              <div className="mb-6 flex items-center justify-between">
                <div className="
                  flex h-12 w-12 items-center justify-center
                  rounded-xl bg-indigo-500/10
                  text-indigo-400
                ">
                  <Folder size={24} />
                </div>

                <ChevronRight
                  size={18}
                  className="text-slate-600 transition-transform group-hover:translate-x-1"
                />
              </div>

              <h3 className="truncate text-lg font-bold">
                {project.name}
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                {project.packageManager === "none"
                  ? "No package manager"
                  : project.packageManager}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-400">
                  {project.branch === "-"
                    ? "No Git repository"
                    : project.branch}
                </span>

                {project.dirty && (
                  <span className="rounded-lg bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
                    Modified
                  </span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SERVICES
========================================================= */

function Services({
  dashboard,
  catalog,
  refresh,
  notify,
  fail,
}: {
  dashboard: Dashboard | null;
  catalog: CatalogItem[];
  refresh: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  const states = dashboard?.snapshot.Services ?? {};

  const [working, setWorking] = useState("");

  async function manage(name: string, action: string) {
    setWorking(`${name}:${action}`);
    fail("");

    try {
      notify(String(await api.manageService(name, action)));
      await refresh();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {catalog.map((item) => {
        const state = states[item.name];

        const installed =
          Boolean(state) &&
          state.State !== "not-installed";

        const running =
          installed && isRunning(state.State);

        const manageable =
          installed &&
          ["docker", "systemd"].includes(state.Source);

        return (
          <Card
            key={item.name}
            className="flex flex-col p-6 transition-all hover:border-indigo-500/30"
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="
                flex h-12 w-12 items-center justify-center
                rounded-xl bg-indigo-500/10
                text-indigo-400
              ">
                <Server size={23} />
              </div>

              <StatusBadge
                online={running}
                label={installed ? state.State : "Not installed"}
              />
            </div>

            <h3 className="text-lg font-bold">
              {item.label}
            </h3>

            <p className="mt-3 flex-1 text-sm leading-6 text-slate-400">
              {item.description}
            </p>

            {manageable && (
              <div className="mt-6 flex gap-2">
                <Button
                  disabled={Boolean(working)}
                  onClick={() =>
                    void manage(
                      item.name,
                      running ? "restart" : "start",
                    )
                  }
                  className="flex-1"
                >
                  {working.startsWith(`${item.name}:`)
                    ? "Working…"
                    : running
                      ? "Restart"
                      : "Start"}
                </Button>

                {running && (
                  <Button
                    variant="danger"
                    disabled={Boolean(working)}
                    onClick={() =>
                      void manage(item.name, "stop")
                    }
                  >
                    Stop
                  </Button>
                )}
              </div>
            )}

            <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
              <span className="rounded-lg bg-white/5 px-3 py-1 text-xs text-slate-500">
                {item.method}
              </span>

              {item.guided && (
                <span className="rounded-lg bg-indigo-500/10 px-3 py-1 text-xs text-indigo-400">
                  Guided setup
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* =========================================================
   TERMINAL
========================================================= */

function Terminal() {
  const [command, setCommand] = useState("");

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void api
      .connectionCommand()
      .then(setCommand)
      .catch(() =>
        setCommand("Configure a server first"),
      );
  }, []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-black/30 px-6 py-4">
        <span className="h-3 w-3 rounded-full bg-red-500" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-500" />

        <div className="ml-4 flex items-center gap-2 text-sm text-slate-400">
          <TerminalIcon size={16} />
          Secure shell
        </div>
      </div>

      <div className="space-y-6 p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
            <TerminalIcon size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold">
              Remote terminal
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Embedded terminal support is reserved for the
              next implementation stage. Use the generated SSH
              command in Terminal, PowerShell, or Linux.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-black/40 p-5">
          <code className="min-w-0 flex-1 break-all font-mono text-sm text-emerald-400">
            <span className="mr-3 text-slate-600">$</span>
            {command}
          </code>

          <Button
            variant="secondary"
            onClick={() => void copy()}
          >
            {copied ? (
              <Check size={16} />
            ) : (
              <Copy size={16} />
            )}

            {copied ? "Copied" : "Copy"}
          </Button>
        </div>

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <ShieldCheck size={18} className="text-emerald-400" />

          Uses your existing OpenSSH agent, identity, and
          known-host verification.
        </div>
      </div>
    </Card>
  );
}

/* =========================================================
   CONNECTION
========================================================= */

function Connection({
  boot,
  changed,
  notify,
  fail,
}: {
  boot: Bootstrap;
  changed: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  const [form, setForm] = useState<ConnectionInput>(() => ({
    host: boot.config.Host,
    user: boot.config.User,
    port: boot.config.Port,
    identityFile: boot.config.IdentityFile,
    connectTimeout: boot.config.ConnectTimeout,
    postgresService: boot.config.PostgresService,
  }));

  const [working, setWorking] = useState("");

  const missing = boot.tools.filter((tool) => !tool.available);

  function field<K extends keyof ConnectionInput>(
    key: K,
    value: ConnectionInput[K],
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setWorking("save");
    fail("");

    try {
      const result = await api.saveConnection(form);
      notify(String(result.message ?? "Saved"));
      await changed();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  async function discover() {
    setWorking("discover");
    fail("");

    try {
      const result = await api.discover();
      notify(String(result.message));
      await changed();
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  async function test() {
    setWorking("test");
    fail("");

    try {
      const result = await api.testConnection();
      notify(`Connected to ${result.target}`);
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking("");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <PairingWizard
          changed={changed}
          notify={notify}
          fail={fail}
        />

        <Card className="p-7">
          <PanelTitle
            title="Manual SSH connection"
            subtitle={boot.configPath}
          />

          <form
            onSubmit={(event) => void save(event)}
            className="space-y-6"
          >
            <Input
              label="Server host"
              value={form.host}
              placeholder="auto, ubuntu.local, or 192.168.1.20"
              onChange={(value) => field("host", value)}
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="SSH user"
                value={form.user}
                placeholder="ubuntu"
                onChange={(value) => field("user", value)}
              />

              <Input
                label="Port"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(value) =>
                  field("port", Number(value))
                }
              />
            </div>

            <Input
              label="Identity file (optional)"
              value={form.identityFile}
              placeholder="~/.ssh/devnode_ed25519"
              onChange={(value) =>
                field("identityFile", value)
              }
            />

            <div className="grid gap-5 md:grid-cols-2">
              <Input
                label="Connection timeout"
                type="number"
                min={1}
                max={300}
                value={form.connectTimeout}
                onChange={(value) =>
                  field("connectTimeout", Number(value))
                }
              />

              <Input
                label="PostgreSQL service"
                value={form.postgresService}
                onChange={(value) =>
                  field("postgresService", value)
                }
              />
            </div>

            <div className="flex flex-wrap gap-3 border-t border-border pt-6">
              <Button
                variant="secondary"
                disabled={Boolean(working)}
                onClick={() => void discover()}
              >
                <Search size={17} />

                {working === "discover"
                  ? "Scanning…"
                  : "Discover server"}
              </Button>

              <Button
                variant="secondary"
                disabled={Boolean(working) || !boot.configured}
                onClick={() => void test()}
              >
                <Activity size={17} />

                {working === "test"
                  ? "Testing…"
                  : "Test connection"}
              </Button>

              <Button
                type="submit"
                disabled={Boolean(working)}
              >
                <Check size={17} />

                {working === "save"
                  ? "Saving…"
                  : "Save connection"}
              </Button>
            </div>
          </form>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6">
          <PanelTitle
            title="Local requirements"
            subtitle={boot.platform}
          />

          <div className="space-y-4">
            {boot.tools.map((tool) => (
              <div
                key={tool.name}
                className="flex items-start gap-3"
              >
                <div
                  className={`
                    rounded-lg p-2
                    ${
                      tool.available
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-red-500/10 text-red-400"
                    }
                  `}
                >
                  {tool.available ? (
                    <Check size={17} />
                  ) : (
                    <AlertTriangle size={17} />
                  )}
                </div>

                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {tool.name}
                  </p>

                  <p className="mt-1 break-all text-xs text-slate-500">
                    {tool.available
                      ? tool.path
                      : "Not found on PATH"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {missing.length > 0 && (
          <Card className="border-amber-500/20 p-6">
            <h3 className="font-semibold text-amber-400">
              OpenSSH is required
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Install or enable the OpenSSH client for your
              operating system, then restart DevNode.
            </p>
          </Card>
        )}

        <Card className="p-6">
          <div className="mb-4 flex items-center gap-3 text-indigo-400">
            <ShieldCheck size={21} />
            <h3 className="font-semibold text-white">
              First-time authentication
            </h3>
          </div>

          <p className="text-sm leading-6 text-slate-400">
            DevNode never stores your Ubuntu password.
            Run{" "}
            <code className="text-cyan-400">
              devnode setup
            </code>{" "}
            in a system terminal once to install the dedicated
            public key.
          </p>
        </Card>
      </div>
    </div>
  );
}

/* =========================================================
   PAIRING WIZARD
========================================================= */

function PairingWizard({
  changed,
  notify,
  fail,
}: {
  changed: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}) {
  const [servers, setServers] = useState<PairingServer[]>([]);

  const [progress, setProgress] =
    useState<PairProgress | null>(null);

  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!progress || progress.status !== "pending") return;

    const timer = window.setInterval(() => {
      void api
        .pairStatus(progress.requestId)
        .then(async (next) => {
          setProgress(next);

          if (next.status === "approved") {
            window.clearInterval(timer);
            notify(`Paired with ${next.target}`);
            await changed();
          } else if (
            ["rejected", "expired", "error"].includes(next.status)
          ) {
            window.clearInterval(timer);
            fail(next.message || `Pairing ${next.status}`);
          }
        })
        .catch((reason) => {
          window.clearInterval(timer);
          fail(messageOf(reason));
        });
    }, 1200);

    return () => window.clearInterval(timer);
  }, [
    progress?.requestId,
    progress?.status,
    changed,
    notify,
    fail,
  ]);

  async function scan() {
    setWorking(true);
    setProgress(null);
    fail("");

    try {
      const found = await api.discoverPairingServers();

      setServers(found);

      if (!found.length) {
        fail(
          "No Ubuntu pairing agent found. Run `devnode-agent pair` on Ubuntu, then scan again.",
        );
      }
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking(false);
    }
  }

  async function pair(server: PairingServer) {
    setWorking(true);
    fail("");

    try {
      setProgress(await api.requestPair(server));
    } catch (reason) {
      fail(messageOf(reason));
    } finally {
      setWorking(false);
    }
  }

  return (
    <Card className="overflow-hidden border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-surface p-7">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-400">
            <ShieldCheck size={14} />
            SECURE LOCAL PAIRING
          </div>

          <h2 className="text-2xl font-bold">
            Connect an Ubuntu computer
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-400">
            No IP address or password entry required.
            Start{" "}
            <code className="text-cyan-400">
              devnode-agent pair
            </code>{" "}
            on Ubuntu, then scan.
          </p>
        </div>

        <Button
          onClick={() => void scan()}
          disabled={working || progress?.status === "pending"}
        >
          <Search size={17} />

          {working ? "Scanning…" : "Scan local network"}
        </Button>
      </div>

      {servers.length > 0 && !progress && (
        <div className="mt-7 space-y-3">
          {servers.map((server) => (
            <button
              key={server.sessionId}
              onClick={() => void pair(server)}
              disabled={working}
              className="
                flex w-full items-center gap-4
                rounded-xl border border-border
                bg-background/60 p-4
                text-left
                hover:border-indigo-500/40
                disabled:opacity-50
              "
            >
              <div className="rounded-xl bg-indigo-500/10 p-3 text-indigo-400">
                <Monitor size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {server.name}
                </p>

                <p className="mt-1 break-all text-xs text-slate-500">
                  {server.user}@{server.address} ·{" "}
                  {server.hostFingerprint}
                </p>
              </div>

              <span className="text-sm font-semibold text-indigo-400">
                Pair →
              </span>
            </button>
          ))}
        </div>
      )}

      {progress && (
        <div className="mt-7 grid gap-5 rounded-xl border border-border bg-background/60 p-6 md:grid-cols-[180px_1fr]">
          <div>
            <p className="text-[10px] font-bold tracking-widest text-slate-500">
              MATCH CODE ON UBUNTU
            </p>

            <p className="mt-3 font-mono text-3xl font-bold tracking-widest text-cyan-400">
              {progress.code}
            </p>
          </div>

          <div>
            <h3 className="font-semibold">
              {progress.serverName}
            </h3>

            <p className="mt-2 text-sm text-slate-400">
              {progress.status === "pending"
                ? "Waiting for approval on the Ubuntu computer…"
                : progress.message}
            </p>

            <code className="mt-3 block break-all text-xs text-slate-500">
              {progress.hostFingerprint}
            </code>
          </div>
        </div>
      )}
    </Card>
  );
}

/* =========================================================
   HELP
========================================================= */

type HelpPlatform = "darwin" | "windows" | "linux";

const clientSetup: Record<
  HelpPlatform,
  {
    label: string;
    command: string;
    note: string;
  }
> = {
  darwin: {
    label: "macOS",
    command: "ssh -V",
    note: "OpenSSH is included with macOS. Run this in Terminal to confirm it is available.",
  },

  windows: {
    label: "Windows",
    command:
      "Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'\nAdd-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0",
    note: "Run PowerShell as Administrator if OpenSSH is not installed.",
  },

  linux: {
    label: "Linux",
    command: "sudo apt update\nsudo apt install -y openssh-client",
    note: "These commands are for Debian and Ubuntu clients.",
  },
};

function Help({
  initialPlatform,
}: {
  initialPlatform: string;
}) {
  const detected: HelpPlatform =
    initialPlatform === "windows"
      ? "windows"
      : initialPlatform === "linux"
        ? "linux"
        : "darwin";

  const [platform, setPlatform] =
    useState<HelpPlatform>(detected);

  const client = clientSetup[platform];

  return (
    <div className="space-y-6">
      <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-950/40 to-surface p-8">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400">
          <ShieldCheck size={14} />
          CONNECTION GUIDE
        </div>

        <h2 className="text-2xl font-bold">
          Connect DevNode to an Ubuntu computer
        </h2>

        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-400">
          The Ubuntu computer is the remote development server.
          DevNode runs on your Mac, Windows, or Linux computer
          and connects securely over SSH.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-5">
          <div className="rounded-xl border border-border bg-background/60 px-6 py-5">
            <Monitor className="mb-3 text-cyan-400" />

            <p className="font-semibold">
              {client.label}
            </p>

            <p className="text-xs text-slate-500">
              DevNode Desktop
            </p>
          </div>

          <div className="text-sm font-semibold text-indigo-400">
            SSH · port 22 →
          </div>

          <div className="rounded-xl border border-border bg-background/60 px-6 py-5">
            <Server className="mb-3 text-indigo-400" />

            <p className="font-semibold">
              Ubuntu
            </p>

            <p className="text-xs text-slate-500">
              Development server
            </p>
          </div>
        </div>
      </Card>

      <div
        role="tablist"
        aria-label="Client operating system"
        className="flex flex-wrap gap-2"
      >
        {(["darwin", "windows", "linux"] as HelpPlatform[]).map(
          (item) => (
            <button
              key={item}
              role="tab"
              aria-selected={platform === item}
              onClick={() => setPlatform(item)}
              className={`
                rounded-xl px-5 py-3
                text-sm font-semibold
                ${
                  platform === item
                    ? "bg-indigo-500 text-white"
                    : "border border-border bg-surface text-slate-400 hover:text-white"
                }
              `}
            >
              {clientSetup[item].label}
            </button>
          ),
        )}
      </div>

      <div className="space-y-4">
        <HelpStep
          number="01"
          title="Prepare the Ubuntu server"
          text="Install SSH, start it immediately, and enable it after restart."
          command={
            "sudo apt update\nsudo apt install -y openssh-server\nsudo systemctl enable --now ssh\ncommand -v ufw >/dev/null && sudo ufw allow OpenSSH"
          }
        />

        <HelpStep
          number="02"
          title="Find the Ubuntu address"
          text="Both computers must be connected to the same local network."
          command="hostname -I"
          hint="Example: 192.168.1.20"
        />

        <HelpStep
          number="03"
          title={`Prepare ${client.label}`}
          text={client.note}
          command={client.command}
        />

        <HelpStep
          number="04"
          title="Test SSH manually"
          text="Replace the username and IP address with your Ubuntu credentials."
          command="ssh ubuntu-user@192.168.1.20"
          hint="Verify the SSH host fingerprint before accepting it."
        />

        <HelpStep
          number="05"
          title="Install and start the Ubuntu agent"
          text="Install the DevNode pairing agent and start a secure pairing session."
          command={
            "git clone https://github.com/lahiruudayakumara/devnode.git\ncd devnode\nmake install-agent\n~/.local/bin/devnode-agent pair"
          }
          hint="If UFW is active, allow TCP 42424 and UDP 42425."
        />

        <HelpStep
          number="06"
          title="Pair automatically"
          text="Open Connection, scan your local network, choose the Ubuntu computer, compare the six-digit code, and approve pairing in the Ubuntu terminal."
        />
      </div>

      <Card className="p-7">
        <PanelTitle
          title="Connection troubleshooting"
          subtitle="Common SSH errors and how to resolve them"
        />

        <div className="grid gap-5 md:grid-cols-2">
          {[
            {
              title: "Operation timed out",
              text: "Check the IP address, SSH service, firewall, and network connectivity.",
            },
            {
              title: "Connection refused",
              text: "The server is reachable, but SSH may not be running or listening on the expected port.",
            },
            {
              title: "Permission denied",
              text: "Check the Ubuntu username and authentication configuration.",
            },
            {
              title: "Host key changed",
              text: "Verify the server identity before updating your trusted SSH host key.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border bg-background/50 p-5"
            >
              <h3 className="font-semibold">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {item.text}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 space-y-2">
          {[
            "ping 192.168.1.20",
            "nc -vz 192.168.1.20 22",
            "ssh -v ubuntu-user@192.168.1.20",
          ].map((command) => (
            <code
              key={command}
              className="block overflow-x-auto rounded-lg bg-black/40 px-4 py-3 text-xs text-cyan-400"
            >
              {command}
            </code>
          ))}
        </div>
      </Card>
    </div>
  );
}

function HelpStep({
  number,
  title,
  text,
  command,
  hint,
}: {
  number: string;
  title: string;
  text: string;
  command?: string;
  hint?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!command) return;

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card className="flex gap-6 p-6">
      <div className="
        flex h-11 w-11 shrink-0 items-center justify-center
        rounded-xl bg-indigo-500/10
        font-bold text-indigo-400
      ">
        {number}
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-lg font-semibold">
          {title}
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-400">
          {text}
        </p>

        {command && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-border bg-black/40 p-4">
            <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs leading-6 text-emerald-400">
              {command}
            </pre>

            <button
              aria-label={`Copy ${title} commands`}
              onClick={() => void copy()}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            >
              {copied ? (
                <Check size={17} />
              ) : (
                <Copy size={17} />
              )}
            </button>
          </div>
        )}

        {hint && (
          <p className="mt-4 text-xs text-slate-500">
            {hint}
          </p>
        )}
      </div>
    </Card>
  );
}

/* =========================================================
   UTILITIES
========================================================= */

function messageOf(reason: unknown) {
  return reason instanceof Error
    ? reason.message
    : String(reason);
}

function formatTime(value: string) {
  const date = new Date(value);

  return Number.isNaN(date.valueOf())
    ? "just now"
    : date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
}

function isRunning(value: string) {
  return ["active", "running", "installed"].includes(value);
}

function friendly(value: string) {
  return value
    .split("-")
    .map(
      (part) =>
        part.charAt(0).toUpperCase() + part.slice(1),
    )
    .join(" ");
}