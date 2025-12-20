'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { cn } from '@/lib/utils';
import {
  Clock,
  Users,
  DollarSign,
  ChevronRight,
  Calendar,
  MapPin,
  MoreHorizontal,
  Edit,
  Copy,
  Trash2,
  Eye,
  EyeOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TourMobileCardProps {
  tour: {
    id: string;
    name: string;
    status: string;
    category?: string | null;
    basePrice: string;
    durationMinutes: number;
    maxParticipants: number;
    coverImageUrl?: string | null;
    shortDescription?: string | null;
    meetingPoint?: string | null;
    _count?: {
      schedules?: number;
      bookings?: number;
    };
  };
  orgSlug: string;
  onEdit?: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onDelete?: (id: string) => void;
  onToggleStatus?: (id: string, status: string) => void;
  isSelected?: boolean;
  onSelect?: (id: string) => void;
}

/**
 * Mobile-optimized tour card for list views
 * - Touch-friendly tap targets
 * - Condensed info display
 * - Quick actions menu
 * - Status indicator
 */
export function TourMobileCard({
  tour,
  orgSlug,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleStatus,
  isSelected,
  onSelect,
}: TourMobileCardProps) {
  const price = parseFloat(tour.basePrice);
  const isActive = tour.status === 'active';
  const scheduleCount = tour._count?.schedules ?? 0;
  const bookingCount = tour._count?.bookings ?? 0;

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div
      className={cn(
        'mobile-card space-y-3',
        isSelected && 'ring-2 ring-primary bg-primary/5',
        !isActive && 'opacity-70'
      )}
    >
      {/* Top row: Image/Icon + Title + Actions */}
      <div className="flex items-start gap-3">
        {/* Tour image or placeholder */}
        <div className="flex-shrink-0">
          {tour.coverImageUrl ? (
            <img
              src={tour.coverImageUrl}
              alt={tour.name}
              className="w-14 h-14 rounded-lg object-cover"
            />
          ) : (
            <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
          )}
        </div>

        {/* Title and category */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/org/${orgSlug}/tours/${tour.id}` as Route}
                className="block"
              >
                <h3 className="text-sm font-semibold text-foreground truncate hover:text-primary transition-colors">
                  {tour.name}
                </h3>
              </Link>
              {tour.category && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {tour.category}
                </p>
              )}
            </div>

            {/* Status badge */}
            <span
              className={cn(
                'flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                isActive
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {isActive ? 'Active' : 'Draft'}
            </span>
          </div>

          {/* Short description */}
          {tour.shortDescription && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {tour.shortDescription}
            </p>
          )}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {formatDuration(tour.durationMinutes)}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3.5 w-3.5" />
          {tour.maxParticipants} max
        </span>
        <span className="flex items-center gap-1 font-semibold text-foreground">
          <DollarSign className="h-3.5 w-3.5" />
          {formatPrice(price)}
        </span>
      </div>

      {/* Bottom row: Schedule info + Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" />
            {scheduleCount} schedule{scheduleCount !== 1 && 's'}
          </span>
          {bookingCount > 0 && (
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {bookingCount} booking{bookingCount !== 1 && 's'}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
                aria-label="Tour actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(tour.id)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit tour
                </DropdownMenuItem>
              )}
              {onToggleStatus && (
                <DropdownMenuItem onClick={() => onToggleStatus(tour.id, tour.status)}>
                  {isActive ? (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      Unpublish
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Publish
                    </>
                  )}
                </DropdownMenuItem>
              )}
              {onDuplicate && (
                <DropdownMenuItem onClick={() => onDuplicate(tour.id)}>
                  <Copy className="h-4 w-4 mr-2" />
                  Duplicate
                </DropdownMenuItem>
              )}
              {onDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(tour.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href={`/org/${orgSlug}/tours/${tour.id}` as Route}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors touch-target"
            aria-label="View tour details"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for tour mobile cards
 */
export function TourMobileCardSkeleton() {
  return (
    <div className="mobile-card space-y-3 animate-pulse">
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className="w-14 h-14 skeleton rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1.5">
              <div className="h-4 w-32 skeleton rounded" />
              <div className="h-3 w-20 skeleton rounded" />
            </div>
            <div className="h-5 w-14 skeleton rounded-full" />
          </div>
          <div className="h-3 w-full skeleton rounded" />
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4">
        <div className="h-4 w-14 skeleton rounded" />
        <div className="h-4 w-16 skeleton rounded" />
        <div className="h-4 w-12 skeleton rounded" />
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <div className="h-4 w-24 skeleton rounded" />
        <div className="h-8 w-20 skeleton rounded" />
      </div>
    </div>
  );
}

/**
 * Compact tour card for embedding in other views
 * Used in bookings, schedules, etc.
 */
interface TourCompactCardProps {
  tour: {
    id: string;
    name: string;
    category?: string | null;
    durationMinutes: number;
    coverImageUrl?: string | null;
  };
  orgSlug: string;
  onClick?: () => void;
  selected?: boolean;
}

export function TourCompactCard({
  tour,
  orgSlug,
  onClick,
  selected,
}: TourCompactCardProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const content = (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg transition-colors',
        'border border-border bg-card',
        selected && 'ring-2 ring-primary bg-primary/5',
        onClick && 'cursor-pointer hover:bg-muted active:scale-[0.98]'
      )}
      onClick={onClick}
    >
      {tour.coverImageUrl ? (
        <img
          src={tour.coverImageUrl}
          alt={tour.name}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">
          {tour.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {tour.category && <span>{tour.category}</span>}
          <span className="flex items-center gap-0.5">
            <Clock className="h-3 w-3" />
            {formatDuration(tour.durationMinutes)}
          </span>
        </div>
      </div>
      {!onClick && (
        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      )}
    </div>
  );

  if (onClick) {
    return content;
  }

  return (
    <Link href={`/org/${orgSlug}/tours/${tour.id}` as Route}>
      {content}
    </Link>
  );
}
