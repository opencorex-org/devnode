export type Page = "overview" | "projects" | "services" | "terminal" | "settings" | "help" | "about";

export type Config = {
  ConnectionMode: ConnectionMode;
  Host: string;
  User: string;
  Port: number;
  IdentityFile: string;
  ConnectTimeout: number;
  PostgresService: string;
};

export type ConnectionMode = "local" | "cloudflare" | "manual";

export type ToolCheck = { name: string; available: boolean; path: string };

export type Bootstrap = {
  version: string;
  platform: string;
  configPath: string;
  configured: boolean;
  config: Config;
  tools: ToolCheck[];
};

export type ConnectionInput = {
  connectionMode: ConnectionMode;
  host: string;
  user: string;
  port: number;
  identityFile: string;
  connectTimeout: number;
  postgresService: string;
};

export type ServiceState = { State: string; Source: string };

export type Snapshot = {
  Host: string;
  OS: string;
  Arch: string;
  IP: string;
  Uptime: string;
  CPUModel: string;
  MemoryTotal: string;
  DiskTotal: string;
  CPU: number;
  Memory: number;
  Disk: number;
  NetRX: number;
  NetTX: number;
  NetAvailable: boolean;
  Services: Record<string, ServiceState>;
  Tools: Record<string, string>;
};

export type ActiveTool = { Key: string; Label: string; Version: string };
export type Dashboard = { target: string; updatedAt: string; snapshot: Snapshot; tools: ActiveTool[] };
export type Project = { name: string; packageManager: string; branch: string; dirty: boolean };
export type CatalogItem = {
  name: string;
  label: string;
  method: string;
  description: string;
  guided: boolean;
  steps: string[];
};

export type PairingServer = {
  name: string;
  address: string;
  port: number;
  user: string;
  sessionId: string;
  hostFingerprint: string;
};

export type PairProgress = {
  status: string;
  message: string;
  requestId: string;
  code: string;
  serverName: string;
  serverUser: string;
  hostFingerprint: string;
  target: string;
};
