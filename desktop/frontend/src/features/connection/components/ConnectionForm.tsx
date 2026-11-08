import { Activity, Check, Cloud, Network, Search, Terminal } from "lucide-react";

import { Card } from "../../../components/ui/Card";
import type { ConnectionInput } from "../../../types";
import type { FormEvent } from "react";
import { Input } from "../../../components/ui/Input";
import { PanelTitle } from "../../../components/shared/PanelTitle";

interface ConnectionFormProps {
  form: ConnectionInput;
  field: <K extends keyof ConnectionInput>(
    key: K,
    value: ConnectionInput[K],
  ) => void;
  working: string;
  configured: boolean;
  configPath: string;
  onSave: (event: FormEvent) => void;
  onDiscover: () => void;
  onTest: () => void;
}

export function ConnectionForm({
  form,
  field,
  working,
  configured,
  configPath,
  onSave,
  onDiscover,
  onTest,
}: ConnectionFormProps) {
  const busy = Boolean(working);

  const modes = [
    { id: "local" as const, label: "Local LAN", icon: Network, detail: "Pair or discover nearby Ubuntu" },
    { id: "cloudflare" as const, label: "Cloudflare WARP", icon: Cloud, detail: "Private remote overlay" },
    { id: "manual" as const, label: "Manual SSH", icon: Terminal, detail: "Hostname or IP you manage" },
  ];

  const buttonClass = `
    inline-flex h-7 items-center justify-center gap-1.5
    rounded-md border px-2.5
    text-[10px] font-medium
    transition-colors duration-150
    disabled:cursor-not-allowed disabled:opacity-40
  `;

  return (
    <Card className="p-3">
      {/* Header */}
      <div className="mb-3">
        <PanelTitle
          title="Server connection"
          subtitle={`${modes.find((mode) => mode.id === form.connectionMode)?.label} · ${configPath}`}
        />
      </div>

      <form onSubmit={onSave} className="space-y-2.5">
        <div>
          <p className="mb-1.5 text-[10px] font-medium text-slate-400">Connection method</p>
          <div className="grid gap-1.5 sm:grid-cols-3">
            {modes.map((mode) => {
              const Icon = mode.icon;
              const selected = form.connectionMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => field("connectionMode", mode.id)}
                  className={`rounded-md border p-2 text-left transition-colors ${selected ? "border-indigo-500/50 bg-indigo-500/10 text-indigo-300" : "border-border bg-background/40 text-slate-400 hover:text-foreground"}`}
                >
                  <span className="flex items-center gap-1.5 text-[10px] font-semibold"><Icon size={12} />{mode.label}</span>
                  <span className="mt-1 block text-[9px] leading-3 text-slate-500">{mode.detail}</span>
                </button>
              );
            })}
          </div>
          {form.connectionMode === "cloudflare" && (
            <p className="mt-1.5 rounded-md border border-cyan-500/20 bg-cyan-500/5 px-2 py-1.5 text-[9px] leading-3.5 text-cyan-300">
              Connect Cloudflare WARP first. Enter the private Tunnel route address; do not expose ports 22 or 5432.
            </p>
          )}
        </div>

        {/* Server Host */}
        <div className="[&_input]:h-8 [&_input]:rounded-md [&_input]:px-2.5 [&_input]:text-[11px] [&_label]:text-[10px]">
          <Input
            label="Server host"
            value={form.host}
            placeholder={form.connectionMode === "cloudflare" ? "10.77.0.10 or private hostname" : "auto, ubuntu.local, or 192.168.1.20"}
            onChange={(value) => field("host", value)}
          />
        </div>

        {/* SSH User + Port */}
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 [&_input]:h-8 [&_input]:rounded-md [&_input]:px-2.5 [&_input]:text-[11px] [&_label]:text-[10px]">
            <Input
              label="SSH user"
              value={form.user}
              placeholder="ubuntu"
              onChange={(value) => field("user", value)}
            />
          </div>

          <div className="min-w-0 [&_input]:h-8 [&_input]:rounded-md [&_input]:px-2.5 [&_input]:text-[11px] [&_label]:text-[10px]">
            <Input
              label="Port"
              type="number"
              min={1}
              max={65535}
              value={form.port}
              onChange={(value) => field("port", Number(value))}
            />
          </div>
        </div>

        {/* Identity File */}
        <div className="[&_input]:h-8 [&_input]:rounded-md [&_input]:px-2.5 [&_input]:text-[11px] [&_label]:text-[10px]">
          <Input
            label="Identity file (optional)"
            value={form.identityFile}
            placeholder="~/.ssh/devnode_ed25519"
            onChange={(value) => field("identityFile", value)}
          />
        </div>

        {/* Timeout + PostgreSQL */}
        <div className="grid grid-cols-2 gap-2">
          <div className="min-w-0 [&_input]:h-8 [&_input]:rounded-md [&_input]:px-2.5 [&_input]:text-[11px] [&_label]:text-[10px]">
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
          </div>

          <div className="min-w-0 [&_input]:h-8 [&_input]:rounded-md [&_input]:px-2.5 [&_input]:text-[11px] [&_label]:text-[10px]">
            <Input
              label="PostgreSQL service"
              value={form.postgresService}
              onChange={(value) => field("postgresService", value)}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
          {/* Discover */}
          <button
            type="button"
            disabled={busy || form.connectionMode === "cloudflare"}
            onClick={onDiscover}
            className={`${buttonClass} border-border bg-surface text-slate-400 hover:bg-white/5 hover:text-foreground`}
          >
            <Search size={12} />
            {working === "discover" ? "Scanning…" : "Discover"}
          </button>

          {/* Test */}
          <button
            type="button"
            disabled={busy || !configured}
            onClick={onTest}
            className={`${buttonClass} border-border bg-surface text-slate-400 hover:bg-white/5 hover:text-foreground`}
          >
            <Activity size={12} />
            {working === "test" ? "Testing…" : "Test"}
          </button>

          {/* Save */}
          <button
            type="submit"
            disabled={busy}
            className={`${buttonClass} border-indigo-500/30 bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25`}
          >
            <Check size={12} />
            {working === "save" ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </Card>
  );
}
