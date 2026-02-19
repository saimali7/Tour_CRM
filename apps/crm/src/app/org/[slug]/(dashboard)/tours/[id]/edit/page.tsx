"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { TourCreator, type TourFormState } from "@/components/tours/tour-creator";
import {
  createDefaultPricingFormState,
  type PricingFormState,
  type PricingPackageDraft,
} from "@/components/tours/tour-creator/pricing-tab";

interface PricingTier {
  name?: string;
  price?: { amount?: number };
  ageMin?: number;
  ageMax?: number;
}

interface PricingModelLike {
  type?: string;
  tiers?: PricingTier[];
  pricePerUnit?: { amount?: number };
  maxOccupancy?: number;
  minOccupancy?: number;
  price?: { amount?: number };
  maxParticipants?: number;
  basePrice?: { amount?: number };
  perPersonPrice?: { amount?: number };
  includedParticipants?: number;
}

interface TierRangeLike {
  minSize?: number;
  maxSize?: number;
  price?: { amount?: number };
}

interface TieredPricingModelLike extends PricingModelLike {
  tiers?: TierRangeLike[];
}

interface CapacityModelLike {
  type?: string;
  totalSeats?: number;
  totalUnits?: number;
  occupancyPerUnit?: number;
}

interface BookingOptionLike {
  id: string;
  name: string;
  shortDescription?: string | null;
  isDefault?: boolean | null;
  sortOrder?: number | null;
  pricingModel?: unknown;
  capacityModel?: unknown;
}

function toMoneyString(amountInCents?: number): string {
  if (typeof amountInCents !== "number" || Number.isNaN(amountInCents)) return "";
  return (amountInCents / 100).toFixed(2);
}

function mapBookingOptionToPricingConfig(
  option: BookingOptionLike,
  basePrice: string,
  maxParticipants: number
): PricingFormState {
  const config = createDefaultPricingFormState(basePrice, maxParticipants);
  const pricingModel = (option.pricingModel ?? {}) as PricingModelLike;
  const capacityModel = (option.capacityModel ?? {}) as CapacityModelLike;

  if (capacityModel.type === "unit") {
    config.tourType = "private";
    config.capacityType = "unit";
    config.totalUnits = String(capacityModel.totalUnits ?? 3);
    config.occupancyPerUnit = String(capacityModel.occupancyPerUnit ?? 6);
  } else {
    config.tourType = "shared";
    config.capacityType = "shared";
    config.totalSeats = String(capacityModel.totalSeats ?? (maxParticipants || 20));
  }

  switch (pricingModel.type) {
    case "per_person": {
      const tiers = pricingModel.tiers ?? [];
      const adultTier = tiers.find((tier) => tier.name === "adult");
      const childTier = tiers.find((tier) => tier.name === "child");
      const infantTier = tiers.find((tier) => tier.name === "infant");

      config.pricingType = "per_person";
      config.adultPrice = toMoneyString(adultTier?.price?.amount) || config.adultPrice;
      config.hasChildPrice = !!childTier;
      config.childPrice = childTier ? toMoneyString(childTier.price?.amount) : "";
      config.hasInfantPrice = !!infantTier;
      config.infantPrice = infantTier ? toMoneyString(infantTier.price?.amount) : "0";
      break;
    }
    case "per_unit":
      config.pricingType = "per_unit";
      config.pricePerUnit = toMoneyString(pricingModel.pricePerUnit?.amount);
      config.maxOccupancy = String(pricingModel.maxOccupancy ?? 6);
      break;
    case "flat_rate":
      config.pricingType = "flat_rate";
      config.flatPrice = toMoneyString(pricingModel.price?.amount);
      config.flatMaxParticipants = String(pricingModel.maxParticipants ?? (maxParticipants || 10));
      break;
    case "base_plus_person":
      config.pricingType = "base_plus_person";
      config.basePricePricing = toMoneyString(pricingModel.basePrice?.amount);
      config.pricePerAdditional = toMoneyString(pricingModel.perPersonPrice?.amount);
      config.includedParticipants = String(pricingModel.includedParticipants ?? 2);
      config.baseMaxParticipants = String(pricingModel.maxParticipants ?? (maxParticipants || 10));
      break;
    case "tiered_group": {
      const model = pricingModel as TieredPricingModelLike;
      config.pricingType = "tiered_group";
      config.tierRanges =
        model.tiers?.length
          ? model.tiers.map((tier) => ({
              min: String(tier.minSize ?? 1),
              max: String(tier.maxSize ?? 10),
              price: toMoneyString(tier.price?.amount),
            }))
          : config.tierRanges;
      break;
    }
    default:
      break;
  }

  return config;
}

