import Link from "next/link";
import Image from "next/image";
import { Clock, Users, MapPin } from "lucide-react";
import type { Tour } from "@tour/database";

interface TourCardProps {
  tour: Tour;
  currency: string;
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

export function TourCard({ tour, currency }: TourCardProps) {
  return (
    <Link
      href={`/tours/${tour.slug}`}
      className="group block bg-card rounded-lg border overflow-hidden hover:shadow-lg transition-all duration-200"
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
          <div className="absolute inset-0 flex items-center justify-center text-4xl">
            🗺️
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
          <span className="px-3 py-1.5 text-sm font-semibold bg-primary text-primary-foreground rounded-full">
            From {formatPrice(tour.basePrice, currency)}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
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

        {/* Meeting Point */}
        {tour.meetingPoint && (
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{tour.meetingPoint}</span>
          </div>
        )}
      </div>
    </Link>
  );
}
