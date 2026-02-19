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
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  return `${hours}h ${remainingMinutes}m`;
}

function formatPrice(price: string | number, currency: string): string {
  const numericPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
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
        className="group block overflow-hidden rounded-2xl border border-border bg-card transition-all duration-200 hover:border-primary/35 hover:shadow-lg"
      >
        <div className="flex flex-col md:flex-row">
          <div className="relative h-56 overflow-hidden bg-muted md:h-auto md:w-[38%] xl:w-[34%]">
            {tour.coverImageUrl ? (
              <Image
                src={tour.coverImageUrl}
                alt={tour.name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="(max-width: 768px) 100vw, (max-width: 1400px) 40vw, 28vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50">
                <Compass className="h-12 w-12 text-stone-300" />
              </div>
            )}

            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />

            <div className="absolute left-3 top-3 flex flex-wrap gap-2">
              {tour.category ? (
                <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium backdrop-blur-sm">
                  {tour.category}
                </span>
              ) : null}
              {availabilityLabel ? (
                <span className="rounded-full bg-emerald-50/95 px-2.5 py-1 text-xs font-medium text-emerald-700 backdrop-blur-sm">
                  {availabilityLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-5 md:p-6">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {socialProofLabel ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2.5 py-1 text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  {socialProofLabel}
                </span>
              ) : null}
              {hasCancellation ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {cancellationHours ? `Free cancel up to ${cancellationHours}h` : "Flexible cancellation"}
                </span>
              ) : null}
            </div>

            <div>
              <h3 className="line-clamp-2 text-xl font-semibold leading-tight transition-colors group-hover:text-primary">
                {tour.name}
              </h3>
              {tour.shortDescription ? (
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{tour.shortDescription}</p>
              ) : null}
            </div>

            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              <div className="inline-flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {formatDuration(tour.durationMinutes)}
              </div>
              <div className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" />
                Up to {tour.maxParticipants} guests
              </div>
              {tour.meetingPoint ? (
                <div className="inline-flex items-center gap-2 sm:col-span-2">
                  <MapPin className="h-4 w-4" />
                  <span className="line-clamp-1">{tour.meetingPoint}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-auto flex items-end justify-between border-t border-border pt-4">
              <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                View details
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>

              <div className="text-right">
                <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">From</p>
                <p className="text-xl font-bold">{formatPrice(tour.basePrice, currency)}</p>
                <p className="text-xs text-muted-foreground">per person</p>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group block overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {tour.coverImageUrl ? (
          <Image
            src={tour.coverImageUrl}
            alt={tour.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-stone-200 via-stone-100 to-amber-50">
            <Compass className="h-10 w-10 text-stone-300" />
          </div>
        )}

        {/* Category Badge */}
        {tour.category && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 text-xs font-medium bg-background/90 backdrop-blur-sm rounded-full">
              {tour.category}
            </span>
          </div>
        )}

        {/* Price Badge */}
        <div className="absolute bottom-3 right-3">
          <span className="rounded-full bg-foreground px-3 py-1.5 text-sm font-semibold text-background">
            From {formatPrice(tour.basePrice, currency)}
          </span>
        </div>

        {availabilityLabel && (
          <div className="absolute bottom-3 left-3">
            <span className="rounded-full bg-emerald-500/90 backdrop-blur-md px-2.5 py-1 text-xs font-semibold text-white shadow-sm ring-1 ring-white/20">
              {availabilityLabel}
            </span>
          </div>
        )}

        {/* Rating overlay */}
        <div className="absolute top-3 right-3 opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0">
          <span className="flex items-center gap-1 rounded-full bg-background/95 backdrop-blur-sm px-2 py-1 text-xs font-semibold shadow-md">
            <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
            4.9
          </span>
        </div>

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/95 px-4 py-1.5 text-xs font-semibold text-foreground shadow-lg opacity-0 translate-y-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 text-center whitespace-nowrap">
          Check Availability
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {socialProofLabel && (
          <p className="mb-2 inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3 text-amber-600" />
            {socialProofLabel}
          </p>
        )}
        <h3 className="font-semibold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
          {tour.name}
        </h3>

        {tour.shortDescription && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {tour.shortDescription}
          </p>
        )}

        {/* Meta Info */}
        <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            <span>{formatDuration(tour.durationMinutes)}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>Up to {tour.maxParticipants}</span>
          </div>
        </div>

        {/* Meeting Point & Price Footer */}
        <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
          {tour.meetingPoint ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground max-w-[50%]">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{tour.meetingPoint}</span>
            </div>
          ) : <div />}

          <div className="text-right">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground block leading-none mb-1">From</span>
            <span className="text-lg font-bold leading-none text-foreground">{formatPrice(tour.basePrice, currency)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
