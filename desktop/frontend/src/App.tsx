import { FormEvent, ReactNode, useCallback, useEffect, useState } from "react";
import { api } from "./api";
import type { Bootstrap, CatalogItem, ConnectionInput, Dashboard, PairingServer, PairProgress, Project } from "./types";

type Page = "overview" | "projects" | "services" | "terminal" | "settings" | "help";
type IconName = Page | "refresh" | "server" | "check" | "warning" | "plus" | "copy";

const nav: { id: Page; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "projects", label: "Projects" },
  { id: "services", label: "Services" },
  { id: "terminal", label: "Terminal" },
  { id: "settings", label: "Connection" },
  { id: "help", label: "Help & Setup" },
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    overview: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    projects: <><path d="M3 7.5h7l2 2h9v10.5H3z"/><path d="M3 7.5V5h7l2 2h7v2.5"/></>,
    services: <><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="11" cy="18" r="1"/></>,
    terminal: <><path d="m5 7 4 4-4 4M11 16h7"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
    help: <><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 1 1 3.7 2c-.9.6-1.4 1.1-1.4 2M12 17h.01"/></>,
    refresh: <><path d="M20 6v5h-5"/><path d="M18.2 15a7 7 0 1 1-.7-7.8L20 10"/></>,
    server: <><rect x="3" y="4" width="18" height="6" rx="2"/><rect x="3" y="14" width="18" height="6" rx="2"/><path d="M7 7h.01M7 17h.01M11 7h6M11 17h6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    warning: <><path d="M12 3 2.8 20h18.4z"/><path d="M12 9v4M12 17h.01"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{paths[name]}</svg>;
}

function App() {
  const [page, setPage] = useState<Page>("overview");
  const [boot, setBoot] = useState<Bootstrap | null>(null);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadDashboard = useCallback(async () => {
    setBusy(true); setError("");
    try { setDashboard(await api.dashboard()); }
    catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }, []);

  const initialise = useCallback(async () => {
    setBusy(true); setError("");
    try {
      const next = await api.bootstrap();
      setBoot(next);
      setCatalog(await api.catalog());
      if (next.configured && !["auto", "", "192.168.x.x"].includes(next.config.Host)) {
        try { setDashboard(await api.dashboard()); } catch (reason) { setError(messageOf(reason)); }
      } else {
        setPage("settings");
      }
    } catch (reason) { setError(messageOf(reason)); }
    finally { setBusy(false); }
  }, []);

  useEffect(() => { void initialise(); }, [initialise]);

  useEffect(() => {
    if (page !== "projects" || projects.length) return;
    void api.projects().then(setProjects).catch((reason) => setError(messageOf(reason)));
  }, [page, projects.length]);

  const online = Boolean(dashboard && !error);
  const title = nav.find((item) => item.id === page)?.label ?? "DevNode";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">DN</span><span><b>DevNode</b><small>Remote workspace</small></span></div>
        <nav>{nav.map((item) => <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => { setPage(item.id); setError(""); }}><Icon name={item.id}/><span>{item.label}</span></button>)}</nav>
        <div className="side-status">
          <span className={`pulse ${online ? "online" : ""}`}/>
          <div><b>{online ? "Server online" : "Not connected"}</b><small>{dashboard?.target ?? boot?.config.Host ?? "Configure a server"}</small></div>
        </div>
        <div className="platform">{boot?.platform ?? "desktop"} · DevNode Desktop</div>
      </aside>

      <main>
        <header className="topbar">
          <div><p className="eyebrow">WORKSPACE</p><h1>{title}</h1></div>
          <div className="top-actions">
            {dashboard && <span className="updated">Updated {formatTime(dashboard.updatedAt)}</span>}
            <button className="icon-button" aria-label="Refresh" onClick={() => void loadDashboard()} disabled={busy}><Icon name="refresh"/></button>
          </div>
        </header>

        {(error || notice) && <div className={`banner ${error ? "error" : "success"}`}><Icon name={error ? "warning" : "check"}/><span>{error || notice}</span><button onClick={() => { setError(""); setNotice(""); }}>×</button></div>}

        <div className="page-content">
          {busy && !boot ? <Loading/> : null}
          {page === "overview" && <Overview dashboard={dashboard} onConfigure={() => setPage("settings")}/>} 
          {page === "projects" && <Projects projects={projects} reload={async () => setProjects(await api.projects())} notify={setNotice}/>} 
          {page === "services" && <Services dashboard={dashboard} catalog={catalog} refresh={loadDashboard} notify={setNotice} fail={setError}/>} 
          {page === "terminal" && <Terminal/>}
          {page === "settings" && boot && <Connection boot={boot} changed={async () => { await initialise(); setPage("overview"); }} notify={setNotice} fail={setError}/>} 
          {page === "help" && <Help initialPlatform={boot?.platform ?? "darwin"}/>} 
        </div>
      </main>
    </div>
  );
}

