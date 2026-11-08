import { Activity, Check, Search } from "lucide-react";

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
          title="Manual SSH connection"
          subtitle={configPath}
        />
      </div>

      <form onSubmit={onSave} className="space-y-2.5">
        {/* Server Host */}
        <div className="[&_input]:h-8 [&_input]:rounded-md [&_input]:px-2.5 [&_input]:text-[11px] [&_label]:text-[10px]">
          <Input
            label="Server host"
            value={form.host}
            placeholder="auto, ubuntu.local, or 192.168.1.20"
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
            disabled={busy}
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