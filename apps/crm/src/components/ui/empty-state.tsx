import { LucideIcon, Inbox, Calendar, Users, MapPin, UserCheck } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      <div className="rounded-full bg-gray-100 p-4 mb-4">
        <Icon className="h-8 w-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500 max-w-sm mb-4">{description}</p>
      {action && (
        action.href ? (
          <Link
            href={action.href as Route}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  );
}

// Pre-configured empty states for common scenarios
export function NoBookingsEmpty({ orgSlug }: { orgSlug: string }) {
  return (
    <EmptyState
      icon={Calendar}
      title="No bookings yet"
      description="Create your first booking to get started with managing your tour operations."
      action={{
        label: "Create Booking",
        href: `/org/${orgSlug}/bookings/new`,
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
        href: `/org/${orgSlug}/schedules/new`,
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