function Overview({ dashboard, onConfigure }: { dashboard: Dashboard | null; onConfigure: () => void }) {
  if (!dashboard) return <Empty title="Connect your development server" text="Configure or discover an Ubuntu host to see live resources, tools, and services." action="Configure connection" onAction={onConfigure}/>;
  const s = dashboard.snapshot;
  const services = Object.entries(s.Services ?? {}).filter(([, state]) => state.State !== "not-installed").slice(0, 6);
  return <div className="stack">
    <section className="hero card"><div><span className="online-pill"><span/> ONLINE</span><h2>{s.Host || dashboard.target}</h2><p>{s.OS} · {s.Arch} · Up {s.Uptime}</p></div><div className="server-address"><small>SERVER ADDRESS</small><code>{s.IP || dashboard.target}</code></div></section>
    <section className="metrics">
      <Metric label="CPU" value={s.CPU} detail={s.CPUModel}/><Metric label="Memory" value={s.Memory} detail={s.MemoryTotal}/><Metric label="Disk" value={s.Disk} detail={s.DiskTotal}/>
    </section>
    <section className="two-column">
      <div className="card panel"><PanelTitle title="Development tools" subtitle={`${dashboard.tools.length} detected`}/><div className="tool-grid">{dashboard.tools.map((tool) => <div className="tool" key={tool.Key}><span className={`tool-dot ${tool.Version ? "ready" : ""}`}/><div><b>{tool.Label}</b><small>{tool.Version || "Not installed"}</small></div></div>)}</div></div>
      <div className="card panel"><PanelTitle title="Active services" subtitle={`${services.length} available`}/><div className="service-list">{services.map(([name, state]) => <div className="service-row" key={name}><span className={`service-icon ${isRunning(state.State) ? "running" : ""}`}><Icon name="server" size={16}/></span><div><b>{friendly(name)}</b><small>{state.Source}</small></div><span className={`state ${isRunning(state.State) ? "running" : ""}`}>{state.State}</span></div>)}</div></div>
    </section>
  </div>;
}

function Metric({ label, value, detail }: { label: string; value: number; detail: string }) {
  const safe = value < 0 ? 0 : value;
  return <div className="card metric"><div className="metric-top"><span>{label}</span><strong>{value < 0 ? "—" : `${value}%`}</strong></div><div className="meter"><span style={{ width: `${safe}%` }}/></div><small>{detail || "No details reported"}</small></div>;
}

