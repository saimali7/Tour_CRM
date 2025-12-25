'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';
import { Users, ChevronRight, CheckCircle, X, Eye, Edit } from 'lucide-react';
import { BookingStatusBadge, PaymentStatusBadge } from '@/components/ui/status-badge';

interface BookingMobileCardProps {
  booking: {
    id: string;
    referenceNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    totalParticipants: number;
    customer?: {
      firstName: string;
      lastName: string;
      email?: string | null;
    } | null;
    tour?: {
      name: string;
    } | null;
    schedule?: {
      startsAt: Date;
    } | null;
  };
  orgSlug: string;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

export function BookingMobileCard({
  booking,
  orgSlug,
  onConfirm,
  onCancel,
  isSelected,
  onSelect,
}: BookingMobileCardProps) {
  const total = parseFloat(booking.total);
  const isHighValue = total >= 500;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(date));
  };

  const customerName = booking.customer
    ? `${booking.customer.firstName} ${booking.customer.lastName}`
    : 'Unknown Customer';

  return (
    <div
      className={cn(
        'mobile-card space-y-3',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        booking.status === 'confirmed' && 'border-l-4 border-l-emerald-500',
        booking.status === 'pending' && 'border-l-4 border-l-amber-500',
        booking.status === 'cancelled' && 'border-l-4 border-l-red-400 opacity-70'
      )}
    >
      {/* Top row: Customer + Status */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">
            {customerName}
          </p>
          <p className="text-xs font-mono text-muted-foreground">
            {booking.referenceNumber}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <BookingStatusBadge
            status={booking.status as 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'}
          />
          <PaymentStatusBadge
            status={booking.paymentStatus as 'pending' | 'partial' | 'paid' | 'refunded' | 'failed'}
          />
        </div>
      </div>

      {/* Tour and schedule info */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground truncate">
          {booking.tour?.name || 'Unknown Tour'}
        </p>
        {booking.schedule && (
          <p className="text-xs text-muted-foreground">
            {formatDate(booking.schedule.startsAt)} at {formatTime(booking.schedule.startsAt)}
          </p>
        )}
      </div>

      {/* Bottom row: Guests, Total, Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          {/* Guests */}
          <span className="flex items-center gap-1 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            {booking.totalParticipants}
          </span>

          {/* Total */}
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              isHighValue ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'
            )}
          >
            ${total.toFixed(0)}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          {booking.status === 'pending' && onConfirm && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onConfirm(booking.id);
              }}
              className="p-2 rounded-md text-emerald-500 hover:bg-accent transition-colors touch-target"
              aria-label="Confirm booking"
            >
              <CheckCircle className="h-5 w-5" />
            </button>
          )}
          {(booking.status === 'pending' || booking.status === 'confirmed') && onCancel && (
            <button
              onClick={(e) => {
                e.preventDefault();
                onCancel(booking.id);
              }}
              className="p-2 rounded-md text-destructive hover:bg-destructive/10 transition-colors touch-target"
              aria-label="Cancel booking"
            >
              <X className="h-5 w-5" />
            </button>
          )}
          <Link
            href={`/org/${orgSlug}/bookings/${booking.id}` as Route}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
            aria-label="View booking details"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for booking mobile cards
 */
export function BookingMobileCardSkeleton() {
  return (
    <div className="mobile-card space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-32 skeleton rounded" />
          <div className="h-3 w-24 skeleton rounded" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="h-5 w-20 skeleton rounded-full" />
          <div className="h-5 w-16 skeleton rounded-full" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-4 w-40 skeleton rounded" />
        <div className="h-3 w-28 skeleton rounded" />
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4">
          <div className="h-4 w-12 skeleton rounded" />
          <div className="h-4 w-16 skeleton rounded" />
        </div>
        <div className="h-8 w-20 skeleton rounded" />
      </div>
    </div>
  );
}
