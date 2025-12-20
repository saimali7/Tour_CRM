'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, ArrowDown, Check } from 'lucide-react';

interface PullToRefreshProps {
  /** Called when user pulls down and releases */
  onRefresh: () => Promise<void>;
  /** Content to display inside the scrollable area */
  children: React.ReactNode;
  /** Whether pull-to-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Pull distance required to trigger refresh (default: 80) */
  threshold?: number;
  /** Maximum pull distance (default: 120) */
  maxPull?: number;
  /** Custom loading indicator */
  loadingIndicator?: React.ReactNode;
  /** Additional class names */
  className?: string;
}

type RefreshState = 'idle' | 'pulling' | 'ready' | 'refreshing' | 'complete';

/**
 * Pull-to-refresh wrapper for mobile lists
 * Provides native-feeling pull-to-refresh behavior
 *
 * @example
 * <PullToRefresh onRefresh={async () => await refetch()}>
 *   <BookingsList bookings={bookings} />
 * </PullToRefresh>
 */
export function PullToRefresh({
  onRefresh,
  children,
  enabled = true,
  threshold = 80,
  maxPull = 120,
  loadingIndicator,
  className,
}: PullToRefreshProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);
  const currentY = useRef<number>(0);

  const [state, setState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  // Calculate the visual pull progress (0-1)
  const pullProgress = Math.min(pullDistance / threshold, 1);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state === 'refreshing') return;

      const container = containerRef.current;
      if (!container) return;

      // Only start pull if at the top of the scroll container
      if (container.scrollTop > 0) return;

      const touch = e.touches[0];
      if (!touch) return;

      startY.current = touch.clientY;
      currentY.current = touch.clientY;
      setState('pulling');
    },
    [enabled, state]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || state === 'refreshing' || state === 'idle') return;

      const touch = e.touches[0];
      if (!touch) return;

      currentY.current = touch.clientY;
      const delta = currentY.current - startY.current;

      // Only allow pulling down
      if (delta <= 0) {
        setPullDistance(0);
        setState('idle');
        return;
      }

      // Apply resistance to the pull
      const resistance = 0.5;
      const adjustedDelta = Math.min(delta * resistance, maxPull);
      setPullDistance(adjustedDelta);

      // Prevent scroll while pulling
      if (adjustedDelta > 10) {
        e.preventDefault();
      }

      // Update state based on pull distance
      if (adjustedDelta >= threshold) {
        setState('ready');
      } else {
        setState('pulling');
      }
    },
    [enabled, state, threshold, maxPull]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!enabled || state === 'refreshing') return;

    if (state === 'ready' && pullDistance >= threshold) {
      setState('refreshing');

      try {
        await onRefresh();
        setState('complete');

        // Show success state briefly
        setTimeout(() => {
          setState('idle');
          setPullDistance(0);
        }, 500);
      } catch {
        setState('idle');
        setPullDistance(0);
      }
    } else {
      setState('idle');
      setPullDistance(0);
    }
  }, [enabled, state, pullDistance, threshold, onRefresh]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !enabled) return;

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd]);

  const renderIndicator = () => {
    if (loadingIndicator && state === 'refreshing') {
      return loadingIndicator;
    }

    return (
      <div
        className={cn(
          'flex items-center justify-center transition-all duration-200',
          state === 'refreshing' ? 'text-primary' : 'text-muted-foreground'
        )}
      >
        {state === 'refreshing' ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : state === 'complete' ? (
          <Check className="h-6 w-6 text-emerald-500" />
        ) : (
          <ArrowDown
            className={cn(
              'h-6 w-6 transition-transform duration-200',
              state === 'ready' && 'rotate-180 text-primary'
            )}
            style={{
              transform: `rotate(${pullProgress * 180}deg)`,
            }}
          />
        )}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-auto -webkit-overflow-scrolling-touch',
        className
      )}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center',
          'transition-opacity duration-200',
          pullDistance > 0 || state === 'refreshing' || state === 'complete'
            ? 'opacity-100'
            : 'opacity-0'
        )}
        style={{
          height: `${Math.max(pullDistance, state === 'refreshing' ? 48 : 0)}px`,
          top: 0,
        }}
      >
        {renderIndicator()}
      </div>

      {/* Content container */}
      <div
        ref={contentRef}
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: state === 'pulling' || state === 'ready' ? 'none' : 'transform 200ms ease-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Hook version for more control over the pull-to-refresh behavior
 */
export function usePullToRefresh(config: {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  threshold?: number;
  maxPull?: number;
}) {
  const { onRefresh, enabled = true, threshold = 80, maxPull = 120 } = config;

  const [state, setState] = useState<RefreshState>('idle');
  const [pullDistance, setPullDistance] = useState(0);
  const startY = useRef<number>(0);

  const reset = useCallback(() => {
    setState('idle');
    setPullDistance(0);
    startY.current = 0;
  }, []);

  const handlePullStart = useCallback(
    (clientY: number, scrollTop: number) => {
      if (!enabled || state === 'refreshing') return;
      if (scrollTop > 0) return;

      startY.current = clientY;
      setState('pulling');
    },
    [enabled, state]
  );

  const handlePullMove = useCallback(
    (clientY: number) => {
      if (!enabled || state === 'refreshing' || state === 'idle') return;

      const delta = clientY - startY.current;
      if (delta <= 0) {
        reset();
        return;
      }

      const resistance = 0.5;
      const adjustedDelta = Math.min(delta * resistance, maxPull);
      setPullDistance(adjustedDelta);

      if (adjustedDelta >= threshold) {
        setState('ready');
      } else {
        setState('pulling');
      }
    },
    [enabled, state, threshold, maxPull, reset]
  );

  const handlePullEnd = useCallback(async () => {
    if (!enabled || state === 'refreshing') return;

    if (state === 'ready' && pullDistance >= threshold) {
      setState('refreshing');

      try {
        await onRefresh();
        setState('complete');
        setTimeout(reset, 500);
      } catch {
        reset();
      }
    } else {
      reset();
    }
  }, [enabled, state, pullDistance, threshold, onRefresh, reset]);

  return {
    state,
    pullDistance,
    pullProgress: Math.min(pullDistance / threshold, 1),
    isRefreshing: state === 'refreshing',
    handlers: {
      onPullStart: handlePullStart,
      onPullMove: handlePullMove,
      onPullEnd: handlePullEnd,
    },
  };
}
