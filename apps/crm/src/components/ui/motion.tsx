"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Motion Context for Reduced Motion Preference
// ============================================================================

const MotionContext = React.createContext<{
  prefersReducedMotion: boolean;
}>({
  prefersReducedMotion: false,
});

export function useMotionPreference() {
  return React.useContext(MotionContext);
}

export function MotionProvider({ children }: { children: React.ReactNode }) {
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

  return (
    <MotionContext.Provider value={{ prefersReducedMotion }}>
      {children}
    </MotionContext.Provider>
  );
}

// ============================================================================
// Animation CSS Keyframes (injected once)
// ============================================================================

const motionStyles = `
@keyframes motion-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes motion-fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes motion-slide-in-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes motion-slide-in-down {
  from { opacity: 0; transform: translateY(-8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes motion-slide-in-left {
  from { opacity: 0; transform: translateX(8px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes motion-slide-in-right {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes motion-scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

@keyframes motion-scale-out {
  from { opacity: 1; transform: scale(1); }
  to { opacity: 0; transform: scale(0.95); }
}

@keyframes motion-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes motion-pulse-ring {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes motion-success-check {
  0% { stroke-dashoffset: 24; }
  100% { stroke-dashoffset: 0; }
}

@keyframes motion-success-circle {
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
}

@keyframes motion-success-burst {
  0% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}

@keyframes motion-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-4px); }
  40%, 80% { transform: translateX(4px); }
}

@keyframes motion-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes motion-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;

// Inject styles once
let stylesInjected = false;
function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  const style = document.createElement("style");
  style.textContent = motionStyles;
  document.head.appendChild(style);
  stylesInjected = true;
}

// ============================================================================
// FadeIn Component
// ============================================================================

interface FadeInProps extends React.HTMLAttributes<HTMLDivElement> {
  delay?: number;
  duration?: number;
  as?: React.ElementType;
}

export const FadeIn = React.forwardRef<HTMLDivElement, FadeInProps>(
  (
    { className, delay = 0, duration = 200, style, as: Component = "div", ...props },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();

    React.useEffect(() => {
      injectStyles();
    }, []);

    return (
      <Component
        ref={ref}
        className={cn(className)}
        style={{
          ...style,
          animation: prefersReducedMotion
            ? "none"
            : `motion-fade-in ${duration}ms ease-out ${delay}ms both`,
        }}
        {...props}
      />
    );
  }
);
FadeIn.displayName = "FadeIn";

// ============================================================================
// SlideIn Component
// ============================================================================

type SlideDirection = "up" | "down" | "left" | "right";

interface SlideInProps extends React.HTMLAttributes<HTMLDivElement> {
  direction?: SlideDirection;
  delay?: number;
  duration?: number;
  as?: React.ElementType;
}

const slideAnimations: Record<SlideDirection, string> = {
  up: "motion-slide-in-up",
  down: "motion-slide-in-down",
  left: "motion-slide-in-left",
  right: "motion-slide-in-right",
};

export const SlideIn = React.forwardRef<HTMLDivElement, SlideInProps>(
  (
    {
      className,
      direction = "up",
      delay = 0,
      duration = 200,
      style,
      as: Component = "div",
      ...props
    },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();

    React.useEffect(() => {
      injectStyles();
    }, []);

    return (
      <Component
        ref={ref}
        className={cn(className)}
        style={{
          ...style,
          animation: prefersReducedMotion
            ? "none"
            : `${slideAnimations[direction]} ${duration}ms ease-out ${delay}ms both`,
        }}
        {...props}
      />
    );
  }
);
SlideIn.displayName = "SlideIn";

// ============================================================================
// Scale Component (for hover/active interactions)
// ============================================================================

interface ScaleProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverScale?: number;
  activeScale?: number;
  as?: React.ElementType;
}

export const Scale = React.forwardRef<HTMLDivElement, ScaleProps>(
  (
    {
      className,
      hoverScale = 1.02,
      activeScale = 0.98,
      style,
      as: Component = "div",
      ...props
    },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();

    return (
      <Component
        ref={ref}
        className={cn(
          prefersReducedMotion
            ? ""
            : "transition-transform duration-150 ease-out",
          className
        )}
        style={{
          ...style,
          ["--hover-scale" as string]: hoverScale,
          ["--active-scale" as string]: activeScale,
        }}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!prefersReducedMotion) {
            (e.currentTarget as HTMLElement).style.transform = `scale(${hoverScale})`;
          }
          props.onMouseEnter?.(e);
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!prefersReducedMotion) {
            (e.currentTarget as HTMLElement).style.transform = "scale(1)";
          }
          props.onMouseLeave?.(e);
        }}
        onMouseDown={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!prefersReducedMotion) {
            (e.currentTarget as HTMLElement).style.transform = `scale(${activeScale})`;
          }
          props.onMouseDown?.(e);
        }}
        onMouseUp={(e: React.MouseEvent<HTMLDivElement>) => {
          if (!prefersReducedMotion) {
            (e.currentTarget as HTMLElement).style.transform = `scale(${hoverScale})`;
          }
          props.onMouseUp?.(e);
        }}
        {...props}
      />
    );
  }
);
Scale.displayName = "Scale";

// ============================================================================
// Stagger Component (for staggered children animations)
// ============================================================================

interface StaggerProps extends React.HTMLAttributes<HTMLDivElement> {
  staggerDelay?: number;
  initialDelay?: number;
  duration?: number;
  as?: React.ElementType;
}

export const Stagger = React.forwardRef<HTMLDivElement, StaggerProps>(
  (
    {
      className,
      staggerDelay = 50,
      initialDelay = 0,
      duration = 200,
      children,
      as: Component = "div",
      ...props
    },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();

    React.useEffect(() => {
      injectStyles();
    }, []);

    const staggeredChildren = React.Children.map(children, (child, index) => {
      if (!React.isValidElement(child)) return child;

      const delay = initialDelay + index * staggerDelay;

      return (
        <div
          key={index}
          style={{
            animation: prefersReducedMotion
              ? "none"
              : `motion-slide-in-up ${duration}ms ease-out ${delay}ms both`,
          }}
        >
          {child}
        </div>
      );
    });

    return (
      <Component ref={ref} className={cn(className)} {...props}>
        {staggeredChildren}
      </Component>
    );
  }
);
Stagger.displayName = "Stagger";

// ============================================================================
// StaggerItem Component (for use within Stagger)
// ============================================================================

interface StaggerItemProps extends React.HTMLAttributes<HTMLDivElement> {
  index?: number;
  staggerDelay?: number;
  initialDelay?: number;
  duration?: number;
}

export const StaggerItem = React.forwardRef<HTMLDivElement, StaggerItemProps>(
  (
    {
      className,
      index = 0,
      staggerDelay = 50,
      initialDelay = 0,
      duration = 200,
      style,
      ...props
    },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();
    const delay = initialDelay + index * staggerDelay;

    React.useEffect(() => {
      injectStyles();
    }, []);

    return (
      <div
        ref={ref}
        className={cn(className)}
        style={{
          ...style,
          animation: prefersReducedMotion
            ? "none"
            : `motion-slide-in-up ${duration}ms ease-out ${delay}ms both`,
        }}
        {...props}
      />
    );
  }
);
StaggerItem.displayName = "StaggerItem";

// ============================================================================
// Success Component (checkmark burst animation)
// ============================================================================

interface SuccessProps extends React.SVGAttributes<SVGSVGElement> {
  size?: number;
  strokeWidth?: number;
  delay?: number;
  onComplete?: () => void;
}

export const Success = React.forwardRef<SVGSVGElement, SuccessProps>(
  ({ className, size = 48, strokeWidth = 2.5, delay = 0, onComplete, ...props }, ref) => {
    const { prefersReducedMotion } = useMotionPreference();
    const [isAnimating, setIsAnimating] = React.useState(false);

    React.useEffect(() => {
      injectStyles();
      const timer = setTimeout(() => {
        setIsAnimating(true);
      }, delay);
      return () => clearTimeout(timer);
    }, [delay]);

    React.useEffect(() => {
      if (isAnimating && onComplete) {
        const timer = setTimeout(onComplete, 600);
        return () => clearTimeout(timer);
      }
    }, [isAnimating, onComplete]);

    const circleStyle: React.CSSProperties = prefersReducedMotion
      ? {}
      : {
          strokeDasharray: 100,
          strokeDashoffset: isAnimating ? 0 : 100,
          transition: "stroke-dashoffset 400ms ease-out",
        };

    const checkStyle: React.CSSProperties = prefersReducedMotion
      ? {}
      : {
          strokeDasharray: 24,
          strokeDashoffset: isAnimating ? 0 : 24,
          transition: "stroke-dashoffset 300ms ease-out 200ms",
        };

    const containerStyle: React.CSSProperties = prefersReducedMotion
      ? {}
      : {
          animation: isAnimating ? "motion-success-burst 400ms ease-out" : "none",
        };

    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className={cn("text-green-500", className)}
        style={containerStyle}
        aria-label="Success"
        role="img"
        {...props}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          style={circleStyle}
        />
        <path
          d="M8 12l2.5 2.5L16 9"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={checkStyle}
        />
      </svg>
    );
  }
);
Success.displayName = "Success";

// ============================================================================
// Pulse Component (subtle attention animation)
// ============================================================================

interface PulseProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "glow" | "ring" | "opacity";
  color?: string;
  duration?: number;
  as?: React.ElementType;
}

export const Pulse = React.forwardRef<HTMLDivElement, PulseProps>(
  (
    {
      className,
      variant = "opacity",
      color = "hsl(var(--primary))",
      duration = 2000,
      style,
      children,
      as: Component = "div",
      ...props
    },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();

    React.useEffect(() => {
      injectStyles();
    }, []);

    if (variant === "ring") {
      return (
        <Component
          ref={ref}
          className={cn("relative inline-flex", className)}
          {...props}
        >
          {children}
          {!prefersReducedMotion && (
            <span
              className="absolute inset-0 rounded-full"
              style={{
                border: `2px solid ${color}`,
                animation: `motion-pulse-ring ${duration}ms ease-out infinite`,
              }}
              aria-hidden="true"
            />
          )}
        </Component>
      );
    }

    if (variant === "glow") {
      return (
        <Component
          ref={ref}
          className={cn("relative", className)}
          style={{
            ...style,
            animation: prefersReducedMotion
              ? "none"
              : `motion-pulse ${duration}ms ease-in-out infinite`,
            boxShadow: `0 0 20px ${color}40`,
          }}
          {...props}
        >
          {children}
        </Component>
      );
    }

    // Default: opacity pulse
    return (
      <Component
        ref={ref}
        className={cn(className)}
        style={{
          ...style,
          animation: prefersReducedMotion
            ? "none"
            : `motion-pulse ${duration}ms ease-in-out infinite`,
        }}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Pulse.displayName = "Pulse";

// ============================================================================
// Shake Component (for error feedback)
// ============================================================================

interface ShakeProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger?: boolean;
  duration?: number;
  as?: React.ElementType;
}

export const Shake = React.forwardRef<HTMLDivElement, ShakeProps>(
  (
    { className, trigger = false, duration = 400, style, as: Component = "div", ...props },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();
    const [isShaking, setIsShaking] = React.useState(false);

    React.useEffect(() => {
      injectStyles();
    }, []);

    React.useEffect(() => {
      if (trigger && !prefersReducedMotion) {
        setIsShaking(true);
        const timer = setTimeout(() => setIsShaking(false), duration);
        return () => clearTimeout(timer);
      }
    }, [trigger, duration, prefersReducedMotion]);

    return (
      <Component
        ref={ref}
        className={cn(className)}
        style={{
          ...style,
          animation: isShaking ? `motion-shake ${duration}ms ease-in-out` : "none",
        }}
        {...props}
      />
    );
  }
);
Shake.displayName = "Shake";

// ============================================================================
// Bounce Component (for attention/notification)
// ============================================================================

interface BounceProps extends React.HTMLAttributes<HTMLDivElement> {
  trigger?: boolean;
  duration?: number;
  as?: React.ElementType;
}

export const Bounce = React.forwardRef<HTMLDivElement, BounceProps>(
  (
    { className, trigger = false, duration = 400, style, as: Component = "div", ...props },
    ref
  ) => {
    const { prefersReducedMotion } = useMotionPreference();
    const [isBouncing, setIsBouncing] = React.useState(false);

    React.useEffect(() => {
      injectStyles();
    }, []);

    React.useEffect(() => {
      if (trigger && !prefersReducedMotion) {
        setIsBouncing(true);
        const timer = setTimeout(() => setIsBouncing(false), duration);
        return () => clearTimeout(timer);
      }
    }, [trigger, duration, prefersReducedMotion]);

    return (
      <Component
        ref={ref}
        className={cn(className)}
        style={{
          ...style,
          animation: isBouncing ? `motion-bounce ${duration}ms ease-in-out` : "none",
        }}
        {...props}
      />
    );
  }
);
Bounce.displayName = "Bounce";

// ============================================================================
// AnimatePresence-like Component (for mount/unmount animations)
// ============================================================================

interface AnimatePresenceProps {
  show: boolean;
  children: React.ReactNode;
  duration?: number;
  onExitComplete?: () => void;
}

export function AnimatePresence({
  show,
  children,
  duration = 200,
  onExitComplete,
}: AnimatePresenceProps) {
  const { prefersReducedMotion } = useMotionPreference();
  const [shouldRender, setShouldRender] = React.useState(show);
  const [isExiting, setIsExiting] = React.useState(false);

  React.useEffect(() => {
    injectStyles();
  }, []);

  React.useEffect(() => {
    if (show) {
      setShouldRender(true);
      setIsExiting(false);
    } else if (shouldRender) {
      if (prefersReducedMotion) {
        setShouldRender(false);
        onExitComplete?.();
      } else {
        setIsExiting(true);
        const timer = setTimeout(() => {
          setShouldRender(false);
          setIsExiting(false);
          onExitComplete?.();
        }, duration);
        return () => clearTimeout(timer);
      }
    }
  }, [show, shouldRender, duration, prefersReducedMotion, onExitComplete]);

  if (!shouldRender) return null;

  return (
    <div
      style={{
        animation: prefersReducedMotion
          ? "none"
          : isExiting
          ? `motion-fade-out ${duration}ms ease-out forwards`
          : `motion-fade-in ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

// ============================================================================
// useReducedMotion Hook
// ============================================================================

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