export default function EditTourPage() {
  const params = useParams();
  const tourId = params.id as string;

  const {
    data: tour,
    isLoading: isTourLoading,
    error: tourError,
  } = trpc.tour.getById.useQuery(
    { id: tourId },
    { enabled: Boolean(tourId) }
  );

  const {
    data: bookingOptions,
    isLoading: isOptionsLoading,
  } = trpc.bookingOptions.listByTour.useQuery(
    { tourId },
    { enabled: Boolean(tourId) }
  );

  const initialData = useMemo<Partial<TourFormState> | undefined>(() => {
    if (!tour) return undefined;

    const mappedPackages: PricingPackageDraft[] =
      (bookingOptions ?? [])
        .map((option) => ({
          id: option.id,
          optionId: option.id,
          name: option.name,
          shortDescription: option.shortDescription ?? "",
          isDefault: Boolean(option.isDefault),
          config: mapBookingOptionToPricingConfig(
            option as BookingOptionLike,
            tour.basePrice ?? "0",
            tour.maxParticipants ?? 15
          ),
        }))
        .sort((a, b) => {
          if (a.isDefault && !b.isDefault) return -1;
          if (!a.isDefault && b.isDefault) return 1;
          const aOption = bookingOptions?.find((option) => option.id === a.optionId);
          const bOption = bookingOptions?.find((option) => option.id === b.optionId);
          return (aOption?.sortOrder ?? 0) - (bOption?.sortOrder ?? 0);
        });

    return {
      name: tour.name ?? "",
      category: tour.category ?? "",
      basePrice: tour.basePrice ?? "",
      durationMinutes: tour.durationMinutes ?? 360,
      maxParticipants: tour.maxParticipants ?? 15,
      minParticipants: tour.minParticipants ?? 1,
      shortDescription: tour.shortDescription ?? "",
      description: tour.description ?? "",
      includes: tour.includes ?? [],
      excludes: tour.excludes ?? [],
      requirements: tour.requirements ?? [],
      coverImageUrl: tour.coverImageUrl ?? null,
      images: tour.images ?? [],
      tags: tour.tags ?? [],
      slug: tour.slug ?? "",
      isPublic: tour.isPublic ?? false,
      meetingPoint: tour.meetingPoint ?? "",
      meetingPointDetails: tour.meetingPointDetails ?? "",
      pickupMode: tour.pickupMode ?? "meeting_point",
      pickupAllowedCities: (tour.pickupAllowedCities as string[] | null | undefined) ?? [],
      pickupAirportAllowed: tour.pickupAirportAllowed ?? false,
      pickupPolicyNotes: tour.pickupPolicyNotes ?? "",
      cancellationHours: tour.cancellationHours ?? 24,
      cancellationPolicy: tour.cancellationPolicy ?? "",
      metaTitle: tour.metaTitle ?? "",
      metaDescription: tour.metaDescription ?? "",
      minimumNoticeHours: tour.minimumNoticeHours ?? 2,
      maximumAdvanceDays: tour.maximumAdvanceDays ?? 90,
      allowSameDayBooking: tour.allowSameDayBooking ?? true,
      sameDayCutoffTime: tour.sameDayCutoffTime ?? "12:00",
      pricingPackages: mappedPackages,
      pricingConfig: mappedPackages[0]?.config,
    };
  }, [bookingOptions, tour]);

  if (tourError) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">Failed to load tour</p>
            <p className="text-xs text-destructive/80">{tourError.message}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isTourLoading || isOptionsLoading || !initialData) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <TourCreator mode="edit" tourId={tourId} initialData={initialData} />
  );
}
