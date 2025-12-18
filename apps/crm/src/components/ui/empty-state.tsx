"use client";

import { LucideIcon, Inbox, Calendar, Users, MapPin, UserCheck, Plus, Upload, Lightbulb } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

// Suggestion card for quick actions
interface SuggestionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  href?: string;
  onClick?: () => void;
}

export function SuggestionCard({
  icon: Icon,
  title,
  description,
  href,
  onClick,
}: SuggestionCardProps) {
  const content = (
    <>
      <div className="p-2 rounded-lg bg-primary/10 text-primary mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h4 className="text-sm font-medium text-foreground mb-1">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </>
  );

  const className = cn(
    "flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card",
    "hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer"
  );

  if (href) {
    return (
      <Link href={href as Route} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  suggestions?: SuggestionCardProps[];
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  suggestions,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Suggestion cards */}
      {suggestions && suggestions.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {suggestions.map((suggestion, index) => (
            <SuggestionCard key={index} {...suggestion} />
          ))}
        </div>
      )}

      {/* Main empty state */}
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Icon className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground max-w-sm mb-4">{description}</p>
        {action && (
          action.href ? (
            <Link
              href={action.href as Route}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </Link>
          ) : (
            <button
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Plus className="h-4 w-4" />
              {action.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoBookingsEmpty({
  orgSlug,
  onCreateBooking
}: {
  orgSlug: string;
  onCreateBooking?: () => void;
}) {
  return (
    <EmptyState
      icon={Calendar}
      title="No bookings yet"
      description="Create your first booking to get started with managing your tour operations."
      action={onCreateBooking ? {
        label: "Create Booking",
        onClick: onCreateBooking,
      } : {
        label: "Create Booking",
        href: `/org/${orgSlug}/bookings`,
      }}
    />
  );
}

export function NoCustomersEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      icon={Users}
      title="No customers yet"
      description="Add your first customer to start tracking bookings and building relationships."
      action={{
        label: "Add Customer",
        href: `/org/${orgSlug}/customers/new`,
      }}
    />
  );
}

export function NoToursEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      icon={MapPin}
      title="No tours created"
      description="Create your first tour to start building your tour catalog."
      action={{
        label: "Create Tour",
        href: `/org/${orgSlug}/tours/new`,
      }}
    />
  );
}

export function NoSchedulesEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No schedules available"
      description="Create schedules to make your tours bookable."
      action={{
        label: "Create Schedule",
        href: `/org/${orgSlug}/availability/new`,
      }}
    />
  );
}

export function NoGuidesEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      icon={UserCheck}
      title="No guides added"
      description="Add tour guides to assign them to your scheduled tours."
      action={{
        label: "Add Guide",
        href: `/org/${orgSlug}/guides/new`,
      }}
    />
  );
}

export function NoResultsEmpty({ searchTerm }: { searchTerm: string }) {
  return (
    <EmptyState
      icon={Inbox}
      title="No results found"
      description={`No items match "${searchTerm}". Try adjusting your search or filters.`}
    />
  );
}
