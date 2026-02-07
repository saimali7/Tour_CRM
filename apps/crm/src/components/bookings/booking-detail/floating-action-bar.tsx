"use client";

import { useEffect, useState, useRef } from "react";
import { CreditCard, Phone } from "lucide-react";
import { Button } from "@tour/ui";
import { cn } from "@/lib/utils";
import type { BalanceInfo, PrimaryAction } from "./types";

interface FloatingActionBarProps {
  customerName: string;
  balanceInfo: BalanceInfo | null;
  primaryAction: PrimaryAction | null;
  onCollectPayment?: () => void;
  onContact?: () => void;
  headerRef: React.RefObject<HTMLElement>;
  className?: string;
}

/**
 * Floating Action Bar
 *
 * A sticky bottom bar that appears when the header scrolls out of view.
 * Provides persistent access to:
 * - Customer name (context)
 * - Balance due (critical metric)
 * - Primary action
 * - Quick contact
 *
 * Design: Elevated card with blur backdrop, high contrast for visibility.
 * Uses IntersectionObserver for smooth appearance/disappearance.
 */
export function FloatingActionBar({
  customerName,
  balanceInfo,
  primaryAction,
  onCollectPayment,
  onContact,
  headerRef,
  className,
}: FloatingActionBarProps) {
  const [isVisible, setIsVisible] = useState(false);
  const balanceDue = parseFloat(balanceInfo?.balance || "0");

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) {
          // Show floating bar when header is NOT intersecting (scrolled out of view)
          setIsVisible(!entry.isIntersecting);
        }
      },
      {
        threshold: 0,
        rootMargin: "-100px 0px 0px 0px", // Trigger slightly before header is fully gone
      }
    );

    observer.observe(header);
    return () => observer.disconnect();
  }, [headerRef]);

  // Get primary action button style
  const getPrimaryActionStyle = (variant: PrimaryAction["variant"]) => {
    switch (variant) {
      case "confirm":
        return "bg-success hover:bg-success text-success-foreground";
      case "complete":
        return "bg-info hover:bg-info text-info-foreground";
      case "refund":
        return "bg-warning hover:bg-warning text-warning-foreground";
      default:
        return "bg-primary hover:bg-primary/90 text-primary-foreground";
    }
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 pointer-events-none",
        "transition-all duration-300 ease-out",
        isVisible
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0",
        className
      )}
    >
      {/* Safe area padding for mobile */}
      <div className="pb-safe">
        <div className="mx-auto max-w-4xl px-4 pb-4">
          <div
            className={cn(
              "pointer-events-auto",
              "flex items-center justify-between gap-3 sm:gap-4",
              "px-4 py-3 sm:px-5 sm:py-4",
              "bg-card/95 backdrop-blur-lg",
              "border border-border/50 rounded-2xl",
              "shadow-xl shadow-black/10 dark:shadow-black/30"
            )}
          >
            {/* Customer + Balance Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <p className="font-semibold text-foreground truncate">
                  {customerName}
                </p>
                <p className={cn(
                  "text-sm font-bold tabular-nums",
                  balanceDue > 0
                    ? "text-warning dark:text-warning"
                    : "text-success dark:text-success"
                )}>
                  ${balanceDue.toFixed(2)}
                  <span className="font-normal text-muted-foreground ml-1">
                    {balanceDue > 0 ? "due" : "paid"}
                  </span>
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Collect Payment - Only if balance due */}
              {balanceDue > 0 && onCollectPayment && (
                <Button
                  size="sm"
                  onClick={onCollectPayment}
                  className="gap-1.5 bg-warning hover:bg-warning text-warning-foreground"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Collect</span>
                </Button>
              )}

              {/* Primary Action */}
              {primaryAction && (
                <Button
                  size="sm"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.loading}
                  className={cn(
                    "gap-1.5 font-semibold",
                    getPrimaryActionStyle(primaryAction.variant)
                  )}
                >
                  {primaryAction.loading ? (
                    <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <primaryAction.icon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{primaryAction.label}</span>
                </Button>
              )}

              {/* Contact Button */}
              {onContact && (
                <Button
                  size="icon"
                  variant="outline"
                  onClick={onContact}
                  className="flex-shrink-0"
                >
                  <Phone className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
