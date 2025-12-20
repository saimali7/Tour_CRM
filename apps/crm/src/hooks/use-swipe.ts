'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface SwipeState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isSwiping: boolean;
}

interface SwipeConfig {
  /** Minimum distance in pixels to trigger a swipe (default: 50) */
  threshold?: number;
  /** Maximum time in ms for a swipe gesture (default: 300) */
  maxTime?: number;
  /** Prevent vertical scroll while swiping horizontally (default: true) */
  preventScrollOnSwipe?: boolean;
  /** Whether the hook is enabled (default: true) */
  enabled?: boolean;
}

interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (x: number, y: number) => void;
  onSwipeMove?: (deltaX: number, deltaY: number) => void;
  onSwipeEnd?: () => void;
}

interface SwipeResult {
  /** Attach to the element you want to track swipes on */
  ref: React.RefObject<HTMLElement>;
  /** Current swipe state for animation purposes */
  swipeState: {
    isSwiping: boolean;
    deltaX: number;
    deltaY: number;
    direction: 'left' | 'right' | 'up' | 'down' | null;
  };
}

/**
 * Hook for detecting swipe gestures on touch devices
 *
 * @example
 * const { ref, swipeState } = useSwipe({
 *   onSwipeLeft: () => goToNext(),
 *   onSwipeRight: () => goToPrevious(),
 *   threshold: 50,
 * });
 *
 * return (
 *   <div
 *     ref={ref}
 *     style={{ transform: `translateX(${swipeState.deltaX}px)` }}
 *   >
 *     Content
 *   </div>
 * );
 */
export function useSwipe(
  callbacks: SwipeCallbacks,
  config: SwipeConfig = {}
): SwipeResult {
  const {
    threshold = 50,
    maxTime = 300,
    preventScrollOnSwipe = true,
    enabled = true,
  } = config;

  const ref = useRef<HTMLElement>(null);
  const startTime = useRef<number>(0);
  const [swipeState, setSwipeState] = useState<SwipeState>({
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    isSwiping: false,
  });

  const getDirection = useCallback(
    (deltaX: number, deltaY: number): 'left' | 'right' | 'up' | 'down' | null => {
      const absX = Math.abs(deltaX);
      const absY = Math.abs(deltaY);

      // Require minimum movement
      if (absX < threshold && absY < threshold) {
        return null;
      }

      // Horizontal swipe takes precedence if movement is more horizontal
      if (absX > absY) {
        return deltaX > 0 ? 'right' : 'left';
      } else {
        return deltaY > 0 ? 'down' : 'up';
      }
    },
    [threshold]
  );

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      if (!enabled) return;

      const touch = e.touches[0];
      if (!touch) return;

      startTime.current = Date.now();
      setSwipeState({
        startX: touch.clientX,
        startY: touch.clientY,
        currentX: touch.clientX,
        currentY: touch.clientY,
        isSwiping: true,
      });

      callbacks.onSwipeStart?.(touch.clientX, touch.clientY);
    },
    [enabled, callbacks]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !swipeState.isSwiping) return;

      const touch = e.touches[0];
      if (!touch) return;

      const deltaX = touch.clientX - swipeState.startX;
      const deltaY = touch.clientY - swipeState.startY;

      // Prevent scroll if swiping horizontally
      if (preventScrollOnSwipe && Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        e.preventDefault();
      }

      setSwipeState((prev) => ({
        ...prev,
        currentX: touch.clientX,
        currentY: touch.clientY,
      }));

      callbacks.onSwipeMove?.(deltaX, deltaY);
    },
    [enabled, swipeState.isSwiping, swipeState.startX, swipeState.startY, preventScrollOnSwipe, callbacks]
  );

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      if (!enabled || !swipeState.isSwiping) return;

      const deltaX = swipeState.currentX - swipeState.startX;
      const deltaY = swipeState.currentY - swipeState.startY;
      const elapsedTime = Date.now() - startTime.current;

      // Only trigger if within time limit
      if (elapsedTime <= maxTime) {
        const direction = getDirection(deltaX, deltaY);

        switch (direction) {
          case 'left':
            callbacks.onSwipeLeft?.();
            break;
          case 'right':
            callbacks.onSwipeRight?.();
            break;
          case 'up':
            callbacks.onSwipeUp?.();
            break;
          case 'down':
            callbacks.onSwipeDown?.();
            break;
        }
      }

      setSwipeState({
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0,
        isSwiping: false,
      });

      callbacks.onSwipeEnd?.();
    },
    [
      enabled,
      swipeState,
      maxTime,
      getDirection,
      callbacks,
    ]
  );

  const handleTouchCancel = useCallback(() => {
    setSwipeState({
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0,
      isSwiping: false,
    });
    callbacks.onSwipeEnd?.();
  }, [callbacks]);

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) return;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  // Calculate delta for external use
  const deltaX = swipeState.currentX - swipeState.startX;
  const deltaY = swipeState.currentY - swipeState.startY;
  const direction = swipeState.isSwiping ? getDirection(deltaX, deltaY) : null;

  return {
    ref: ref as React.RefObject<HTMLElement>,
    swipeState: {
      isSwiping: swipeState.isSwiping,
      deltaX,
      deltaY,
      direction,
    },
  };
}

