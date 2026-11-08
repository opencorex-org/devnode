import {
  Check,
  Copy,
  ShieldCheck,
  Terminal as TerminalIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Card } from "../../../components/ui/Card";
import { api } from "../../../services/api";

export function TerminalPanel() {
  const [command, setCommand] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void api
      .connectionCommand()
      .then(setCommand)
      .catch(() => setCommand("Configure a server first"));
  }, []);

  async function copy() {
    if (!command || command === "Configure a server first") return;

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
      {/* Terminal Header */}
      <div className="flex h-8 items-center gap-1.5 border-b border-border bg-black/30 px-3">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />

        <div className="ml-2 flex items-center gap-1.5 text-[10px] text-slate-400">
          <TerminalIcon size={12} />
          <span>Secure Shell</span>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-3 p-3">
        {/* Title */}
        <div className="flex items-start gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
            <TerminalIcon size={13} />
          </div>

          <div className="min-w-0">
            <h2 className="text-xs font-semibold leading-4">
              Remote Terminal
            </h2>

            <p className="mt-0.5 text-[10px] leading-4 text-slate-400">
              Embedded terminal coming soon. Use the SSH command
              below in your local terminal.
            </p>
          </div>
        </div>

        {/* SSH Command */}
        <div className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-black/40 px-2.5 py-2">
          <code className="min-w-0 flex-1 break-all font-mono text-[10px] leading-4 text-emerald-400">
            <span className="mr-1.5 text-slate-600">$</span>
            {command || "Loading..."}
          </code>

          <button
            type="button"
            onClick={() => void copy()}
            disabled={!command || command === "Configure a server first"}
            title={copied ? "Copied" : "Copy SSH command"}
            aria-label={copied ? "Copied" : "Copy SSH command"}
            className="
              flex h-6 shrink-0 items-center gap-1
              rounded-md border border-border
              bg-white/5 px-2 text-[10px] text-slate-400
              transition-colors
              hover:bg-white/10 hover:text-white
              disabled:cursor-not-allowed disabled:opacity-40
            "
          >
            {copied ? <Check size={11} /> : <Copy size={11} />}
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>

        {/* Security Information */}
        <div className="flex items-center gap-1.5 text-[10px] leading-4 text-slate-500">
          <ShieldCheck
            size={12}
            className="shrink-0 text-emerald-400"
          />
          <span>
            Uses OpenSSH agent, identity and known-host verification.
          </span>
        </div>
      </div>
    </Card>
  );
}