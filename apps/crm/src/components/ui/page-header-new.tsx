"use client";

import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  /** Page title - required */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Inline stats to show next to title */
  stats?: React.ReactNode;
  /** Action buttons on the right */
  actions?: React.ReactNode;
  /** Breadcrumb navigation */
  breadcrumbs?: BreadcrumbItem[];
  /** Additional className */
  className?: string;
}

/**
 * Consistent page header component
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Bookings"
 *   stats={<>5 total · 3 pending · $735 revenue</>}
 *   actions={<Button>Quick Book</Button>}
 * />
 * ```
 */
export function PageHeader({
  title,
  description,
  stats,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("space-y-2", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <span key={index} className="flex items-center gap-1">
              {index > 0 && <ChevronRight className="h-3.5 w-3.5" />}
              {crumb.href ? (
                <Link
                  href={crumb.href as Route}
                  className="hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </nav>
      )}

      {/* Title Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6 min-w-0">
          {/* Title + Description */}
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
              {title}
            </h1>
            {description && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {description}
              </p>
            )}
          </div>

          {/* Inline Stats */}
          {stats && (
            <div className="hidden sm:flex items-center text-xs text-muted-foreground font-mono tabular-nums">
              {stats}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}

interface StatItemProps {
  value: string | number;
  label: string;
  variant?: "default" | "success" | "warning" | "danger";
}

/** Helper component for inline stats */
export function StatItem({ value, label, variant = "default" }: StatItemProps) {
  const valueColors = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning",
    danger: "text-destructive",
  };

  return (
    <span>
      <span className={cn("font-medium font-mono tabular-nums", valueColors[variant])}>
        {value}
      </span>
      {" "}{label}
    </span>
  );
}

/** Separator for inline stats */
export function StatSeparator() {
  return <span className="text-muted-foreground mx-3">·</span>;
}
