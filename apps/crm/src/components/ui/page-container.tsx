"use client";

import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  /** Max width variant - 'default' for most pages, 'wide' for dashboards/calendars, 'full' for no constraint */
  maxWidth?: "default" | "wide" | "full";
}

const maxWidthClasses = {
  default: "max-w-6xl", // 1152px - ideal for data tables and forms
  wide: "max-w-7xl",    // 1280px - for dashboards and calendars
  full: "",              // No max-width constraint
};

/**
 * Page container with consistent max-width for readability.
 *
 * Usage:
 * ```tsx
 * <PageContainer maxWidth="default">
 *   <PageHeader title="Bookings" />
 *   <Table>...</Table>
 * </PageContainer>
 * ```
 */
export function PageContainer({
  children,
  className,
  maxWidth = "default",
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "w-full",
        maxWidthClasses[maxWidth],
        className
      )}
    >
      {children}
    </div>
  );
}

interface PageSectionProps {
  children: React.ReactNode;
  className?: string;
}

/** A section within a page with consistent vertical spacing */
export function PageSection({ children, className }: PageSectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {children}
    </section>
  );
}