function Projects({ projects, reload, notify }: { projects: Project[]; reload: () => Promise<void>; notify: (v: string) => void }) {
  const [name, setName] = useState(""); const [adding, setAdding] = useState(false);
  async function create(event: FormEvent) { event.preventDefault(); if (!name.trim()) return; setAdding(true); try { notify(String(await api.createProject(name.trim()))); setName(""); await reload(); } finally { setAdding(false); } }
  return <div className="stack"><form className="card create-row" onSubmit={(e) => void create(e)}><div><h2>Remote projects</h2><p>Projects stored in <code>~/projects</code> on the server.</p></div><div className="inline-form"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="new-project"/><button className="primary" disabled={adding}><Icon name="plus"/> Create</button></div></form>
    <div className="project-grid">{projects.map((project) => <article className="card project-card" key={project.name}><div className="folder-icon"><Icon name="projects"/></div><h3>{project.name}</h3><p>{project.packageManager === "none" ? "No package manager" : project.packageManager}</p><div><span>{project.branch === "-" ? "No Git repository" : project.branch}</span>{project.dirty && <span className="dirty">Modified</span>}</div></article>)}{!projects.length && <Empty title="No projects yet" text="Create the first remote project to get started."/>}</div>
  </div>;
}

function Services({ dashboard, catalog, refresh, notify, fail }: { dashboard: Dashboard | null; catalog: CatalogItem[]; refresh: () => Promise<void>; notify: (v: string) => void; fail: (v: string) => void }) {
  const states = dashboard?.snapshot.Services ?? {};
  const [working, setWorking] = useState("");
  async function manage(name: string, action: string) { setWorking(`${name}:${action}`); fail(""); try { notify(String(await api.manageService(name, action))); await refresh(); } catch (reason) { fail(messageOf(reason)); } finally { setWorking(""); } }
  return <div className="service-catalog">{catalog.map((item) => { const state = states[item.name]; const installed = state && state.State !== "not-installed"; const manageable = installed && ["docker", "systemd"].includes(state.Source); return <article className="card catalog-card" key={item.name}><div className="catalog-head"><span className={`service-icon ${installed && isRunning(state.State) ? "running" : ""}`}><Icon name="server"/></span><span className={`state ${installed ? "running" : ""}`}>{installed ? state.State : "not installed"}</span></div><h3>{item.label}</h3><p>{item.description}</p>{manageable && <div className="service-actions"><button disabled={Boolean(working)} onClick={() => void manage(item.name, isRunning(state.State) ? "restart" : "start")}>{working.startsWith(`${item.name}:`) ? "Working…" : isRunning(state.State) ? "Restart" : "Start"}</button>{isRunning(state.State) && <button disabled={Boolean(working)} onClick={() => void manage(item.name, "stop")}>Stop</button>}</div>}<div className="catalog-meta"><span>{item.method}</span>{item.guided && <span>Guided setup</span>}</div></article>; })}</div>;
}

function Terminal() {
  const [command, setCommand] = useState("");
  useEffect(() => { void api.connectionCommand().then(setCommand).catch(() => setCommand("Configure a server first")); }, []);
  async function copy() { await navigator.clipboard.writeText(command); }
  return <div className="terminal-card card"><div className="terminal-bar"><span/><span/><span/><b>Secure shell</b></div><div className="terminal-body"><p>Embedded terminal support is reserved for the next implementation stage. Use the generated SSH command in Terminal, PowerShell, or your Linux terminal.</p><div className="command"><code>{command}</code><button onClick={() => void copy()}><Icon name="copy"/> Copy</button></div><div className="terminal-hint"><Icon name="check"/><span>Uses your existing OpenSSH agent, identity, and known-host verification.</span></div></div></div>;
}

