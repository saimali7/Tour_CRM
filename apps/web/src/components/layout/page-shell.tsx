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
    <Component className={`container px-4 py-8 ${className ?? ""}`}>
      <div className={`${narrow ? "mx-auto max-w-3xl " : ""}${contentClassName ?? ""}`}>
        {children}
      </div>
    </Component>
  );
}
