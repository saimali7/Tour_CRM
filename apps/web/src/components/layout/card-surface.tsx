import type { HTMLAttributes, ReactNode } from "react";

interface CardSurfaceProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  hover?: boolean;
}

export function CardSurface({
  children,
  className,
  padded = true,
  hover = false,
  ...props
}: CardSurfaceProps) {
  return (
    <div
      className={`rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)] ${
        hover ? "transition-shadow duration-[var(--duration-normal)] hover:shadow-[var(--shadow-lg)]" : ""
      } ${padded ? "p-6" : ""} ${className ?? ""}`}
      {...props}
    >
      {children}
    </div>
  );
}
