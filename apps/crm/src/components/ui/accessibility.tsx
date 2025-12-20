"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Skip to Main Content Link
// ============================================================================

interface SkipLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** The ID of the main content element to skip to */
  targetId?: string;
  /** Custom label for the skip link */
  label?: string;
}

/**
 * A skip link that becomes visible on focus, allowing keyboard users
 * to bypass navigation and jump directly to main content.
 *
 * @example
 * // In your root layout:
 * <SkipLink targetId="main-content" />
 *
 * // In your page:
 * <main id="main-content" tabIndex={-1}>
 *   ...
 * </main>
 */
export const SkipLink = React.forwardRef<HTMLAnchorElement, SkipLinkProps>(
  (
    { className, targetId = "main-content", label = "Skip to main content", ...props },
    ref
  ) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();
      const target = document.getElementById(targetId);
      if (target) {
        target.focus();
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      props.onClick?.(e);
    };

    return (
      <a
        ref={ref}
        href={`#${targetId}`}
        onClick={handleClick}
        className={cn(
          // Visually hidden until focused
          "sr-only focus:not-sr-only",
          // Positioning
          "fixed left-4 top-4 z-[100]",
          // Styling
          "rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
          // Focus styles
          "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
          // Animation
          "transition-all duration-150",
          className
        )}
        {...props}
      >
        {label}
      </a>
    );
  }
);
SkipLink.displayName = "SkipLink";

// ============================================================================
// Focus Trap Hook
// ============================================================================

interface FocusTrapOptions {
  /** Whether the focus trap is active */
  enabled?: boolean;
  /** Element to receive initial focus. If not provided, focuses the first focusable element */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Element to receive focus when the trap is deactivated */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /** Whether to restore focus to the previously focused element when deactivated */
  restoreFocus?: boolean;
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
  'audio[controls]',
  'video[controls]',
  'details > summary:first-of-type',
].join(', ');

/**
 * A hook that traps focus within a container element.
 * Useful for modals, dialogs, and other overlay components.
 *
 * @example
 * function Modal({ isOpen, onClose, children }) {
 *   const containerRef = useFocusTrap<HTMLDivElement>({ enabled: isOpen });
 *
 *   return (
 *     <div ref={containerRef} role="dialog" aria-modal="true">
 *       {children}
 *     </div>
 *   );
 * }
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  options: FocusTrapOptions = {}
): React.RefObject<T | null> {
  const { enabled = true, initialFocusRef, returnFocusRef, restoreFocus = true } = options;
  const containerRef = React.useRef<T>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    if (!enabled) return;

    // Store the currently focused element to restore later
    previouslyFocusedRef.current = document.activeElement as HTMLElement;

    const container = containerRef.current;
    if (!container) return;

    // Get all focusable elements
    const getFocusableElements = (): HTMLElement[] => {
      return Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
      ).filter((el) => {
        // Filter out elements that are hidden or have display: none
        return el.offsetParent !== null;
      });
    };

    // Set initial focus
    const setInitialFocus = () => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else {
        const focusable = getFocusableElements();
        const firstFocusable = focusable[0];
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          // If no focusable elements, focus the container itself
          container.setAttribute('tabindex', '-1');
          container.focus();
        }
      }
    };

    // Handle tab key to trap focus
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }

      const firstElement = focusable[0]!;
      const lastElement = focusable[focusable.length - 1]!;

      if (e.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    // Set initial focus with a small delay to ensure DOM is ready
    requestAnimationFrame(setInitialFocus);

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);

      // Restore focus when unmounting
      if (restoreFocus) {
        const elementToFocus = returnFocusRef?.current || previouslyFocusedRef.current;
        if (elementToFocus && typeof elementToFocus.focus === 'function') {
          elementToFocus.focus();
        }
      }
    };
  }, [enabled, initialFocusRef, returnFocusRef, restoreFocus]);

  return containerRef;
}

// ============================================================================
// Focus Trap Component
// ============================================================================

interface FocusTrapProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Whether the focus trap is active */
  enabled?: boolean;
  /** Element to receive initial focus */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Element to receive focus when deactivated */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /** Whether to restore focus when deactivated */
  restoreFocus?: boolean;
}