function Connection({ boot, changed, notify, fail }: { boot: Bootstrap; changed: () => Promise<void>; notify: (v: string) => void; fail: (v: string) => void }) {
  const [form, setForm] = useState<ConnectionInput>(() => ({ host: boot.config.Host, user: boot.config.User, port: boot.config.Port, identityFile: boot.config.IdentityFile, connectTimeout: boot.config.ConnectTimeout, postgresService: boot.config.PostgresService }));
  const [working, setWorking] = useState(""); const missing = boot.tools.filter((tool) => !tool.available);
  function field<K extends keyof ConnectionInput>(key: K, value: ConnectionInput[K]) { setForm((current) => ({ ...current, [key]: value })); }
  async function save(event: FormEvent) { event.preventDefault(); setWorking("save"); fail(""); try { const result = await api.saveConnection(form); notify(String(result.message ?? "Saved")); await changed(); } catch (reason) { fail(messageOf(reason)); } finally { setWorking(""); } }
  async function discover() { setWorking("discover"); fail(""); try { const result = await api.discover(); notify(String(result.message)); await changed(); } catch (reason) { fail(messageOf(reason)); } finally { setWorking(""); } }
  async function test() { setWorking("test"); fail(""); try { const result = await api.testConnection(); notify(`Connected to ${result.target}`); } catch (reason) { fail(messageOf(reason)); } finally { setWorking(""); } }
  return <div className="settings-grid"><div className="stack"><PairingWizard changed={changed} notify={notify} fail={fail}/><form className="card connection-form" onSubmit={(e) => void save(e)}><PanelTitle title="Manual SSH connection" subtitle={boot.configPath}/><div className="form-grid"><label className="wide"><span>Server host</span><input value={form.host} onChange={(e) => field("host", e.target.value)} placeholder="auto, ubuntu.local, or 192.168.1.20"/></label><label><span>SSH user</span><input value={form.user} onChange={(e) => field("user", e.target.value)} placeholder="ubuntu"/></label><label><span>Port</span><input type="number" min="1" max="65535" value={form.port} onChange={(e) => field("port", Number(e.target.value))}/></label><label className="wide"><span>Identity file <em>optional</em></span><input value={form.identityFile} onChange={(e) => field("identityFile", e.target.value)} placeholder="~/.ssh/devnode_ed25519"/></label><label><span>Connection timeout</span><input type="number" min="1" max="300" value={form.connectTimeout} onChange={(e) => field("connectTimeout", Number(e.target.value))}/></label><label><span>PostgreSQL service</span><input value={form.postgresService} onChange={(e) => field("postgresService", e.target.value)}/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => void discover()} disabled={Boolean(working)}>{working === "discover" ? "Scanning…" : "Discover server"}</button><button type="button" className="secondary" onClick={() => void test()} disabled={Boolean(working) || !boot.configured}>{working === "test" ? "Testing…" : "Test connection"}</button><button className="primary" disabled={Boolean(working)}>{working === "save" ? "Saving…" : "Save connection"}</button></div></form></div>
    <aside className="stack"><div className="card checklist"><PanelTitle title="Local requirements" subtitle={boot.platform}/>{boot.tools.map((tool) => <div className="check-row" key={tool.name}><span className={tool.available ? "ok" : "missing"}><Icon name={tool.available ? "check" : "warning"}/></span><div><b>{tool.name}</b><small>{tool.available ? tool.path : "Not found on PATH"}</small></div></div>)}</div>{missing.length > 0 && <div className="card help-card"><h3>OpenSSH is required</h3><p>Install or enable the OpenSSH client for this operating system, then restart DevNode.</p></div>}<div className="card help-card"><h3>First-time authentication</h3><p>DevNode never stores your Ubuntu password. Run <code>devnode setup</code> in a system terminal once to install the dedicated public key.</p></div></aside>
  </div>;
}

