import type { ElementType, ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  narrow?: boolean;
  as?: ElementType;
}

export function PageShell({
  children,
  className,
  contentClassName,
  narrow = false,
  as: Component = "div",
}: PageShellProps) {
  return (
    <Component
      className={`mx-auto w-full px-[var(--page-gutter)] py-10 ${className ?? ""}`}
      style={{ maxWidth: "var(--page-max-width, 1400px)" }}
    >
      <div className={`${narrow ? "mx-auto" : ""}${contentClassName ?? ""}`} style={narrow ? { maxWidth: "var(--content-width, 720px)" } : undefined}>
        {children}
      </div>
    </Component>
  );
}
