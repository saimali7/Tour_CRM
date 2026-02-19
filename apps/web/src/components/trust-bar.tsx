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
    <div className="grid gap-3 rounded-2xl border border-border bg-card/90 p-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div className="flex items-center gap-2 text-amber-700">
        <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
        <span className="font-medium">{ratingText} average rating</span>
      </div>
      <div className="flex items-center gap-2 text-slate-700">
        <Users className="h-4 w-4 text-sky-700" />
        <span className="font-medium">{formatGuests(guestsDisplay)}</span>
      </div>
      <div className="flex items-center gap-2 text-slate-700">
        <CalendarClock className="h-4 w-4 text-emerald-700" />
        <span className="font-medium">{bookingsDisplay} bookings this week</span>
      </div>
      <div className="flex items-center gap-2 text-slate-700">
        <ShieldCheck className="h-4 w-4 text-emerald-700" />
        <span className="font-medium">{yearsDisplay}+ years operating</span>
      </div>
    </div>
  );
}
