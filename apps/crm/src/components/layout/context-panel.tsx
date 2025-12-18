"use client";

import { cn } from "@/lib/utils";

interface ContextPanelProps {
  children: React.ReactNode;
  className?: string;
}

export function ContextPanel({ children, className }: ContextPanelProps) {
  return (
    <aside
      className={cn(
        "hidden xl:flex w-[280px] flex-shrink-0 flex-col border-l border-border bg-card overflow-y-auto",
        className
      )}
    >
      {children}
    </aside>
  );
}

interface ContextPanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ContextPanelSection({
  title,
  children,
  className,
}: ContextPanelSectionProps) {
  return (
    <div className={cn("p-4 border-b border-border last:border-b-0", className)}>
      {title && (
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
