import type { HTMLAttributes, ReactNode } from "react";

interface CardSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

export function CardSurface({
  children,
  className,
  padded = true,
  ...props
}: CardSurfaceProps) {
  return (
    <div
      className={`rounded-xl border border-border bg-card ${padded ? "p-6" : ""} ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
