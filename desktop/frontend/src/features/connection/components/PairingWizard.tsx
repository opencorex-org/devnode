import {
  ArrowRight,
  Loader2,
  Monitor,
  Search,
  ShieldCheck,
} from "lucide-react";
import type { PairProgress, PairingServer } from "../../../types";
import { useEffect, useState } from "react";

import { Card } from "../../../components/ui/Card";
import { api } from "../../../services/api";
import { messageOf } from "../../../lib/utils";

interface PairingWizardProps {
  changed: () => Promise<void>;
  notify: (value: string) => void;
  fail: (value: string) => void;
}

export function PairingWizard({
  changed,
  notify,
  fail,
}: PairingWizardProps) {
  const [servers, setServers] = useState<PairingServer[]>([]);
  const [progress, setProgress] = useState<PairProgress | null>(null);
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
  }, [progress?.requestId, progress?.status, changed, notify, fail]);

  async function scan() {
    setWorking(true);
    setProgress(null);
    setServers([]);
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

  const pending = progress?.status === "pending";

  return (
    <Card className="overflow-hidden border-indigo-500/20 bg-linear-to-br from-indigo-950/40 to-surface p-3">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Security Badge */}
          <div className="mb-1.5 inline-flex items-center gap-1 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-cyan-400">
            <ShieldCheck size={10} />
            SECURE LOCAL PAIRING
          </div>

          <h2 className="text-xs font-semibold leading-4">
            Connect an Ubuntu computer
          </h2>

          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            No IP or password required. Run{" "}
            <code className="font-mono text-cyan-400">
              devnode-agent pair
            </code>{" "}
            on Ubuntu, then scan.
          </p>
        </div>

        {/* Scan Button */}
        <button
          type="button"
          onClick={() => void scan()}
          disabled={working || pending}
          className="
            inline-flex h-7 shrink-0 items-center gap-1.5
            rounded-md border border-indigo-500/30
            bg-indigo-500/15 px-2.5
            text-[10px] font-medium text-indigo-400
            transition-colors
            hover:bg-indigo-500/25
            disabled:cursor-not-allowed
            disabled:opacity-40
          "
        >
          {working ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Search size={12} />
          )}

          {working ? "Scanning…" : "Scan LAN"}
        </button>
      </div>

      {/* Discovered Servers */}
      {servers.length > 0 && !progress && (
        <div className="mt-3 space-y-1.5">
          {servers.map((server) => (
            <button
              key={server.sessionId}
              type="button"
              onClick={() => void pair(server)}
              disabled={working}
              className="
                flex w-full min-w-0 items-center gap-2
                rounded-md border border-border
                bg-background/60 px-2.5 py-2
                text-left transition-colors
                hover:border-indigo-500/40
                hover:bg-indigo-500/5
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {/* Server Icon */}
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-400">
                <Monitor size={13} />
              </div>

              {/* Server Information */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-semibold leading-4">
                  {server.name}
                </p>

                <p
                  className="truncate text-[9px] leading-3 text-slate-500"
                  title={`${server.user}@${server.address} · ${server.hostFingerprint}`}
                >
                  {server.user}@{server.address} ·{" "}
                  {server.hostFingerprint}
                </p>
              </div>

              {/* Pair Action */}
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium text-indigo-400">
                Pair
                <ArrowRight size={11} />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Pairing Progress */}
      {progress && (
        <div className="mt-3 grid gap-3 rounded-md border border-border bg-background/60 p-3 sm:grid-cols-[110px_1fr]">
          {/* Verification Code */}
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
              Match Code
            </p>

            <p className="mt-1 font-mono text-xl font-bold tracking-widest text-cyan-400">
              {progress.code}
            </p>
          </div>

          {/* Pairing Details */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[11px] font-semibold">
                {progress.serverName}
              </h3>

              {pending && (
                <Loader2
                  size={11}
                  className="shrink-0 animate-spin text-indigo-400"
                />
              )}
            </div>

            <p className="mt-1 text-[10px] leading-4 text-slate-400">
              {pending
                ? "Waiting for Ubuntu approval…"
                : progress.message}
            </p>

            <code
              className="mt-1 block truncate font-mono text-[9px] text-slate-500"
              title={progress.hostFingerprint}
            >
              {progress.hostFingerprint}
            </code>
          </div>
        </div>
      )}
    </Card>
  );
}