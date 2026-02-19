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
  ctaHref = "#availability",
  ctaLabel = "Check Availability",
}: MobileBookingBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-[0_-6px_24px_rgba(0,0,0,0.16)] backdrop-blur sm:hidden">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div>
          <p className="text-base font-semibold leading-none">{priceLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helperLabel}</p>
        </div>
        <Button asChild className="min-h-11 bg-foreground px-4 text-background hover:bg-foreground/90">
          <a href={ctaHref}>{ctaLabel}</a>
        </Button>
      </div>
    </div>
  );
}
