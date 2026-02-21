"use client";

import { Button } from "@tour/ui";

interface MobileBookingBarProps {
  priceLabel: string;
  helperLabel?: string;
  ctaHref?: string;
  ctaLabel?: string;
}

export function MobileBookingBar({
  priceLabel,
  helperLabel = "per person",
  ctaHref = "#availability-mobile",
  ctaLabel = "Check Availability",
}: MobileBookingBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-8px_32px_rgba(0,0,0,0.12)] backdrop-blur-xl sm:hidden safe-area-pb">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">From</p>
          <p className="text-xl font-bold leading-none tracking-tight">{priceLabel}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{helperLabel}</p>
        </div>
        <Button
          asChild
          className="h-11 rounded-xl bg-primary px-6 text-sm font-semibold text-white shadow-[var(--shadow-glow)] transition-all hover:bg-primary/90 active:scale-95"
        >
          <a href={ctaHref}>{ctaLabel}</a>
        </Button>
      </div>
    </div>
  );
}