function PairingWizard({ changed, notify, fail }: { changed: () => Promise<void>; notify: (v: string) => void; fail: (v: string) => void }) {
  const [servers, setServers] = useState<PairingServer[]>([]);
  const [progress, setProgress] = useState<PairProgress | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    if (!progress || progress.status !== "pending") return;
    const timer = window.setInterval(() => {
      void api.pairStatus(progress.requestId).then(async (next) => {
        setProgress(next);
        if (next.status === "approved") {
          window.clearInterval(timer);
          notify(`Paired with ${next.target}`);
          await changed();
        } else if (["rejected", "expired", "error"].includes(next.status)) {
          window.clearInterval(timer);
          fail(next.message || `Pairing ${next.status}`);
        }
      }).catch((reason) => { window.clearInterval(timer); fail(messageOf(reason)); });
    }, 1200);
    return () => window.clearInterval(timer);
  }, [progress?.requestId, progress?.status, changed, notify, fail]);

  async function scan() { setWorking(true); setProgress(null); fail(""); try { const found = await api.discoverPairingServers(); setServers(found); if (!found.length) fail("No Ubuntu pairing agent found. Run `devnode-agent pair` on Ubuntu, then scan again."); } catch (reason) { fail(messageOf(reason)); } finally { setWorking(false); } }
  async function pair(server: PairingServer) { setWorking(true); fail(""); try { setProgress(await api.requestPair(server)); } catch (reason) { fail(messageOf(reason)); } finally { setWorking(false); } }

  return <section className="card pairing-card"><div className="pairing-head"><div><span className="online-pill"><span/> SECURE LOCAL PAIRING</span><h2>Connect an Ubuntu computer</h2><p>No IP address or password entry required. Start <code>devnode-agent pair</code> on Ubuntu, then scan.</p></div><button className="primary" onClick={() => void scan()} disabled={working || progress?.status === "pending"}>{working ? "Scanning…" : "Scan local network"}</button></div>
    {servers.length > 0 && !progress && <div className="pairing-servers">{servers.map((server) => <button key={server.sessionId} onClick={() => void pair(server)}><span className="service-icon running"><Icon name="server"/></span><div><b>{server.name}</b><small>{server.user}@{server.address} · {server.hostFingerprint}</small></div><span>Pair →</span></button>)}</div>}
    {progress && <div className={`pairing-progress ${progress.status}`}><div><small>MATCH THIS CODE ON UBUNTU</small><strong>{progress.code}</strong></div><div><b>{progress.serverName}</b><p>{progress.status === "pending" ? "Waiting for approval on the Ubuntu computer…" : progress.message}</p><code>{progress.hostFingerprint}</code></div></div>}
  </section>;
}

type HelpPlatform = "darwin" | "windows" | "linux";

const clientSetup: Record<HelpPlatform, { label: string; command: string; note: string }> = {
  darwin: {
    label: "macOS",
    command: "ssh -V",
    note: "OpenSSH is included with macOS. Run this in Terminal to confirm it is available.",
  },
  windows: {
    label: "Windows",
    command: "Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH.Client*'\nAdd-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0",
    note: "Run PowerShell as Administrator if the OpenSSH client is not installed.",
  },
  linux: {
    label: "Linux",
    command: "sudo apt update\nsudo apt install -y openssh-client",
    note: "These commands are for Debian and Ubuntu clients. Use your distribution package manager elsewhere.",
  },
};

