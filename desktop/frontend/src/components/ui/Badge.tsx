import type { ReactNode } from "react";

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

interface StatusBadgeProps {
  online: boolean;
  label?: string;
  className?: string;
}

export function Badge({ children, className = "" }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        whitespace-nowrap rounded-full
        border px-1.5 py-0.5
        text-[10px] font-medium leading-3
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export function StatusBadge({
  online,
  label,
  className = "",
}: StatusBadgeProps) {
  return (
    <span
      role="status"
      className={`
        inline-flex items-center gap-1
        whitespace-nowrap rounded-full
        border px-1.5 py-0.5
        text-[9px] font-semibold leading-3
        ${
          online
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
            : "border-red-500/20 bg-red-500/10 text-red-400"
        }
        ${className}
      `}
    >
      <span
        className={`
          h-1.5 w-1.5 shrink-0 rounded-full
          ${online ? "bg-emerald-400" : "bg-red-400"}
        `}
      />

      {label ?? (online ? "ONLINE" : "OFFLINE")}
    </span>
  );
}