/**
 * A component that traps focus within its children.
 *
 * @example
 * <FocusTrap enabled={isOpen}>
 *   <dialog>
 *     <button>Close</button>
 *     <input type="text" />
 *   </dialog>
 * </FocusTrap>
 */
export const FocusTrap = React.forwardRef<HTMLDivElement, FocusTrapProps>(
  (
    { enabled = true, initialFocusRef, returnFocusRef, restoreFocus = true, ...props },
    forwardedRef
  ) => {
    const internalRef = useFocusTrap<HTMLDivElement>({
      enabled,
      initialFocusRef,
      returnFocusRef,
      restoreFocus,
    });

    // Combine refs
    const ref = React.useMemo(() => {
      return (node: HTMLDivElement | null) => {
        (internalRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        if (typeof forwardedRef === 'function') {
          forwardedRef(node);
        } else if (forwardedRef) {
          forwardedRef.current = node;
        }
      };
    }, [forwardedRef, internalRef]);

    return <div ref={ref} {...props} />;
  }
);
FocusTrap.displayName = "FocusTrap";

// ============================================================================
// Visually Hidden Component
// ============================================================================

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** The element type to render */
  as?: React.ElementType;
}

/**
 * Visually hides content while keeping it accessible to screen readers.
 *
 * @example
 * <button>
 *   <Icon />
 *   <VisuallyHidden>Close dialog</VisuallyHidden>
 * </button>
 */
export const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ as: Component = "span", className, ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn("sr-only", className)}
        {...props}
      />
    );
  }
);
VisuallyHidden.displayName = "VisuallyHidden";

// ============================================================================
// Announcer Component (for live regions)
// ============================================================================

type AnnouncerPoliteness = "polite" | "assertive" | "off";

interface AnnouncerContextValue {
  announce: (message: string, politeness?: AnnouncerPoliteness) => void;
}

const AnnouncerContext = React.createContext<AnnouncerContextValue | null>(null);

/**
 * Hook to announce messages to screen readers.
 *
 * @example
 * const { announce } = useAnnounce();
 * announce("Item deleted successfully");
 */
export function useAnnounce(): AnnouncerContextValue {
  const context = React.useContext(AnnouncerContext);
  if (!context) {
    // Return a no-op function if used outside provider
    return { announce: () => {} };
  }
  return context;
}

interface AnnouncerProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that enables the useAnnounce hook.
 * Include this near the root of your app.
 *
 * @example
 * <AnnouncerProvider>
 *   <App />
 * </AnnouncerProvider>
 */
