"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Tag,
  Edit,
  Eye,
  MessageSquare,
  AlertCircle,
  ExternalLink,
  Globe,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  ContextPanelSection,
  ContextPanelRow,
  ContextPanelSkeleton,
  ContextPanelEmpty,
} from "@/components/layout/context-panel";
import { cn } from "@/lib/utils";

interface CustomerQuickViewProps {
  customerId: string;
}

export function CustomerQuickView({ customerId }: CustomerQuickViewProps) {
  const params = useParams();
  const slug = params.slug as string;

  const { data: customer, isLoading, error } = trpc.customer.getByIdWithStats.useQuery(
    { id: customerId },
    { enabled: !!customerId }
  );

  if (isLoading) {
    return <ContextPanelSkeleton />;
  }

  if (error || !customer) {
    return (
      <ContextPanelEmpty
        icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
        title="Customer not found"
        description="This customer may have been deleted"
      />
    );
  }

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  // Calculate lifetime value if stats are available
  const lifetimeValue = parseFloat(customer.totalSpent || "0");
  const bookingCount = customer.totalBookings || 0;
  const lastBookingDate = customer.lastBookingAt;

  return (
    <>
      {/* Customer Header */}
      <ContextPanelSection>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-semibold text-primary">
              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">
              {customer.firstName} {customer.lastName}
            </h3>
            {customer.tags && customer.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {customer.tags.slice(0, 3).map((tag: string) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground"
                  >
                    {tag}
                  </span>
                ))}
                {customer.tags.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{customer.tags.length - 3} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </ContextPanelSection>

      {/* Contact Information */}
      <ContextPanelSection title="Contact">
        <div className="space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a
                href={`mailto:${customer.email}`}
                className="text-foreground hover:text-primary truncate"
              >
                {customer.email}
              </a>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <a
                href={`tel:${customer.phone}`}
                className="text-foreground hover:text-primary"
              >
                {customer.phone}
              </a>
            </div>
          )}
          {customer.country && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Globe className="h-3.5 w-3.5 shrink-0" />
              <span>
                {[customer.city, customer.state, customer.country]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          )}
          {customer.language && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5 shrink-0" />
              <span>Prefers {customer.language.toUpperCase()}</span>
            </div>
          )}
        </div>
      </ContextPanelSection>

      {/* Stats Section */}
      <ContextPanelSection title="Customer Stats">
        <div className="grid grid-cols-2 gap-3">
          {/* Lifetime Value */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              Lifetime Value
            </div>
            <p className={cn(
              "text-lg font-semibold tabular-nums",
              lifetimeValue > 0 ? "text-success dark:text-success" : "text-foreground"
            )}>
              ${lifetimeValue.toLocaleString()}
            </p>
          </div>

          {/* Booking Count */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Calendar className="h-3 w-3" />
              Bookings
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {bookingCount}
            </p>
          </div>
        </div>

        {lastBookingDate && (
          <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span>Last booking: {formatDate(lastBookingDate)}</span>
          </div>
        )}
      </ContextPanelSection>

      {/* Notes */}
      {customer.notes && (
        <ContextPanelSection title="Notes">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-4">
            {customer.notes}
          </p>
        </ContextPanelSection>
      )}

      {/* Customer Source */}
      {customer.source && (
        <ContextPanelSection title="Source">
          <div className="flex items-center gap-2 text-sm">
            <span className="capitalize text-foreground">{customer.source}</span>
            {customer.sourceDetails && (
              <span className="text-muted-foreground">- {customer.sourceDetails}</span>
            )}
          </div>
        </ContextPanelSection>
      )}

      {/* Created Date */}
      <ContextPanelSection>
        <div className="text-xs text-muted-foreground">
          Customer since {formatDate(customer.createdAt)}
        </div>
      </ContextPanelSection>
    </>
  );
}

// Footer actions for the customer quick view
export function CustomerQuickViewActions({ customerId }: { customerId: string }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="flex-1" asChild>
        <Link href={`/org/${slug}/customers/${customerId}` as Route}>
          <Eye className="h-4 w-4 mr-1.5" />
          View
        </Link>
      </Button>
      <Button variant="default" size="sm" className="flex-1" asChild>
        <Link href={`/org/${slug}/customers/${customerId}/edit` as Route}>
          <Edit className="h-4 w-4 mr-1.5" />
          Edit
        </Link>
      </Button>
    </div>
  );
}
