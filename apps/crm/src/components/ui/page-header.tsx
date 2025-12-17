import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";
import { ChevronRight, Plus, type LucideIcon } from "lucide-react";

// =============================================================================
// PAGE HEADER
// Standard header for all list and detail pages
// Following design principles: consistent layout, clear hierarchy
// =============================================================================

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="space-y-1">
        <h1 className="text-title text-foreground">{title}</h1>
        {description && (
          <p className="text-body text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

// =============================================================================
// PAGE HEADER ACTION BUTTON
// Primary action button for page header (e.g., "New Booking")
// =============================================================================

interface PageHeaderActionProps {
  href?: string;
  onClick?: () => void;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function PageHeaderAction({
  href,
  onClick,
  icon: Icon = Plus,
  children,
  className,
}: PageHeaderActionProps) {
  const classes = cn(
    "inline-flex items-center gap-2 rounded-lg",
    "bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
    "hover:bg-primary/90 transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className
  );

  if (href) {
    return (
      <Link href={href as Route} className={classes}>
        <Icon className="h-4 w-4" />
        {children}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

// =============================================================================
// BREADCRUMBS
// Navigation breadcrumbs for detail pages
// =============================================================================

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      className={cn("flex items-center gap-1 text-sm", className)}
      aria-label="Breadcrumb"
    >
      {items.map((item, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
          {item.href ? (
            <Link
              href={item.href as Route}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </nav>
  );
}

// =============================================================================
// DETAIL PAGE HEADER
// Header for detail pages with back link
// =============================================================================

interface DetailPageHeaderProps {
  title: string;
  subtitle?: string;
  backHref: string;
  backLabel: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function DetailPageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  badge,
  children,
  className,
}: DetailPageHeaderProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <Link
        href={backHref as Route}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronRight className="h-4 w-4 rotate-180" />
        {backLabel}
      </Link>
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-title text-foreground">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="text-body text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {children && <div className="flex items-center gap-2">{children}</div>}
      </div>
    </div>
  );
}

// =============================================================================
// STATS ROW
// Row of stat cards typically shown below page header
// =============================================================================

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  iconColor = "text-primary",
  iconBgColor = "bg-primary/10",
}: StatCardProps) {
  return (
    <div className="bg-card rounded-lg border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-lg", iconBgColor)}>
          <Icon className={cn("h-5 w-5", iconColor)} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-semibold text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

interface StatsRowProps {
  children: React.ReactNode;
  className?: string;
}

export function StatsRow({ children, className }: StatsRowProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 md:grid-cols-4 gap-4",
        className
      )}
    >
      {children}
    </div>
  );
}
