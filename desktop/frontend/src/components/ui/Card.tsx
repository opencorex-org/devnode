import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
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
