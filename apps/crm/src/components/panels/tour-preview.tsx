"use client";

import Link from "next/link";
import type { Route } from "next";
import { useParams } from "next/navigation";
import {
  Clock,
  Users,
  DollarSign,
  MapPin,
  Car,
  Calendar,
  Tag,
  Image as ImageIcon,
  Eye,
  Edit,
  Plus,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Globe,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { TourStatusBadge } from "@/components/ui/status-badge";
import {
  ContextPanelSection,
  ContextPanelRow,
  ContextPanelSkeleton,
  ContextPanelEmpty,
} from "@/components/layout/context-panel";
import { cn } from "@/lib/utils";

interface TourPreviewProps {
  tourId: string;
}

export function TourPreview({ tourId }: TourPreviewProps) {
  const params = useParams();
  const slug = params.slug as string;

  const { data: tour, isLoading, error } = trpc.tour.getById.useQuery(
    { id: tourId },
    { enabled: !!tourId }
  );

  if (isLoading) {
    return <ContextPanelSkeleton />;
  }

  if (error || !tour) {
    return (
      <ContextPanelEmpty
        icon={<AlertCircle className="h-5 w-5 text-muted-foreground" />}
        title="Tour not found"
        description="This tour may have been deleted"
      />
    );
  }

  const basePrice = parseFloat(tour.basePrice || "0");
  const currency = tour.currency || "USD";
  const pickupModeLabel =
    tour.pickupMode === "hotel_pickup"
      ? "Hotel pickup"
      : tour.pickupMode === "hybrid"
        ? "Meeting point + pickup"
        : "Meeting point only";
  const pickupCities = Array.isArray(tour.pickupAllowedCities)
    ? tour.pickupAllowedCities.filter(Boolean)
    : [];
  const showPickupPolicy =
    tour.pickupMode !== "meeting_point" ||
    pickupCities.length > 0 ||
    Boolean(tour.pickupAirportAllowed) ||
    Boolean(tour.pickupPolicyNotes);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(price);
  };

  return (
    <>
      {/* Status & Visibility Section */}
      <ContextPanelSection>
        <div className="flex items-center gap-2 mb-3">
          <TourStatusBadge status={tour.status as "draft" | "active" | "archived"} />
          {tour.isPublic && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
              <Globe className="h-3 w-3" />
              Public
            </span>
          )}
        </div>
        <h3 className="text-base font-semibold text-foreground line-clamp-2">
          {tour.name}
        </h3>
        {tour.shortDescription && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {tour.shortDescription}
          </p>
        )}
      </ContextPanelSection>

      {/* Key Stats Grid */}
      <ContextPanelSection title="Quick Stats">
        <div className="grid grid-cols-2 gap-3">
          {/* Duration */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              Duration
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {tour.durationMinutes ? `${tour.durationMinutes}m` : "-"}
            </p>
          </div>

          {/* Base Price */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              Base Price
            </div>
            <p className={cn(
              "text-lg font-semibold tabular-nums",
              basePrice > 0 ? "text-success dark:text-success" : "text-foreground"
            )}>
              {formatPrice(basePrice)}
            </p>
          </div>

          {/* Capacity */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              Max Capacity
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {tour.maxParticipants || "-"}
            </p>
          </div>

          {/* Min Participants */}
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              Min Required
            </div>
            <p className="text-lg font-semibold tabular-nums text-foreground">
              {tour.minParticipants || 1}
            </p>
          </div>
        </div>
      </ContextPanelSection>

      {/* Note: Pricing tiers are managed via tourPricingTiers relation */}

      {/* Meeting Point */}
      {tour.meetingPoint && (
        <ContextPanelSection title="Meeting Point">
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm text-foreground">
                {tour.meetingPoint}
              </p>
              {tour.meetingPointDetails && (
                <p className="text-xs text-muted-foreground mt-1">
                  {tour.meetingPointDetails}
                </p>
              )}
            </div>
          </div>
        </ContextPanelSection>
      )}

      {/* Pickup Policy */}
      {showPickupPolicy && (
        <ContextPanelSection title="Pickup Policy">
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2">
              <Car className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-foreground">{pickupModeLabel}</p>
                {pickupCities.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Cities: {pickupCities.join(", ")}
                  </p>
                )}
                {tour.pickupAirportAllowed && (
                  <p className="text-xs text-muted-foreground mt-1">Airport pickup allowed</p>
                )}
                {tour.pickupPolicyNotes && (
                  <p className="text-xs text-muted-foreground mt-1">{tour.pickupPolicyNotes}</p>
                )}
              </div>
            </div>
          </div>
        </ContextPanelSection>
      )}

      {/* Category & Tags */}
      {(tour.category || (tour.tags && tour.tags.length > 0)) && (
        <ContextPanelSection title="Category & Tags">
          <div className="flex flex-wrap gap-1.5">
            {tour.category && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                <Tag className="h-3 w-3" />
                {tour.category}
              </span>
            )}
            {tour.tags?.map((tag, index) => (
              <span
                key={`${tag}-${index}`}
                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </ContextPanelSection>
      )}

      {/* What's Included */}
      {tour.includes && tour.includes.length > 0 && (
        <ContextPanelSection title="Included">
          <ul className="space-y-1.5">
            {tour.includes.slice(0, 5).map((item, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <CheckCircle className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
            {tour.includes.length > 5 && (
              <li className="text-xs text-muted-foreground pl-5">
                +{tour.includes.length - 5} more items
              </li>
            )}
          </ul>
        </ContextPanelSection>
      )}

      {/* Description Preview */}
      {tour.description && (
        <ContextPanelSection title="Description">
          <p className="text-sm text-muted-foreground line-clamp-4">
            {tour.description}
          </p>
          {tour.description.length > 200 && (
            <Link
              href={`/org/${slug}/tours/${tour.id}` as Route}
              className="text-xs text-primary hover:underline flex items-center gap-1 mt-2"
            >
              Read full description
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </ContextPanelSection>
      )}

      {/* Media Count */}
      {tour.images && tour.images.length > 0 && (
        <ContextPanelSection>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="h-4 w-4" />
            <span>{tour.images.length} image{tour.images.length !== 1 ? "s" : ""}</span>
          </div>
        </ContextPanelSection>
      )}
    </>
  );
}

// Footer actions for the tour preview
export function TourPreviewActions({ tourId }: { tourId: string }) {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <div className="flex gap-2">
      <Link href={`/org/${slug}/tours/${tourId}` as Route} className="flex-1">
        <Button variant="outline" size="sm" className="w-full">
          <Eye className="h-4 w-4 mr-1.5" />
          View
        </Button>
      </Link>
      <Link href={`/org/${slug}/tours/${tourId}/edit` as Route} className="flex-1">
        <Button variant="default" size="sm" className="w-full">
          <Edit className="h-4 w-4 mr-1.5" />
          Edit
        </Button>
      </Link>
    </div>
  );
}