export function AnnouncerProvider({ children }: AnnouncerProviderProps) {
  const [politeMessage, setPoliteMessage] = React.useState("");
  const [assertiveMessage, setAssertiveMessage] = React.useState("");

  const announce = React.useCallback(
    (message: string, politeness: AnnouncerPoliteness = "polite") => {
      if (politeness === "off") return;

      // Clear the message first to ensure re-announcement of the same message
      if (politeness === "assertive") {
        setAssertiveMessage("");
        requestAnimationFrame(() => setAssertiveMessage(message));
      } else {
        setPoliteMessage("");
        requestAnimationFrame(() => setPoliteMessage(message));
      }

      // Clear messages after a delay
      setTimeout(() => {
        if (politeness === "assertive") {
          setAssertiveMessage("");
        } else {
          setPoliteMessage("");
        }
      }, 1000);
    },
    []
  );

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      {/* Polite announcer */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {politeMessage}
      </div>
      {/* Assertive announcer */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      >
        {assertiveMessage}
      </div>
    </AnnouncerContext.Provider>
  );
}

// ============================================================================
// useReducedMotion Hook
// ============================================================================

/**
 * Hook that returns whether the user prefers reduced motion.
 *
 * @example
 * const prefersReducedMotion = useReducedMotion();
 * const animation = prefersReducedMotion ? "none" : "slide-in 200ms";
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// useId Polyfill (for older React versions)
// ============================================================================

let idCounter = 0;

/**
 * Generates a unique ID. Uses React.useId when available,
 * falls back to a counter-based approach.
 *
 * @example
 * const id = useUniqueId("dialog");
 * // Returns something like "dialog-1" or ":r1:"
 */
export function useUniqueId(prefix = "id"): string {
  const [id] = React.useState(() => {
    idCounter += 1;
    return `${prefix}-${idCounter}`;
  });
  return id;
}

// ============================================================================
// Roving Focus Hook
// ============================================================================

interface RovingFocusOptions {
  /** The currently active index */
  activeIndex: number;
  /** Callback when the active index changes */
  onActiveIndexChange: (index: number) => void;
  /** Total number of items */
  itemCount: number;
  /** Orientation for arrow key navigation */
  orientation?: "horizontal" | "vertical" | "both";
  /** Whether to loop around when reaching the end */
  loop?: boolean;
}

/**
 * Hook for implementing roving tabindex pattern.
 * Enables arrow key navigation between a group of focusable items.
 *
 * @example
 * const { getRovingProps } = useRovingFocus({
 *   activeIndex,
 *   onActiveIndexChange: setActiveIndex,
 *   itemCount: items.length,
 * });
 *
 * return items.map((item, index) => (
 *   <button key={item.id} {...getRovingProps(index)}>
 *     {item.label}
 *   </button>
 * ));
 */
export function useRovingFocus({
  activeIndex,
  onActiveIndexChange,
  itemCount,
  orientation = "both",
  loop = true,
}: RovingFocusOptions) {
  const itemRefs = React.useRef<(HTMLElement | null)[]>([]);

  const setItemRef = React.useCallback(
    (index: number) => (el: HTMLElement | null) => {
      itemRefs.current[index] = el;
    },
    []
  );

  const focusItem = React.useCallback((index: number) => {
    const item = itemRefs.current[index];
    if (item) {
      item.focus();
    }
  }, []);

  const handleKeyDown = React.useCallback(
    (index: number) => (e: React.KeyboardEvent) => {
      const isHorizontal = orientation === "horizontal" || orientation === "both";
      const isVertical = orientation === "vertical" || orientation === "both";

      let nextIndex = activeIndex;

      if ((e.key === "ArrowRight" && isHorizontal) || (e.key === "ArrowDown" && isVertical)) {
        e.preventDefault();
        nextIndex = activeIndex + 1;
        if (nextIndex >= itemCount) {
          nextIndex = loop ? 0 : itemCount - 1;
        }
      } else if ((e.key === "ArrowLeft" && isHorizontal) || (e.key === "ArrowUp" && isVertical)) {
        e.preventDefault();
        nextIndex = activeIndex - 1;
        if (nextIndex < 0) {
          nextIndex = loop ? itemCount - 1 : 0;
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        nextIndex = itemCount - 1;
      }

      if (nextIndex !== activeIndex) {
        onActiveIndexChange(nextIndex);
        focusItem(nextIndex);
      }
    },
    [activeIndex, itemCount, loop, orientation, onActiveIndexChange, focusItem]
  );

  const getRovingProps = React.useCallback(
    (index: number) => ({
      ref: setItemRef(index),
      tabIndex: index === activeIndex ? 0 : -1,
      onKeyDown: handleKeyDown(index),
      onFocus: () => onActiveIndexChange(index),
    }),
    [activeIndex, setItemRef, handleKeyDown, onActiveIndexChange]
  );

  return { getRovingProps, focusItem };
}
