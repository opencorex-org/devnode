import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`
        rounded-2xl
        border border-border
        bg-surface
        shadow-lg shadow-black/10
        ${className}
      `}
    >
      {children}
    </div>
  );
}
