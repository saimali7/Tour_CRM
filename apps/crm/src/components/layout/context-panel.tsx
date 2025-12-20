"use client";

import { useEffect, useCallback } from "react";
import { X, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// =============================================================================
// SLIDE-OUT CONTEXT PANEL
// =============================================================================

interface SlideOutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function SlideOutPanel({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  className,
}: SlideOutPanelProps) {
  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    },
    [isOpen, onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <>
      {/* Backdrop for mobile */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 z-30 xl:hidden transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        className={cn(
          "fixed right-0 top-0 h-full w-[320px] xl:w-[280px] bg-card border-l border-border",
          "transform transition-transform duration-200 ease-out",
          "flex flex-col z-40 shadow-lg xl:shadow-none",
          isOpen ? "translate-x-0" : "translate-x-full",
          className
        )}
        role="complementary"
        aria-label="Context panel"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-card shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-7 w-7 shrink-0"
              aria-label="Close panel"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">{title}</h2>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 shrink-0 hidden xl:flex"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer (for quick actions) */}
        {footer && (
          <footer className="shrink-0 border-t border-border bg-card p-3">
            {footer}
          </footer>
        )}
      </aside>
    </>
  );
}

// =============================================================================
// STATIC CONTEXT PANEL (for persistent right panel)
// =============================================================================

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

// =============================================================================
// CONTEXT PANEL SECTION
// =============================================================================

interface ContextPanelSectionProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function ContextPanelSection({
  title,
  children,
  className,
  action,
}: ContextPanelSectionProps) {
  return (
    <div className={cn("p-4 border-b border-border last:border-b-0", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && (
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {title}
            </h3>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// =============================================================================
// CONTEXT PANEL DATA ROW
// =============================================================================

interface ContextPanelRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  labelClassName?: string;
  valueClassName?: string;
}

export function ContextPanelRow({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
}: ContextPanelRowProps) {
  return (
    <div className={cn("flex items-start justify-between gap-2 py-1.5", className)}>
      <span className={cn("text-xs text-muted-foreground shrink-0", labelClassName)}>
        {label}
      </span>
      <span className={cn("text-sm text-foreground text-right", valueClassName)}>
        {value}
      </span>
    </div>
  );
}

// =============================================================================
// CONTEXT PANEL SKELETON
// =============================================================================

export function ContextPanelSkeleton() {
  return (
    <div className="animate-pulse">
      <ContextPanelSection>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-2/3" />
        </div>
      </ContextPanelSection>
      <ContextPanelSection>
        <div className="space-y-3">
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-4/5" />
          <div className="h-4 bg-muted rounded w-3/5" />
        </div>
      </ContextPanelSection>
    </div>
  );
}

// =============================================================================
// CONTEXT PANEL EMPTY STATE
// =============================================================================

interface ContextPanelEmptyProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

export function ContextPanelEmpty({ icon, title, description }: ContextPanelEmptyProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center">
      {icon && (
        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
