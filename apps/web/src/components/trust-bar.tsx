"use client";

import { useEffect, useMemo, useState } from "react";
import { Star, Users, ShieldCheck, CalendarClock } from "lucide-react";

interface TrustBarProps {
  averageRating: number;
  totalGuests: number;
  yearsOperating: number;
  bookingsThisWeek: number;
}

function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      setValue(Math.round(target * progress));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [target, durationMs]);

  return value;
}

function formatGuests(totalGuests: number): string {
  if (totalGuests >= 1000) {
    return `${(totalGuests / 1000).toFixed(1).replace(".0", "")}k+ guests`;
  }
  return `${totalGuests}+ guests`;
}

export function TrustBar({
  averageRating,
  totalGuests,
  yearsOperating,
  bookingsThisWeek,
}: TrustBarProps) {
  const guestsDisplay = useCountUp(Math.max(totalGuests, 0));
  const bookingsDisplay = useCountUp(Math.max(bookingsThisWeek, 0));
  const yearsDisplay = useCountUp(Math.max(yearsOperating, 0));
  const ratingText = useMemo(() => averageRating.toFixed(1), [averageRating]);

  return (
    <div className="mx-auto max-w-[1560px] px-4 sm:px-6 lg:px-8 relative z-20 -mt-8 sm:-mt-12">
      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-5 sm:p-6 shadow-lg sm:grid-cols-2 lg:grid-cols-4 transition-all hover:shadow-xl">
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100/50">
            <Star className="h-5 w-5 fill-amber-500 text-amber-500" />
          </div>
          <div>
            <p className="font-semibold text-foreground leading-none mb-1">{ratingText} / 5.0</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Average Rating</p>
          </div>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100/50">
            <Users className="h-5 w-5 text-sky-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground leading-none mb-1">{formatGuests(guestsDisplay)}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Happy Travelers</p>
          </div>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100/50">
            <CalendarClock className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground leading-none mb-1">{bookingsDisplay}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Booked This Week</p>
          </div>
        </div>
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100/50">
            <ShieldCheck className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <p className="font-semibold text-foreground leading-none mb-1">{yearsDisplay}+ Years</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Verified Operator</p>
          </div>
        </div>
      </div>
    </div>
  );
}
