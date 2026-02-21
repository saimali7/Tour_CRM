import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Clock, Compass, MapPin, ShieldCheck, Sparkles, Users, Star } from "lucide-react";
import type { Tour } from "@tour/database";

interface TourCardProps {
  tour: Tour;
  currency: string;
  availabilityLabel?: string | null;
  socialProofLabel?: string | null;
  variant?: "grid" | "expanded";
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}

function formatPrice(price: string | number, currency: string): string {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numericPrice);
}

export function TourCard({
  tour,
  currency,
  availabilityLabel,
  socialProofLabel,
  variant = "grid",
}: TourCardProps) {
  const cancellationHours = (tour as { cancellationHours?: number | null }).cancellationHours;
  const cancellationPolicy = (tour as { cancellationPolicy?: string | null }).cancellationPolicy;
  const hasCancellation = Boolean(cancellationHours || cancellationPolicy);

  if (variant === "expanded") {
    return (
      <Link
        href={`/tours/${tour.slug}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:border-primary/30 hover:shadow-[var(--shadow-lg)]"
      >
        <div className="flex flex-col md:flex-row">
          {/* Image */}
          <div className="relative h-56 overflow-hidden bg-stone-100 md:h-auto md:w-[40%]">
            {tour.coverImageUrl ? (
              <Image
                src={tour.coverImageUrl}
                alt={tour.name}
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, 40vw"
                style={{ viewTransitionName: `tour-image-${tour.id}` } as React.CSSProperties}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-200 to-stone-100">
                <Compass className="h-12 w-12 text-stone-300" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {tour.category && (
                <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                  {tour.category}
                </span>
              )}
              {availabilityLabel && (
                <span className="rounded-full bg-emerald-500 px-2.5 py-1 text-xs font-semibold text-white">
                  {availabilityLabel}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
            {/* Highlight badges */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {socialProofLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 ring-1 ring-amber-200/50">
                  <Sparkles className="h-3.5 w-3.5" />
                  {socialProofLabel}
                </span>
              )}
              {hasCancellation && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 ring-1 ring-emerald-200/50">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {cancellationHours ? `Free cancel ${cancellationHours}h before` : "Flexible cancellation"}
                </span>
              )}
            </div>

            <div>
              <h3 className="line-clamp-2 text-xl font-bold leading-tight transition-colors group-hover:text-primary">
                {tour.name}
              </h3>
              {tour.shortDescription && (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{tour.shortDescription}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(tour.durationMinutes)}
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Up to {tour.maxParticipants} guests
              </div>
              {tour.meetingPoint && (
                <div className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{tour.meetingPoint}</span>
                </div>
              )}
            </div>

            <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
              <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
                View details
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.1em] text-muted-foreground">From</p>
                <p className="text-2xl font-bold tracking-tight">{formatPrice(tour.basePrice, currency)}</p>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  /* ========== GRID CARD — Portrait, immersive ========== */
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
    >
      {/* Image — 3:4 portrait ratio for immersive feel */}
      <div className="relative aspect-[3/4] overflow-hidden bg-stone-100">
        {tour.coverImageUrl ? (
          <Image
            src={tour.coverImageUrl}
            alt={tour.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            style={{ viewTransitionName: `tour-image-${tour.id}` } as React.CSSProperties}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-200 to-stone-100">
            <Compass className="h-10 w-10 text-stone-300" />
          </div>
        )}

        {/* Duration badge top-left */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            <Clock className="h-3 w-3" />
            {formatDuration(tour.durationMinutes)}
          </span>
        </div>

        {/* Price badge top-right */}
        <div className="absolute top-3 right-3">
          <span className="rounded-full bg-white/95 px-3 py-1.5 text-sm font-bold text-stone-900 shadow-sm backdrop-blur-sm">
            {formatPrice(tour.basePrice, currency)}
          </span>
        </div>

        {/* Rating — appears on hover */}
        <div className="absolute bottom-3 left-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <span className="flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            4.9
          </span>
        </div>

        {/* Bottom gradient for text overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

        {/* Title overlaid at bottom */}
        <div className="absolute inset-x-0 bottom-0 p-4">
          {tour.category && (
            <span className="mb-2 inline-block rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
              {tour.category}
            </span>
          )}
          <h3 className="line-clamp-2 text-lg font-bold text-white leading-snug drop-shadow-md">
            {tour.name}
          </h3>
        </div>
      </div>

      {/* Minimal bottom section */}
      <div className="px-4 py-3">
        {socialProofLabel && (
          <p className="mb-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
            <Sparkles className="h-3 w-3" />
            {socialProofLabel}
          </p>
        )}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Up to {tour.maxParticipants}
            </span>
            {hasCancellation && (
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                Free cancel
              </span>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-primary opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
        </div>
      </div>
    </Link>
  );
}
