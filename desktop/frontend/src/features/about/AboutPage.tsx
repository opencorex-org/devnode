import type { Bootstrap, Dashboard } from "../../types";
import {
  Check,
  Code2,
  Copy,
  Cpu,
  FolderGit2,
  Globe,
  HardDrive,
  Info,
  Layers,
  Network,
  Radio,
  Server,
  ShieldCheck,
  Terminal,
} from "lucide-react";

import { Card } from "../../components/ui/Card";
import logo from "../../assets/logo.png";
import { useState } from "react";

interface AboutPageProps {
  boot: Bootstrap | null;
  dashboard: Dashboard | null;
}

export function AboutPage({ boot, dashboard }: AboutPageProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Ignore
    }
  };

  const isConnected = Boolean(dashboard && dashboard.target);

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-8">
      {/* Hero Header Card */}
      <Card className="relative overflow-hidden p-6">
        <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:items-center">
          <img
            src={logo}
            alt="DevNode Logo"
            className="h-20 w-20 shrink-0 rounded-2xl shadow-xl shadow-indigo-500/10 ring-1 ring-white/10"
          />

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
              <h1 className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-violet-400 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
                DevNode
              </h1>
              <span className="rounded-full border border-indigo-500/30 bg-indigo-500/15 px-2.5 py-0.5 text-[10px] font-semibold tracking-wide text-indigo-300">
                v0.1.0-beta
              </span>
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                {boot?.platform ? boot.platform.toUpperCase() : "DESKTOP"}
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
              Unified desktop control plane and CLI companion for remote Ubuntu
              development environments over SSH.
            </p>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400 sm:justify-start">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                SSH Key Authenticated
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Radio size={14} className="text-cyan-400" />
                Real-Time Telemetry
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-400" />
                Docker & Systemd Ready
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Connection & Runtime Information */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Server size={14} className="text-indigo-400" />
            <span>Target Server</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Status</span>
              <span
                className={`font-medium ${
                  isConnected ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {isConnected ? "Connected & Online" : "Disconnected / Offline"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">SSH Target</span>
              <span className="font-mono text-slate-200">
                {dashboard?.target || boot?.config.Host || "—"}
              </span>
            </div>

            {dashboard?.snapshot && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Remote Host / OS</span>
                  <span className="font-mono text-slate-200">
                    {dashboard.snapshot.Host} ({dashboard.snapshot.OS})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Architecture</span>
                  <span className="font-mono text-slate-200">
                    {dashboard.snapshot.Arch}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">System Uptime</span>
                  <span className="text-slate-200">
                    {dashboard.snapshot.Uptime}
                  </span>
                </div>
              </>
            )}
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Cpu size={14} className="text-cyan-400" />
            <span>Client Environment</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Local OS</span>
              <span className="font-mono text-slate-200">
                {boot?.platform ?? "macOS"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Frontend Stack</span>
              <span className="text-slate-200">
                React 19, Tailwind v4, Vite
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500">Desktop Engine</span>
              <span className="text-slate-200">Wails v3, Go 1.24</span>
            </div>

            <div className="flex items-start justify-between gap-2 pt-1 border-t border-border/50">
              <span className="text-slate-500 shrink-0">Config File</span>
              <div className="flex items-center gap-1.5 min-w-0">
                <code className="truncate font-mono text-[11px] text-slate-300">
                  {boot?.configPath || "~/.config/devnode/config.json"}
                </code>
                {boot?.configPath && (
                  <button
                    type="button"
                    onClick={() => copyText(boot.configPath, "cfg")}
                    className="shrink-0 rounded p-1 text-slate-500 hover:text-white transition-colors"
                    title="Copy config path"
                  >
                    {copiedKey === "cfg" ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Key Architectural Features */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Core Capabilities
        </h3>

        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4 space-y-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Radio size={14} />
            </div>
            <h4 className="text-xs font-semibold text-white">
              Live Monitoring
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Sub-second metrics for CPU usage, memory utilization, disk space,
              and network RX/TX bandwidth.
            </p>
          </Card>

          <Card className="p-4 space-y-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers size={14} />
            </div>
            <h4 className="text-xs font-semibold text-white">
              Service Management
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Start, restart, stop, and inspect background services across
              Docker containers and native systemd units.
            </p>
          </Card>

          <Card className="p-4 space-y-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <FolderGit2 size={14} />
            </div>
            <h4 className="text-xs font-semibold text-white">
              Project Workspaces
            </h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Manage remote code repositories in{" "}
              <code className="text-slate-300">~/projects</code> with Git branch
              detection and package manager integrations.
            </p>
          </Card>
        </div>
      </div>

      {/* Useful CLI Commands Card */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Terminal size={14} className="text-indigo-400" />
          <span>Quick CLI Commands</span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              cmd: "devnode connect",
              desc: "Open SSH shell into remote server",
            },
            {
              cmd: "devnode status",
              desc: "Interactive terminal monitor & stats",
            },
            {
              cmd: "devnode tunnel <service>",
              desc: "Securely forward a port to Mac",
            },
            {
              cmd: "devnode install <service>",
              desc: "Guided installer for catalog services",
            },
          ].map((item, idx) => {
            const isCopied = copiedKey === `cli-${idx}`;
            return (
              <div
                key={idx}
                className="flex items-center justify-between gap-2 rounded-lg border border-border bg-slate-950/60 p-2.5 font-mono text-[11px]"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-emerald-400 font-mono truncate">
                    <span className="text-slate-600 mr-1">$</span>
                    {item.cmd}
                  </div>
                  <div className="text-[10px] text-slate-500 font-sans truncate">
                    {item.desc}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => copyText(item.cmd, `cli-${idx}`)}
                  className="shrink-0 rounded p-1 text-slate-500 hover:text-white transition-colors"
                  title="Copy command"
                >
                  {isCopied ? (
                    <Check size={12} className="text-emerald-400" />
                  ) : (
                    <Copy size={12} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Footer Info */}
      <div className="flex flex-col items-center justify-between gap-2 border-t border-border/50 pt-3 text-center text-[10px] text-slate-500 sm:flex-row sm:text-left">
        <span>Copyright © 2026 OpenCorex. All rights reserved.</span>

        <span>DevNode · Licensed under the Apache License 2.0</span>
      </div>
    </div>
  );
}
