import { useEffect, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastProps = {
  open?: boolean;
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  onClose: () => void;
};

export function Toast({
  open = true,
  type = "info",
  title,
  message,
  duration = 4500,
  onClose,
}: ToastProps) {
  const [hovered, setHovered] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!open || !message) {
      setProgress(100);
      return;
    }

    startTimeRef.current = Date.now();

    const interval = 40;
    const updateProgress = () => {
      if (hovered) return;

      const elapsed = Date.now() - startTimeRef.current;
      const pct = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(pct);

      if (elapsed >= duration) {
        onClose();
      }
    };

    const id = window.setInterval(updateProgress, interval);

    return () => {
      window.clearInterval(id);
    };
  }, [open, message, duration, hovered, onClose]);

  if (!open || !message) return null;

  const config = {
    success: {
      icon: CheckCircle2,
      badgeBg: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
      border: "border-emerald-500/30 hover:border-emerald-500/50",
      progressBar: "bg-gradient-to-r from-emerald-500 to-teal-400",
      defaultTitle: "Success",
    },
    error: {
      icon: AlertCircle,
      badgeBg: "bg-red-500/15 text-red-400 border-red-500/25",
      border: "border-red-500/30 hover:border-red-500/50",
      progressBar: "bg-gradient-to-r from-red-500 to-rose-400",
      defaultTitle: "Error",
    },
    warning: {
      icon: AlertTriangle,
      badgeBg: "bg-amber-500/15 text-amber-400 border-amber-500/25",
      border: "border-amber-500/30 hover:border-amber-500/50",
      progressBar: "bg-gradient-to-r from-amber-500 to-yellow-400",
      defaultTitle: "Warning",
    },
    info: {
      icon: Info,
      badgeBg: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
      border: "border-cyan-500/30 hover:border-cyan-500/50",
      progressBar: "bg-gradient-to-r from-cyan-500 to-indigo-500",
      defaultTitle: "Notice",
    },
  }[type];

  const Icon = config.icon;
  const displayTitle = title ?? config.defaultTitle;

  return (
    <div
      role="alert"
      aria-live="polite"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        startTimeRef.current = Date.now() - (1 - progress / 100) * duration;
      }}
      className={`
        pointer-events-auto
        relative flex w-full max-w-sm sm:max-w-md items-start gap-3.5
        overflow-hidden rounded-2xl border ${config.border}
        bg-surface/95 p-4 text-slate-100
        shadow-2xl shadow-black/70 backdrop-blur-2xl
        transition-all duration-300
        animate-toast-in
      `}
    >
      <div
        className={`
          mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center
          rounded-xl border ${config.badgeBg}
        `}
      >
        <Icon size={19} />
      </div>

      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {displayTitle}
        </p>
        <p className="mt-1 break-words text-sm font-medium leading-relaxed text-slate-200">
          {message}
        </p>
      </div>

      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={onClose}
        className="
          -mr-1 -mt-1 rounded-lg p-1.5
          text-slate-400 transition-colors
          hover:bg-white/10 hover:text-white
        "
      >
        <X size={16} />
      </button>

      {/* Progress timer indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5">
        <div
          className={`h-full transition-all duration-75 ease-linear ${config.progressBar}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
