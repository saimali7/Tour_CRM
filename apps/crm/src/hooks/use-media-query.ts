'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * SSR-safe media query hook
 * Returns false during SSR and hydration, then updates to the actual value
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 639px)');
 * const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
 */
export function useMediaQuery(query: string): boolean {
  // Start with false for SSR safety - avoids hydration mismatch
  const [matches, setMatches] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Check if window is available (should always be true in useEffect)
    if (typeof window === 'undefined') return;

    const media = window.matchMedia(query);

    // Set initial value after mount
    setMatches(media.matches);

    // Create listener function
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Add event listener
    media.addEventListener('change', listener);

    // Cleanup
    return () => media.removeEventListener('change', listener);
  }, [query]);

  // Return false during SSR/hydration to avoid mismatch
  return mounted ? matches : false;
}

/**
 * Breakpoint values aligned with Tailwind CSS defaults
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * Mobile: < 640px (below sm)
 * Best for single-column layouts, bottom nav, card-based lists
 */
export function useIsMobile(): boolean {
  return useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 1}px)`);
}

/**
 * Tablet: 640px - 1023px (sm to below lg)
 * Best for 2-column layouts, collapsible sidebars
 */
export function useIsTablet(): boolean {
  return useMediaQuery(
    `(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.lg - 1}px)`
  );
}

/**
 * Desktop: >= 1024px (lg and above)
 * Full 3-column layout with nav rail and context panel
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
}

/**
 * Large Desktop: >= 1280px (xl and above)
 * Extra wide layouts, more columns in grids
 */
export function useIsLargeDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);
}

/**
 * Touch device detection
 * Uses hover and pointer media queries for better accuracy than user agent
 */
export function useIsTouchDevice(): boolean {
  return useMediaQuery('(hover: none) and (pointer: coarse)');
}

/**
 * Reduced motion preference
 * Useful for disabling animations for accessibility
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/**
 * Dark mode preference
 * Note: The app uses ThemeProvider, so use useTheme from next-themes instead
 * This is for detecting system preference specifically
 */
export function usePrefersDarkMode(): boolean {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/**
 * Combined responsive state hook
 * Returns an object with all breakpoint states for convenience
 *
 * @example
 * const { isMobile, isTablet, isDesktop } = useResponsive();
 */
export function useResponsive() {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const isLargeDesktop = useIsLargeDesktop();
  const isTouchDevice = useIsTouchDevice();
  const prefersReducedMotion = usePrefersReducedMotion();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    isTouchDevice,
    prefersReducedMotion,
    // Convenience: anything below desktop
    isMobileOrTablet: isMobile || isTablet,
  };
}

/**
 * Screen width hook for fine-grained control
 * Returns current window width, updating on resize
 * Uses debouncing to prevent excessive re-renders
 */
export function useWindowSize() {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: ReturnType<typeof setTimeout>;

    const updateSize = () => {
      // Debounce resize events
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSize({
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }, 100);
    };

    // Set initial size
    setSize({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    window.addEventListener('resize', updateSize);

    return () => {
      window.removeEventListener('resize', updateSize);
      clearTimeout(timeoutId);
    };
  }, []);

  return size;
}

/**
 * Breakpoint name hook
 * Returns the current breakpoint name as a string
 */
export function useBreakpoint(): 'mobile' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' {
  const { width } = useWindowSize();

  if (width === 0) return 'mobile'; // SSR default
  if (width < BREAKPOINTS.sm) return 'mobile';
  if (width < BREAKPOINTS.md) return 'sm';
  if (width < BREAKPOINTS.lg) return 'md';
  if (width < BREAKPOINTS.xl) return 'lg';
  if (width < BREAKPOINTS['2xl']) return 'xl';
  return '2xl';
}
