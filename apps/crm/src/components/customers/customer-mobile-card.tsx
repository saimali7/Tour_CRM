'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';
import { Mail, Phone, Calendar, DollarSign, ChevronRight } from 'lucide-react';

interface CustomerMobileCardProps {
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    totalBookings: number;
    totalSpent: string;
    lastBookingAt: Date | null;
  };
  orgSlug: string;
}

export function CustomerMobileCard({ customer, orgSlug }: CustomerMobileCardProps) {
  const totalSpent = parseFloat(customer.totalSpent || '0');
  const isHighValue = totalSpent >= 1000;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(date));
  };

  return (
    <Link
      href={`/org/${orgSlug}/customers/${customer.id}` as Route}
      className="block mobile-card space-y-3 active:bg-muted transition-colors"
    >
      {/* Top row: Name */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {customer.firstName} {customer.lastName}
          </p>
          {customer.email && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
              <Mail className="h-3 w-3 flex-shrink-0" />
              {customer.email}
            </p>
          )}
          {customer.phone && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
              <Phone className="h-3 w-3 flex-shrink-0" />
              {customer.phone}
            </p>
          )}
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          {/* Bookings */}
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span className="font-medium text-foreground">{customer.totalBookings}</span>
            <span className="text-xs">bookings</span>
          </span>

          {/* Total Spent */}
          <span className="flex items-center gap-1 text-sm">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span
              className={cn(
                'font-semibold tabular-nums',
                isHighValue ? 'text-success dark:text-success' : 'text-foreground'
              )}
            >
              {totalSpent.toFixed(0)}
            </span>
          </span>
        </div>

        {/* Last booking */}
        {customer.lastBookingAt && (
          <span className="text-xs text-muted-foreground">
            Last: {formatDate(customer.lastBookingAt)}
          </span>
        )}
      </div>
    </Link>
  );
}

/**
 * Skeleton loader for customer mobile cards
 */
export function CustomerMobileCardSkeleton() {
  return (
    <div className="mobile-card space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-32 skeleton rounded" />
          <div className="h-3 w-40 skeleton rounded" />
          <div className="h-3 w-28 skeleton rounded" />
        </div>
        <div className="h-5 w-5 skeleton rounded" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="h-4 w-20 skeleton rounded" />
          <div className="h-4 w-16 skeleton rounded" />
        </div>
        <div className="h-3 w-24 skeleton rounded" />
      </div>
    </div>
  );
}
