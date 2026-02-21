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
    return `${(totalGuests / 1000).toFixed(1).replace(".0", "")}k+`;
  }
  return `${totalGuests}+`;
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

  const stats = [
    {
      icon: Star,
      iconClass: "fill-amber-400 text-amber-400",
      bgClass: "bg-amber-50",
      value: `${ratingText} / 5.0`,
      label: "Average Rating",
    },
    {
      icon: Users,
      iconClass: "text-sky-600",
      bgClass: "bg-sky-50",
      value: `${formatGuests(guestsDisplay)} guests`,
      label: "Happy Travelers",
    },
    {
      icon: CalendarClock,
      iconClass: "text-emerald-600",
      bgClass: "bg-emerald-50",
      value: `${bookingsDisplay}`,
      label: "Booked This Week",
    },
    {
      icon: ShieldCheck,
      iconClass: "text-primary",
      bgClass: "bg-primary/10",
      value: `${yearsDisplay}+ Years`,
      label: "Verified Operator",
    },
  ];

  return (
    <div className="relative z-20 -mt-10 sm:-mt-14 mx-auto px-[var(--page-gutter)]" style={{ maxWidth: "var(--page-max-width, 1400px)" }}>
      <div className="grid gap-4 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl p-6 sm:p-8 shadow-[var(--shadow-lg)] sm:grid-cols-2 lg:grid-cols-4">
        {stats.map(({ icon: Icon, iconClass, bgClass, value, label }) => (
          <div key={label} className="flex items-center justify-center sm:justify-start gap-3">
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${bgClass}`}>
              <Icon className={`h-5 w-5 ${iconClass}`} />
            </div>
            <div>
              <p className="font-bold text-foreground leading-none mb-1 tabular-nums">{value}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-[0.1em]">{label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