function Help({ initialPlatform }: { initialPlatform: string }) {
  const detected: HelpPlatform = initialPlatform === "windows" ? "windows" : initialPlatform === "linux" ? "linux" : "darwin";
  const [platform, setPlatform] = useState<HelpPlatform>(detected);
  const client = clientSetup[platform];
  return <div className="help-layout">
    <section className="card help-intro"><span className="online-pill"><span/> CONNECTION GUIDE</span><h2>Connect DevNode to an Ubuntu computer</h2><p>The Ubuntu computer is the remote development server. DevNode runs on your Mac, Windows, or Linux computer and connects securely over SSH.</p><div className="connection-diagram"><div><b>{client.label}</b><small>DevNode Desktop</small></div><span>SSH · port 22 →</span><div><b>Ubuntu</b><small>Development server</small></div></div></section>

    <div className="help-platforms" role="tablist" aria-label="Client operating system">{(["darwin", "windows", "linux"] as HelpPlatform[]).map((item) => <button role="tab" aria-selected={platform === item} className={platform === item ? "active" : ""} key={item} onClick={() => setPlatform(item)}>{clientSetup[item].label}</button>)}</div>

    <section className="help-steps">
      <HelpStep number="01" title="Prepare the Ubuntu server" text="Run these commands directly on the Ubuntu laptop or computer. They install SSH, start it now, and enable it after restart." command={"sudo apt update\nsudo apt install -y openssh-server\nsudo systemctl enable --now ssh\ncommand -v ufw >/dev/null && sudo ufw allow OpenSSH"}/>
      <HelpStep number="02" title="Find the Ubuntu address" text="Both computers must be connected to the same Wi-Fi or local network. Save the IPv4 address shown by this command." command="hostname -I" hint="Example: 192.168.1.20"/>
      <HelpStep number="03" title={`Prepare ${client.label}`} text={client.note} command={client.command}/>
      <HelpStep number="04" title="Test SSH manually" text="Replace the username and address with the Ubuntu account name and address. Accept the host key, then enter the Ubuntu password." command="ssh ubuntu-user@192.168.1.20" hint="A successful login confirms the network, SSH server, username, and password are correct."/>
      <HelpStep number="05" title="Install and start the Ubuntu agent" text="From the DevNode repository on Ubuntu, install the local pairing helper. If UFW is active, allow the temporary pairing protocol, then open a secure two-minute window." command={"make install-agent\nsudo ufw allow 42424/tcp\nsudo ufw allow 42425/udp\n~/.local/bin/devnode-agent pair"}/>
      <HelpStep number="06" title="Pair automatically" text="Open Connection, select Scan local network, choose the Ubuntu computer, compare the six-digit code, and approve the request in the Ubuntu terminal."/>
    </section>

    <section className="card troubleshoot"><PanelTitle title="Connection troubleshooting" subtitle="What common errors mean"/><div className="trouble-grid"><div><b>Operation timed out</b><p>The address is wrong, SSH is stopped, a firewall blocks port 22, or the computers are on different networks.</p></div><div><b>Connection refused</b><p>The Ubuntu computer is reachable, but the SSH service is not running or is listening on another port.</p></div><div><b>Permission denied</b><p>Check the Ubuntu username and password, then rerun <code>devnode setup</code>.</p></div><div><b>Host key changed</b><p>Confirm the Ubuntu machine identity before removing or replacing an existing trusted host key.</p></div></div><div className="quick-check"><code>ping 192.168.1.20</code><code>nc -vz 192.168.1.20 22</code><code>ssh -v ubuntu-user@192.168.1.20</code></div></section>
  </div>;
}

function HelpStep({ number, title, text, command, hint }: { number: string; title: string; text: string; command?: string; hint?: string }) {
  async function copy() { if (command) await navigator.clipboard.writeText(command); }
  return <article className="card help-step"><span className="step-number">{number}</span><div><h3>{title}</h3><p>{text}</p>{command && <div className="help-command"><pre>{command}</pre><button onClick={() => void copy()} aria-label={`Copy ${title} commands`}><Icon name="copy"/> Copy</button></div>}{hint && <small>{hint}</small>}</div></article>;
}

function PanelTitle({ title, subtitle }: { title: string; subtitle?: string }) { return <div className="panel-title"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div></div>; }
function Loading() { return <div className="loading"><span/><p>Preparing DevNode…</p></div>; }
function Empty({ title, text, action, onAction }: { title: string; text: string; action?: string; onAction?: () => void }) { return <div className="card empty"><span className="empty-icon"><Icon name="server" size={28}/></span><h2>{title}</h2><p>{text}</p>{action && <button className="primary" onClick={onAction}>{action}</button>}</div>; }
function messageOf(reason: unknown) { return reason instanceof Error ? reason.message : String(reason); }
function formatTime(value: string) { const date = new Date(value); return Number.isNaN(date.valueOf()) ? "just now" : date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }); }
function isRunning(value: string) { return ["active", "running", "installed"].includes(value); }
function friendly(value: string) { return value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }

export default App;

