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
    <header className={cn("space-y-1", className)}>
      {/* Breadcrumbs */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
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
            <h1 className="text-lg font-semibold text-foreground truncate">
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
            <div className="hidden sm:flex items-center text-sm text-muted-foreground">
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
    success: "text-emerald-600",
    warning: "text-yellow-600",
    danger: "text-red-600",
  };

  return (
    <span>
      <span className={cn("font-medium", valueColors[variant])}>{value}</span>
      {" "}{label}
    </span>
  );
}

/** Separator for inline stats */
export function StatSeparator() {
  return <span className="text-border mx-3">·</span>;
}
