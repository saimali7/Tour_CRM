'use client';

import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface ResponsiveListProps<T> {
  /** The data items to display */
  items: T[];
  /** Unique key extractor for each item */
  keyExtractor: (item: T) => string;
  /** Render function for mobile card view */
  renderCard: (item: T, index: number) => React.ReactNode;
  /** Render function for desktop table/row view */
  renderRow: (item: T, index: number) => React.ReactNode;
  /** Optional table header for desktop view */
  tableHeader?: React.ReactNode;
  /** Empty state component */
  emptyState?: React.ReactNode;
  /** Loading state - shows skeletons */
  isLoading?: boolean;
  /** Number of skeleton items to show when loading */
  skeletonCount?: number;
  /** Render function for mobile skeleton */
  renderCardSkeleton?: () => React.ReactNode;
  /** Render function for desktop skeleton row */
  renderRowSkeleton?: () => React.ReactNode;
  /** Additional class name for container */
  className?: string;
  /** Class name for the card list container (mobile) */
  cardListClassName?: string;
  /** Class name for the table container (desktop) */
  tableClassName?: string;
  /** Force a specific view mode (overrides responsive behavior) */
  forceView?: 'cards' | 'table';
}

/**
 * Responsive list component that automatically switches between
 * card view (mobile) and table view (desktop)
 *
 * @example
 * <ResponsiveList
 *   items={bookings}
 *   keyExtractor={(b) => b.id}
 *   renderCard={(booking) => <BookingCard booking={booking} />}
 *   renderRow={(booking) => <BookingRow booking={booking} />}
 *   tableHeader={<BookingTableHeader />}
 *   emptyState={<EmptyBookings />}
 * />
 */
export function ResponsiveList<T>({
  items,
  keyExtractor,
  renderCard,
  renderRow,
  tableHeader,
  emptyState,
  isLoading = false,
  skeletonCount = 5,
  renderCardSkeleton,
  renderRowSkeleton,
  className,
  cardListClassName,
  tableClassName,
  forceView,
}: ResponsiveListProps<T>) {
  const isMobileView = useIsMobile();
  const showCards = forceView === 'cards' || (forceView !== 'table' && isMobileView);

  // Loading state
  if (isLoading) {
    if (showCards) {
      return (
        <div className={cn('space-y-3', cardListClassName, className)}>
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i}>{renderCardSkeleton?.() ?? <CardSkeleton />}</div>
          ))}
        </div>
      );
    }

    return (
      <div className={cn('rounded-lg border border-border overflow-hidden', tableClassName, className)}>
        {tableHeader}
        <div className="divide-y divide-border">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <div key={i}>{renderRowSkeleton?.() ?? <RowSkeleton />}</div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (items.length === 0) {
    return <>{emptyState}</>;
  }

  // Card view (mobile)
  if (showCards) {
    return (
      <div className={cn('space-y-3', cardListClassName, className)}>
        {items.map((item, index) => (
          <div key={keyExtractor(item)}>{renderCard(item, index)}</div>
        ))}
      </div>
    );
  }

  // Table view (desktop)
  return (
    <div className={cn('rounded-lg border border-border overflow-hidden', tableClassName, className)}>
      {tableHeader}
      <div className="divide-y divide-border">
        {items.map((item, index) => (
          <div key={keyExtractor(item)}>{renderRow(item, index)}</div>
        ))}
      </div>
    </div>
  );
}

/**
 * Default card skeleton
 */
function CardSkeleton() {
  return (
    <div className="mobile-card animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 bg-muted rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-4 mt-3">
        <div className="h-4 bg-muted rounded w-16" />
        <div className="h-4 bg-muted rounded w-20" />
        <div className="h-4 bg-muted rounded w-14" />
      </div>
    </div>
  );
}

/**
 * Default row skeleton
 */
function RowSkeleton() {
  return (
    <div className="px-4 py-3 flex items-center gap-4 animate-pulse">
      <div className="w-10 h-10 bg-muted rounded-lg" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-muted rounded w-48" />
        <div className="h-3 bg-muted rounded w-32" />
      </div>
      <div className="h-4 bg-muted rounded w-20" />
      <div className="h-4 bg-muted rounded w-24" />
      <div className="h-8 bg-muted rounded w-8" />
    </div>
  );
}

/**
 * Responsive grid that adjusts columns based on screen size
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  /** Number of columns at each breakpoint */
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ResponsiveGrid({
  children,
  columns = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md',
  className,
}: ResponsiveGridProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const columnClasses = {
    mobile: {
      1: 'grid-cols-1',
      2: 'grid-cols-2',
      3: 'grid-cols-3',
      4: 'grid-cols-4',
    },
    tablet: {
      1: 'sm:grid-cols-1',
      2: 'sm:grid-cols-2',
      3: 'sm:grid-cols-3',
      4: 'sm:grid-cols-4',
    },
    desktop: {
      1: 'lg:grid-cols-1',
      2: 'lg:grid-cols-2',
      3: 'lg:grid-cols-3',
      4: 'lg:grid-cols-4',
    },
  };

  return (
    <div
      className={cn(
        'grid',
        gapClasses[gap],
        columnClasses.mobile[columns.mobile as keyof typeof columnClasses.mobile] || 'grid-cols-1',
        columnClasses.tablet[columns.tablet as keyof typeof columnClasses.tablet] || 'sm:grid-cols-2',
        columnClasses.desktop[columns.desktop as keyof typeof columnClasses.desktop] || 'lg:grid-cols-3',
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Component that only renders on mobile
 */
interface MobileOnlyProps {
  children: React.ReactNode;
  /** Fallback content for non-mobile */
  fallback?: React.ReactNode;
}

export function MobileOnly({ children, fallback }: MobileOnlyProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Component that only renders on desktop
 */
interface DesktopOnlyProps {
  children: React.ReactNode;
  /** Fallback content for mobile */
  fallback?: React.ReactNode;
}

export function DesktopOnly({ children, fallback }: DesktopOnlyProps) {
  const isMobile = useIsMobile();

  if (!isMobile) {
    return <>{children}</>;
  }

  return <>{fallback}</>;
}

/**
 * Responsive layout that stacks on mobile
 */
interface ResponsiveStackProps {
  children: React.ReactNode;
  /** Direction on desktop */
  direction?: 'row' | 'row-reverse';
  /** Gap between items */
  gap?: 'sm' | 'md' | 'lg' | 'xl';
  /** Alignment */
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

export function ResponsiveStack({
  children,
  direction = 'row',
  gap = 'md',
  align = 'start',
  className,
}: ResponsiveStackProps) {
  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8',
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  };

  const directionClasses = {
    row: 'sm:flex-row',
    'row-reverse': 'sm:flex-row-reverse',
  };

  return (
    <div
      className={cn(
        'flex flex-col',
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        className
      )}
    >
      {children}
    </div>
  );
}