/**
 * Hook for swipe-to-dismiss pattern
 * Commonly used for cards, modals, and notifications
 *
 * @example
 * const { ref, style, isDismissing } = useSwipeToDismiss({
 *   onDismiss: () => removeItem(id),
 *   direction: 'left',
 * });
 */
export function useSwipeToDismiss(config: {
  onDismiss: () => void;
  direction?: 'left' | 'right' | 'both';
  threshold?: number;
  enabled?: boolean;
}) {
  const {
    onDismiss,
    direction = 'left',
    threshold = 100,
    enabled = true,
  } = config;

  const [offset, setOffset] = useState(0);
  const [isDismissing, setIsDismissing] = useState(false);

  const { ref, swipeState } = useSwipe(
    {
      onSwipeLeft: () => {
        if ((direction === 'left' || direction === 'both') && Math.abs(offset) > threshold) {
          setIsDismissing(true);
          onDismiss();
        }
      },
      onSwipeRight: () => {
        if ((direction === 'right' || direction === 'both') && Math.abs(offset) > threshold) {
          setIsDismissing(true);
          onDismiss();
        }
      },
      onSwipeMove: (deltaX) => {
        // Only allow movement in the allowed direction
        if (direction === 'left' && deltaX > 0) return;
        if (direction === 'right' && deltaX < 0) return;
        setOffset(deltaX);
      },
      onSwipeEnd: () => {
        if (!isDismissing) {
          setOffset(0);
        }
      },
    },
    { enabled, threshold: 10 }
  );

  const style: React.CSSProperties = {
    transform: `translateX(${offset}px)`,
    transition: swipeState.isSwiping ? 'none' : 'transform 200ms ease-out',
    opacity: isDismissing ? 0 : 1 - Math.abs(offset) / (threshold * 2),
  };

  return {
    ref,
    style,
    isDismissing,
    offset,
  };
}

/**
 * Hook for swipeable carousel/slider
 */
export function useSwipeableCarousel(config: {
  itemCount: number;
  currentIndex: number;
  onChange: (index: number) => void;
  enabled?: boolean;
  threshold?: number;
}) {
  const {
    itemCount,
    currentIndex,
    onChange,
    enabled = true,
    threshold = 50,
  } = config;

  const { ref, swipeState } = useSwipe(
    {
      onSwipeLeft: () => {
        if (currentIndex < itemCount - 1) {
          onChange(currentIndex + 1);
        }
      },
      onSwipeRight: () => {
        if (currentIndex > 0) {
          onChange(currentIndex - 1);
        }
      },
    },
    { enabled, threshold }
  );

  return {
    ref,
    swipeState,
    canSwipeLeft: currentIndex < itemCount - 1,
    canSwipeRight: currentIndex > 0,
  };
}
