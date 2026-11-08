import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Card } from "../../../components/ui/Card";

export interface HelpStepItem {
  number: string;
  title: string;
  text: string;
  command?: string;
  hint?: string;
}

interface HelpStepProps extends HelpStepItem {}

interface HelpStepsGridProps {
  steps: HelpStepItem[];
  className?: string;
}

/* -------------------------------------------------------
   Individual Help Step
------------------------------------------------------- */

export function HelpStep({
  number,
  title,
  text,
  command,
  hint,
}: HelpStepProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  async function copy() {
    if (!command) return;

    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Card
      className="
        flex h-full min-w-0 flex-col
        border-border p-3
        transition-colors duration-150
        hover:border-indigo-500/30
      "
    >
      {/* Header */}
      <div className="flex min-w-0 items-center gap-2">
        <div
          className="
            flex h-6 w-6 shrink-0 items-center justify-center
            rounded-md bg-indigo-500/10
            text-[10px] font-bold text-indigo-400
          "
        >
          {number}
        </div>

        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-4">
          {title}
        </h3>
      </div>

      {/* Description */}
      <p className="mt-2 flex-1 text-[10px] leading-4 text-slate-400">
        {text}
      </p>

      {/* Command */}
      {command && (
        <div
          className="
            mt-2 flex min-w-0 items-start gap-1.5
            rounded-md border border-border
            bg-black/40 p-2
          "
        >
          <pre
            className="
              min-w-0 flex-1 overflow-x-auto
              whitespace-pre-wrap break-words
              font-mono text-[10px] leading-4
              text-emerald-400
            "
          >
            {command}
          </pre>

          <button
            type="button"
            onClick={() => void copy()}
            aria-label={`Copy ${title} commands`}
            title={copied ? "Copied" : "Copy commands"}
            className="
              flex h-6 w-6 shrink-0 items-center justify-center
              rounded-md text-slate-400
              transition-colors
              hover:bg-white/10 hover:text-white
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-indigo-500/50
            "
          >
            {copied ? (
              <Check size={12} className="text-emerald-400" />
            ) : (
              <Copy size={12} />
            )}
          </button>
        </div>
      )}

      {/* Hint */}
      {hint && (
        <p className="mt-2 text-[9px] leading-3.5 text-slate-500">
          {hint}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------
   Responsive Help Steps Grid
------------------------------------------------------- */

export function HelpStepsGrid({
  steps,
  className = "",
}: HelpStepsGridProps) {
  if (steps.length === 0) {
    return null;
  }

  return (
    <div
      className={`
        grid grid-cols-1
        items-stretch gap-2
        md:grid-cols-2
        2xl:grid-cols-3
        ${className}
      `}
    >
      {steps.map((step, index) => (
        <HelpStep
          key={`${step.number}-${index}`}
          number={step.number}
          title={step.title}
          text={step.text}
          command={step.command}
          hint={step.hint}
        />
      ))}
    </div>
  );
}