import { useState } from "react";
import { Check, Copy, Server, Terminal, X } from "lucide-react";
import type { CatalogItem, ServiceState } from "../../../types";
import { StatusBadge } from "../../../components/ui/Badge";
import { isRunning } from "../../../lib/utils";

interface ServiceGuideModalProps {
  item: CatalogItem | null;
  state?: ServiceState;
  open: boolean;
  onClose: () => void;
}

export function ServiceGuideModal({
  item,
  state,
  open,
  onClose,
}: ServiceGuideModalProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  if (!open || !item) return null;

  const installed = Boolean(state && state.State !== "not-installed");
  const running = Boolean(installed && state && isRunning(state.State));

  const copyText = async (text: string, index?: number) => {
    try {
      await navigator.clipboard.writeText(text);
      if (index !== undefined) {
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 1800);
      } else {
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 1800);
      }
    } catch {
      // Clipboard fallback if needed
    }
  };

  const executableCommands = item.steps
    .filter((s) => s.trim() && !s.trim().startsWith("#"))
    .join("\n");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-border bg-surface shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400">
              <Server size={20} strokeWidth={1.8} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-semibold text-white">
                  {item.label}
                </h2>
                <span className="rounded bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                  {item.method}
                </span>
                <StatusBadge
                  online={running}
                  label={installed && state ? state.State : "Not installed"}
                />
              </div>

              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                {item.description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close guide"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content / Steps */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <Terminal size={14} className="text-indigo-400" />
              <span>Setup & Configuration Guide</span>
            </div>

            {executableCommands && (
              <button
                type="button"
                onClick={() => copyText(executableCommands)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
              >
                {copiedAll ? (
                  <>
                    <Check size={13} className="text-emerald-400" />
                    <span className="text-emerald-400">All Copied</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} />
                    <span>Copy All</span>
                  </>
                )}
              </button>
            )}
          </div>

          {item.steps.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-slate-400">
              No specific guided steps configured for this service.
            </div>
          ) : (
            <div className="space-y-2">
              {item.steps.map((step, idx) => {
                const trimmed = step.trim();

                if (!trimmed) {
                  return <div key={idx} className="h-2" />;
                }

                if (trimmed.startsWith("#")) {
                  return (
                    <div
                      key={idx}
                      className="pt-2 text-xs font-medium text-indigo-300/90"
                    >
                      {trimmed.replace(/^#\s*/, "")}
                    </div>
                  );
                }

                const isCopied = copiedIndex === idx;

                return (
                  <div
                    key={idx}
                    className="group relative flex items-center justify-between gap-3 rounded-lg border border-border bg-slate-950/70 px-3 py-2 font-mono text-[11px] text-slate-200"
                  >
                    <span className="min-w-0 flex-1 break-all select-all font-mono">
                      {step}
                    </span>

                    <button
                      type="button"
                      onClick={() => copyText(step, idx)}
                      title="Copy command"
                      className="inline-flex shrink-0 items-center gap-1 rounded bg-white/5 px-2 py-1 text-[10px] font-sans text-slate-400 hover:bg-white/15 hover:text-white transition-colors"
                    >
                      {isCopied ? (
                        <>
                          <Check size={12} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-white/[0.02] p-4 text-xs text-slate-400">
          <span className="text-[11px]">
            Run these commands in DevNode Terminal or an active SSH session.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
